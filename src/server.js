// Load environment variables FIRST - before any other imports
require('dotenv').config();

const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');
const app = require('./app');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initializeOllamaService } = require('./services/ollamaService');
const prisma = require('./models/prisma');
const logger = require('./services/loggerService');
const http = require('http');
const SignalingServer = require('./services/signalingServer');

// Initialize Sentry before any other middleware or routes
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
      nodeProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,
    environment: process.env.NODE_ENV || 'development',
  });
  logger.info('🚀 Sentry initialized');
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss:", "ws:", "https://api.resend.com", "https://generativelanguage.googleapis.com"],
      mediaSrc: ["'self'", "blob:", "https:"],
      frameSrc: ["'self'", "https://zoom.us", "https://*.zoom.us"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
});

// Stricter rate limiter for sensitive authentication endpoints (login, signup, reset-password)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login/signup requests per 15 minutes
  message: { error: 'Too many login or registration attempts. Please try again after 15 minutes.' },
});

// Stricter rate limiter for AI operations (expensive Gemini/Groq calls)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 AI requests per minute
  message: { error: 'Too many AI requests. Please wait a minute and try again.' },
});

// Apply strict rate limiting to auth submission routes (login, register/signup, password reset)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/admin/login', authLimiter);
app.use('/api/auth/education/login', authLimiter);
app.use('/api/auth/teacher/login', authLimiter);
app.use('/api/auth/student/login', authLimiter);

// Apply normal rate limiter to general auth routes (verify, check sessions, etc.)
app.use('/api/auth', limiter);

// Apply AI rate limiter to all AI endpoints
app.use('/api/ai', aiLimiter);

const PORT = process.env.PORT || 4000;

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'NODE_ENV'
];

const OPTIONAL_ENV_VARS = [
  'GEMINI_API_KEY',
  'RESEND_API_KEY',
  'FRONTEND_URL'
];

/**
 * Validates that all required environment variables are present
 * and warns about missing optional ones.
 */
function validateEnvironment() {
  logger.info('🔍 Validating environment variables...');
  const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
  const warnings = [];

  if (missing.length) {
    logger.error('❌ Environment validation failed');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  OPTIONAL_ENV_VARS.forEach(v => {
    if (!process.env[v]) {
      warnings.push(`⚠️  ${v} not set - feature disabled`);
    }
  });

  if (warnings.length) {
    warnings.forEach(w => logger.warn(w));
  }
  logger.info('✅ Environment validation passed');
}

// ─── VALIDATE FRONTEND_URL FOR PRODUCTION ─────────────────
function validateProductionConfig() {
  if (process.env.NODE_ENV === 'production') {
    const frontendUrl = process.env.FRONTEND_URL || '';
    
    if (!frontendUrl) {
      throw new Error(
        '❌ PRODUCTION ERROR: FRONTEND_URL environment variable is required in production\n' +
        '   This URL is used in password reset links, email templates, and callbacks.\n' +
        '   Set FRONTEND_URL to your production domain (e.g., https://ieltspractice.com)'
      );
    }
    
    if (frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1') || frontendUrl.includes('0.0.0.0')) {
      logger.warn(
        '⚠️  WARNING: FRONTEND_URL is set to localhost in production\n' +
        `   Current value: ${frontendUrl}\n` +
        '   Update FRONTEND_URL to your production Vercel domain before going live'
      );
    }
    
    // Validate HTTPS for production
    if (!frontendUrl.startsWith('https://')) {
      logger.warn(
        '⚠️  WARNING: FRONTEND_URL is not using HTTPS in production\n' +
        `   Current: ${frontendUrl}\n` +
        '   Consider changing to HTTPS for security'
      );
    }
  }
}

/**
 * Redacts password from DATABASE_URL for safe logging
 */
function getRedactedDbUrl() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl) return 'NOT SET';
  try {
    const url = new URL(dbUrl);
    if (url.password) url.password = '********';
    return url.toString();
  } catch (e) {
    // If not a valid URL (e.g. file path for SQLite), just return as is or obscured
    return dbUrl.replace(/:([^:@/]+)@/, ':********@');
  }
}

/**
 * Verifies database connection and basic health on startup
 */
async function verifyDatabase() {
  logger.info('📡 Verifying database connection...');
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    logger.error('❌ DATABASE_URL is not set in environment variables');
    process.exit(1);
  }

  logger.info(`🔗 Database URL: ${getRedactedDbUrl()}`);

  try {
    // 1. Simple connectivity check
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database connection verified');

    // 2. Check if migrations have likely run by checking for a core table
    // We'll check for 'User' table which should exist in any valid migration state
    try {
      await prisma.user.findFirst({ take: 1 });
      logger.info('✅ Database schema verified (User table found)');
    } catch (schemaError) {
      logger.warn('⚠️  WARNING: Could not query User table. Migrations might not have run.');
      logger.error('❌ Schema error details:', schemaError.message);
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(schemaError);
      }
      // We don't exit here as it might be a fresh DB, but we log it clearly
    }

  } catch (error) {
    logger.error('❌ Database connection failed:', error.message);
    logger.error('   Please check if your database is running and DATABASE_URL is correct.');
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
    process.exit(1);
  }
}

(async () => {
  try {
    // Validate environment variables first
    validateEnvironment();

    // Validate production configuration
    validateProductionConfig();

    // Verify database connection before starting
    await verifyDatabase();
    
    // Initialize Ollama service
    await initializeOllamaService();

    // Create HTTP server for Express and Socket.io
    const server = http.createServer(app);
    
    // Initialize WebRTC Signaling Server
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4000';
    const signalingServer = new SignalingServer(server, {
      origin: frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true
    });

    // Expose signalingServer instance to Express routes via app.locals
    app.locals.signalingServer = signalingServer;
    
    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`IELTSPRACTICE API listening on http://localhost:${PORT}`);
      logger.info(`Access from this machine or others on: http://0.0.0.0:${PORT}`);
      logger.info(`🔌 WebRTC Signaling Server ready for Live Hub voice/video`);
      
      // Log current FRONTEND_URL being used
      logger.info(`📧 Email links will use: ${frontendUrl}`);
    });

    // Graceful Shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} signal received: closing HTTP server...`);
      server.close(async () => {
        logger.info('HTTP server closed');
        try {
          await prisma.$disconnect();
          logger.info('✅ Prisma database disconnected');
          process.exit(0);
        } catch (err) {
          logger.error('❌ Error during database disconnection:', err);
          process.exit(1);
        }
      });

      // Force close if it takes too long (e.g., 10 seconds)
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(reason);
      }
      // In production, you might want to gracefully shutdown
      // gracefulShutdown('unhandledRejection');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(error);
      }
      gracefulShutdown('uncaughtException');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
})();
