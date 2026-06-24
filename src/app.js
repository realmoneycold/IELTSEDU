const Sentry = require("@sentry/node");
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const morgan = require('morgan');
const xss = require('xss-clean');
const session = require('express-session');
const passport = require('passport');
const logger = require('./services/loggerService');
const apiRoutes = require('./routes');
const prisma = require('./models/prisma');
const { swaggerUi, specs } = require('./services/swaggerService');

dotenv.config();

const app = express();

// Trust Nginx reverse proxy — required for correct IP detection, rate limiting, and HTTPS redirect
app.set('trust proxy', 1);

// The Sentry request handler must be the first middleware on the app
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Use morgan for HTTP request logging with Winston
// Using 'dev' format for concise output, or 'combined' for standard production logs
app.use(morgan(':method :url :status :response-time ms - :res[content-length]', { 
  stream: { write: (message) => logger.info(message.trim()) } 
}));

// Configure multer for file uploads
app.use('/uploads', express.static('uploads'));

// Support multiple allowed origins: local dev + any space/comma-separated FRONTEND_URL values
const _extraOrigins = (process.env.FRONTEND_URL || '')
  .split(/[\s,]+/)
  .map(u => u.trim())
  .filter(Boolean);

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:4000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4000',
    ..._extraOrigins,
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Force HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

// Clean URLs: Redirect .html requests to extensionless routes (e.g. /dashboard.html -> /dashboard)
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.endsWith('.html')) {
    const parts = req.path.split('/');
    // Only redirect top-level HTML requests, avoiding subdirectories or templates if needed
    if (parts.length === 2) {
      let cleanPath = req.path.slice(0, -5);
      if (cleanPath === '/index') {
        cleanPath = '/';
      }
      const query = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
      return res.redirect(301, cleanPath + query);
    }
  }
  next();
});

// Add security headers
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// SECURITY: Block .env, .git, and other sensitive file probing
app.use((req, res, next) => {
  if (/\/\.(env|git|ssh|htaccess|htpasswd|DS_Store)/i.test(req.path)) {
    return res.status(404).end();
  }
  next();
});

// Cache static assets (CSS, JS, images, fonts) for 30 days
app.use((req, res, next) => {
  if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp)$/i.test(req.path)) {
    res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
  }
  next();
});

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(xss());
app.use(cookieParser());

// Session configuration for OAuth
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Load OAuth strategies
require('./controllers/oauthController');

// CSRF Protection
// Note: This middleware will expect a CSRF token in POST requests.
// Since the frontend is static HTML, we might need a way to provide the token.
// For now, disabling for API routes to fix signup issues.
const csrfProtection = csrf({ cookie: true });

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  return csrfProtection(req, res, next);
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  const token = req.csrfToken();
  res.cookie('XSRF-TOKEN', token);
  res.locals.csrfToken = token;
  next();
});

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok', 
      database: 'connected',
      version: 'v1', 
      time: new Date().toISOString() 
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error.message,
      time: new Date().toISOString() 
    });
  }
});

app.get('/api/v1/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok', 
      database: 'connected',
      version: 'v1', 
      time: new Date().toISOString() 
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error.message,
      time: new Date().toISOString() 
    });
  }
});

app.use('/api', apiRoutes);

// Test Sentry Error
app.get('/api/debug-sentry', (req, res) => {
  throw new Error('Sentry Test Error from IELTSPRACTICE Backend!');
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "IELTSPRACTICE API Docs"
}));

// ─── Explicit HTML Page Routes (BEFORE static, to prevent static from taking over) ───
// Add specific route for teacher dashboard
app.use('/teacher-dashboard', express.static(path.join(__dirname, '..', 'teacher-dashboard')));

// Add specific route for student dashboard
const fs = require('fs');
app.get('/dashboard', (req, res) => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'dashboard.html'), 'utf8');
  res.set('Cache-Control', 'no-cache');
  res.send(html);
});

