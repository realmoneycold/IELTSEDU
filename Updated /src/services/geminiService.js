import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and anon key must be provided');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to check if the Gemini API key is valid
const isValidGeminiApiKey = (apiKey) => {
  return apiKey && !apiKey.startsWith('your_');
};

// Error handler for invalid Gemini API keys
const handleInvalidGeminiApiKey = () => {
  logger.warn('Invalid or placeholder Gemini API key detected. AI features temporarily unavailable.');
};

export const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!isValidGeminiApiKey(apiKey)) {
    handleInvalidGeminiApiKey();
  }

  // Create and return the Gemini client
  const geminiClient = new GeminiClient({
    apiKey,
    endpoint: 'https://api.gemini.com/v1',
  });

  return geminiClient;
};

// Wrap all Gemini API calls in try-catch blocks
export const callGeminiAPI = async (geminiClient, method, ...args) => {
  try {
    return await geminiClient[method](...args);
  } catch (error) {
    logger.error('Error calling Gemini API:', error);
    throw new Error('AI features temporarily unavailable');
  }
};
