// ═══════════════════════════════════════════════════════════════
// Ollama AI Service Integration
// Provides IELTS-specific AI feedback and chat using local Ollama
// ═══════════════════════════════════════════════════════════════

const axios = require('axios');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';
const OLLAMA_ENABLED = process.env.OLLAMA_ENABLED === 'true';

// Logger utility
const logger = {
  info: (message) => console.log(`[Ollama] ℹ️  ${message}`),
  warn: (message) => console.warn(`[Ollama] ⚠️  ${message}`),
  error: (message) => console.error(`[Ollama] ❌ ${message}`),
};

/**
 * Check if Ollama service is available
 */
const isOllamaAvailable = async () => {
  if (!OLLAMA_ENABLED) {
    return false;
  }

  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, { 
      timeout: 2000 
    });
    return response.status === 200;
  } catch (error) {
    logger.warn(`Ollama is not available at ${OLLAMA_BASE_URL}`);
    return false;
  }
};

/**
 * Generate AI response for student feedback
 * Provides IELTS-specific constructive feedback
 */
const generateAIFeedback = async (prompt, context = {}) => {
  if (!OLLAMA_ENABLED) {
    return {
      success: false,
      message: 'AI features not enabled',
      error: 'OLLAMA_ENABLED is false'
    };
  }

  try {
    const available = await isOllamaAvailable();
    if (!available) {
      logger.warn('Ollama service unavailable, returning graceful error');
      return {
        success: false,
        message: 'AI service temporarily unavailable. Try again in a moment.',
        error: 'Ollama not responding'
      };
    }

    // Build IELTS-specific system prompt
    const systemPrompt = `You are an IELTS preparation tutor. Provide constructive feedback on the student's writing, speaking, reading, or listening.
Be encouraging, specific, and actionable. Provide tips for improvement.
Keep responses concise (200-300 words).
Focus on: grammar, vocabulary, structure, fluency, pronunciation (if applicable).
Context: ${JSON.stringify(context)}`;

    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model: OLLAMA_MODEL,
        prompt: prompt,
        system: systemPrompt,
        stream: false,
        temperature: 0.7
      },
      { timeout: 60000 } // 60 second timeout
    );

    if (response.data && response.data.response) {
      return {
        success: true,
        feedback: response.data.response,
        model: OLLAMA_MODEL,
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error('Invalid response from Ollama');
    }
  } catch (error) {
    logger.error(`Error calling Ollama: ${error.message}`);
    return {
      success: false,
      message: 'AI service error. Please try again.',
      error: error.message
    };
  }
};

/**
 * Process chat session with Ollama
 * Maintains conversation history for contextual responses
 */
const processAIChat = async (userMessage, chatHistory = []) => {
  if (!OLLAMA_ENABLED) {
    return {
      success: false,
      reply: 'AI chat not available in this configuration'
    };
  }

  try {
    const available = await isOllamaAvailable();
    if (!available) {
      return {
        success: false,
        reply: 'AI tutor is temporarily offline. Please try again later.'
      };
    }

    // Build conversation context from history (last 5 messages)
    let conversationContext = 'You are an IELTS tutor assisting with exam preparation.\n\nPrevious messages:\n';
    
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.slice(-5).forEach(msg => {
        conversationContext += `${msg.role}: ${msg.content}\n`;
      });
    }

    const prompt = `${conversationContext}\nStudent: ${userMessage}\nTutor:`;

    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        temperature: 0.8
      },
      { timeout: 45000 } // 45 second timeout
    );

    if (response.data && response.data.response) {
      return {
        success: true,
        reply: response.data.response,
        model: OLLAMA_MODEL,
        timestamp: new Date().toISOString()
      };
    } else {
      throw new Error('Invalid response from Ollama');
    }
  } catch (error) {
    logger.error(`Chat error: ${error.message}`);
    return {
      success: false,
      reply: 'Sorry, I encountered an error. Please try again.'
    };
  }
};

/**
 * Initialize Ollama service on app startup
 * Logs connection status for debugging
 */
const initializeOllamaService = async () => {
  if (!OLLAMA_ENABLED) {
    logger.info('Ollama service disabled (OLLAMA_ENABLED=false)');
    return;
  }

  logger.info(`Checking Ollama service at ${OLLAMA_BASE_URL}...`);
  const available = await isOllamaAvailable();
  
  if (available) {
    logger.info(`✅ Ollama connected. Using model: ${OLLAMA_MODEL}`);
  } else {
    logger.warn(`⚠️  Ollama not available at ${OLLAMA_BASE_URL}. AI features disabled.`);
    logger.warn('Install Ollama later: https://ollama.ai');
  }
};

// Export as CommonJS for Node.js compatibility
module.exports = {
  isOllamaAvailable,
  generateAIFeedback,
  processAIChat,
  initializeOllamaService
};