// Primary login page — serve ROOT login.html (login/login.html is deprecated)
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'login.html'));
});
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '..', 'login.html')));
app.get('/login/', (req, res) => res.redirect('/login'));


// Add specific route for signup page
app.get('/signup.html', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, '..', 'signup.html'));
});
app.get('/signup', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, '..', 'signup.html'));
});
app.get('/signup/', (req, res) => res.redirect('/signup'));

// Add specific route for verify-email page
app.get('/verify-email.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'verify-email.html'));
});
app.get('/verify-email', (req, res) => res.sendFile(path.join(__dirname, '..', 'verify-email.html')));
app.get('/verify-email/', (req, res) => res.redirect('/verify-email'));

// Education centres page
app.get('/education-centres', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'education-centres.html')));
app.get('/education-centres/', (req, res) => res.redirect('/education-centres'));
app.get('/pages/education-centres.html', (req, res) => res.redirect(301, '/education-centres'));

// Exam dates page
app.get('/exam-dates', (req, res) => res.sendFile(path.join(__dirname, '..', 'pages', 'exam-dates.html')));
app.get('/exam-dates/', (req, res) => res.redirect('/exam-dates'));
app.get('/pages/exam-dates.html', (req, res) => res.redirect(301, '/exam-dates'));

// Add specific route for forgot-password page
app.get('/forgot-password.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'forgot-password.html'));
});
app.get('/forgot-password', (req, res) => res.sendFile(path.join(__dirname, '..', 'forgot-password.html')));
app.get('/forgot-password/', (req, res) => res.redirect('/forgot-password'));

// OAuth callback bridge page (works with or without .html)
app.get('/oauth-callback', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'oauth-callback.html'));
});
app.get('/oauth-callback.html', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'oauth-callback.html'));
});

// Teacher dashboard route
app.get('/teacher/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'teacher-dashboard', 'teacher-dashboard.html'));
});

// Education centre dashboard route
app.get('/education/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'education', 'dashboard.html'));
});

// SECURITY: Disable normal staff links - redirect to login or 404
app.get('/admin/dashboard', (req, res) => {
  res.redirect('/login');
});
app.get('/ceo/dashboard', (req, res) => {
  res.redirect('/login');
});

// HIDDEN STAFF LINKS - Secure access routes
app.get('/admin-77x', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'admin.html'));
});
app.get('/ceo-99', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'ceo.html'));
});
app.get('/teacher-x72', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'teacher-dashboard', 'teacher-dashboard.html'));
});

app.get('/courses', (req, res) => res.sendFile(path.join(__dirname, '..', 'courses.html')));
app.get('/courses/', (req, res) => res.redirect('/courses'));
app.get('/pricing', (req, res) => res.sendFile(path.join(__dirname, '..', 'pricing.html')));
app.get('/pricing/', (req, res) => res.redirect('/pricing'));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, '..', 'contact.html')));
app.get('/contact/', (req, res) => res.redirect('/contact'));
app.get('/privacypolicy', (req, res) => res.sendFile(path.join(__dirname, '..', 'privacypolicy.html')));
app.get('/privacypolicy/', (req, res) => res.redirect('/privacypolicy'));
app.get('/termsconditions', (req, res) => res.sendFile(path.join(__dirname, '..', 'termsconditions.html')));
app.get('/termsconditions/', (req, res) => res.redirect('/termsconditions'));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')));

// Serve robots.txt and sitemap.xml
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, '..', 'robots.txt'));
});
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(path.join(__dirname, '..', 'sitemap.xml'));
});

// Serve static frontend (HTML, CSS, JS, assets) from project root
app.use(express.static('.', {
  index: false,
  maxAge: '30d',
  setHeaders: (res, filePath) => {
    // Don't cache HTML files
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// The error handler must be registered before any other error middleware and after all controllers
if (process.env.SENTRY_DSN) {
  app.use(Sentry.expressErrorHandler());
}

module.exports = app;

