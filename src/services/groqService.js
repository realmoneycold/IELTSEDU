/**
 * Groq AI Service
 * Handles all AI interactions with Groq API for IELTS writing assessment and mentoring
 */

const Groq = require('groq-sdk');
const logger = require('./loggerService');

// Initialize Groq client lazily
let groq = null;

function initGroqClient() {
  if (groq) {
    logger.info('Groq client already initialized, returning cached instance');
    return groq;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    logger.error('GROQ_API_KEY environment variable is not set');
    throw new Error('GROQ_API_KEY is required but not configured');
  }

  logger.info('Initializing Groq client with API key:', apiKey.substring(0, 10) + '...');

  try {
    groq = new Groq({
      apiKey: apiKey,
    });

    // Verify the client has the expected structure
    if (!groq || !groq.chat || !groq.chat.completions) {
      logger.error('Groq client initialization failed - unexpected structure');
      logger.error('groq object:', Object.keys(groq || {}));
      throw new Error('Groq client initialization failed');
    }

    logger.info('Groq client initialized successfully');
    return groq;
  } catch (error) {
    logger.error('Failed to initialize Groq client:', error.message);
    throw error;
  }
}

// Reset function for debugging
function resetGroqClient() {
  groq = null;
  logger.info('Groq client reset');
}

// ═══════════════════════════════════════════════════════════════
// IELTS EVALUATION PROMPTS
// ═══════════════════════════════════════════════════════════════

const IELTS_WRITING_SYSTEM_PROMPT = `You are an expert IELTS Writing examiner with 10+ years of experience. 

Your task is to evaluate student writing based on IELTS band descriptors. You must provide a highly granular, detailed breakdown suitable for a deep-dive analysis UI.

RESPONSE FORMAT - ALWAYS respond in this strict JSON format:
{
  "taskFulfillment": { "band": 7, "score": "7.0", "feedback": "Clear main points, but some minor details missing" },
  "coherenceAndCohesion": { "band": 6.5, "score": "6.5", "feedback": "Good use of discourse markers, logical flow" },
  "lexicalRange": { "band": 7, "score": "7.0", "feedback": "Good range of vocabulary with minor errors" },
  "grammaticalAccuracy": { "band": 6.5, "score": "6.5", "feedback": "Generally accurate, some complex structures with errors" },
  "overallBand": "6.75",
  "overallBandRounded": 7,
  "strengths": ["Clear structure", "Good vocabulary", "Logical flow"],
  "weaknesses": ["Some grammatical errors", "Could vary sentence structure more"],
  "improvements": ["Practice complex sentence structures", "Review prepositions"],
  "checklist": {
    "wordCount": { "value": "Number of words", "passed": true/false, "message": "Explanation of word count penalty or praise" },
    "opinions": { "value": "Subjective vs Objective", "passed": true/false, "message": "Did they avoid opinions (Task 1) or give clear opinions (Task 2)?" },
    "introduction": { "value": "Paraphrasing quality", "passed": true/false, "message": "Did they paraphrase the prompt effectively?" },
    "overview": { "value": "Overview/Conclusion", "passed": true/false, "message": "Did they include a clear overview (Task 1) or conclusion (Task 2)?" }
  },
  "vocabulary": {
    "excellent": ["list of 3-5 high-level vocabulary words used correctly"],
    "basic": [
      { "word": "basic word used", "suggestion": "better alternative" }
    ]
  },
  "errors": [
    { "original": "incorrect text", "correction": "corrected text", "type": "grammar/vocabulary/spelling", "explanation": "Why it is wrong" }
  ]
}

BAND DESCRIPTORS:
- Band 9: Expert user - very few errors, natural flow, sophisticated vocabulary
- Band 8: Very good - most requirements met, occasional errors, good range
- Band 7: Good - clearly organized, minor errors, adequate vocabulary
- Band 6: Competent - main points covered, some errors, acceptable range
- Band 5: Modest - main ideas present, limited organization, basic vocabulary
- Band 4: Limited - some organization issues, frequent errors, restricted range
- Below 4: Inadequate

Remember: Be encouraging but honest. Provide specific examples from the text. For the errors array, try to find 2-4 specific sentences or phrases to correct.`;

const IELTS_SPEAKING_SYSTEM_PROMPT = `You are an expert IELTS Speaking examiner with 10+ years of experience.

Your task is to evaluate a student's spoken response based on IELTS Speaking band descriptors. Since you are evaluating from a text transcript, you can assess Fluency & Coherence, Lexical Resource, and Grammatical Range & Accuracy thoroughly. For Pronunciation, provide guidance based on word choice and common patterns (e.g., complex words that non-native speakers often mispronounce).

RESPONSE FORMAT - ALWAYS respond in this JSON format:
{
  "fluencyAndCoherence": {
    "band": 7,
    "score": "7.0",
    "feedback": "Good flow with minor hesitations. Ideas are logically connected."
  },
  "lexicalResource": {
    "band": 7,
    "score": "7.0",
    "feedback": "Good range of vocabulary with some less common items used accurately."
  },
  "grammaticalRangeAndAccuracy": {
    "band": 6.5,
    "score": "6.5",
    "feedback": "Mix of simple and complex structures with some minor errors."
  },
  "pronunciation": {
    "band": 7,
    "score": "7.0",
    "feedback": "Likely clear and understandable. Watch intonation on questions.",
    "wordsToPractice": ["pronunciation", "specific"]
  },
  "overallBand": "6.75",
  "overallBandRounded": 7,
  "overallScore": "7.0",
  "strengths": ["Good fluency", "Appropriate vocabulary", "Coherent structure"],
  "weaknesses": ["Some grammatical errors", "Limited complex structures"],
  "improvements": ["Practice using more conditional sentences", "Expand topic-specific vocabulary"],
  "examinerNotes": "Good attempt. Focus on grammatical accuracy and vocabulary range for higher band."
}

BAND DESCRIPTORS:
- Band 9: Expert user - natural flow, sophisticated vocabulary, wide grammatical range, virtually no errors
- Band 8: Very good - fluent with occasional hesitation, good vocabulary, mostly accurate grammar
- Band 7: Good - generally fluent, adequate vocabulary with some less common items, mostly accurate
- Band 6: Competent - some fluency issues, adequate vocabulary, mix of simple and complex with errors
- Band 5: Modest - noticeable pauses, limited vocabulary, mainly simple structures with errors
- Band 4: Limited - frequent pauses, basic vocabulary, simple structures with frequent errors
- Below 4: Inadequate

Remember: Be encouraging but honest. Provide specific examples from the response.`;

const IELTS_MENTOR_SYSTEM_PROMPT = `You are Sarah, a friendly, supportive, and highly knowledgeable IELTS mentor.

CRITICAL RULES FOR YOUR BEHAVIOR:
1. BE EXTREMELY CONCISE: Treat this as a real-time chat interface. Never output massive blocks of text. Keep your responses to 1-3 short paragraphs maximum.
2. CONVERSATIONAL TONE: If the student simply says "hello" or "hi", just greet them warmly and introduce yourself as Sarah, then ask how you can help with their IELTS preparation today. DO NOT provide unsolicited study plans or info-dumps.
3. ONE TOPIC AT A TIME: Address only the specific question asked. Do not volunteer overwhelming amounts of extra information unless specifically requested. Stay focused on the speaking/IELTS topic.
4. BE INQUISITIVE: End your responses with a short, clarifying question to keep the conversation going and guide the student.
5. USE MARKDOWN: Use **bold text** for emphasis, short bulleted lists for readability, and clear line breaks.
6. SPEAKING EVALUATION: If the student asks for a score, evaluate their speaking or messages in the current conversation history. Provide a detailed IELTS band score estimate (from 0 to 9) for Fluency, Lexical Resource, Grammatical Range, and an Overall score, along with short, actionable feedback.
7. GROUP CONVERSATION: You are participating in a group speaking session with one or more students. Each student's turn is prefixed with their name (e.g., "John: hello"). Address them by name and reference their arguments (e.g., "According to John...") to keep the discussion engaging and professional.

STUDENT CONTEXT: {studentContext}
(Use this context to personalize your advice, especially focusing on their weak areas if they ask for general guidance, but remember to stay conversational and brief.)`;

const IELTS_MENTOR_VOICE_SYSTEM_PROMPT = `You are Sarah, a friendly, natural, and supportive IELTS speaking partner and coach in a live voice conversation.

CRITICAL RULES FOR YOUR VOICE BEHAVIOR:
1. SPEAK LIKE A NATURAL HUMAN: Use a warm, conversational, colloquial tone, just like a friend talking over the phone. Stay professional and keep the conversation focused on the speaking topic or IELTS practice.
2. NO MARKDOWN: Absolutely do NOT use any markdown formatting. Do not use bold text (**), asterisks (*), bullet points, numbered lists, emojis, or hashtags. The output must be clean, plain text that can be spoken naturally by a speech synthesizer.
3. KEEP IT VERY CONCISE: Real voice conversations have short turns. Speak in 1 to 3 short sentences maximum (under 40 words total). Never output long paragraphs or lists.
4. NATURAL FLOW: Use conversational fillers occasionally, such as "Well,", "Actually,", "Hmm,", "Oh,", "Right,", "you know" to sound human. Use common contractions (like "I'm", "you're", "don't", "it's").
5. SPEAKING EVALUATION: If the student asks you to evaluate them, score their speaking, or asks how they did, analyze their speech in the current conversation history. Give them a friendly, spoken band score estimate (e.g. "I'd score your speaking as a band six point five, with good fluency but some grammar slips") and one quick tip to improve. Keep it under 40 words and spoken in plain words (no symbols or markdown!).
6. GROUP CONVERSATION: You are in a group speaking session. Each student's turn is prefixed with their name. Address them by name and refer to their arguments (e.g., "John said... but Jane, what do you think?"). Always speak to the current active speaker.
7. ENGAGE THE STUDENT: End your turn with a single, short, friendly question to prompt the student to speak back.

STUDENT CONTEXT: {studentContext}`;

// ═══════════════════════════════════════════════════════════════
// MAIN SERVICE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate IELTS writing based on student performance history
 * @param {string} writingText - Student's writing to evaluate
 * @param {Object} studentContext - Student's performance data
 * @returns {Promise<Object>} Evaluation result with bands and feedback
 */
/**
 * Evaluate IELTS speaking response based on transcript
 * @param {string} speakingText - Student's speaking transcript to evaluate
 * @param {string} partType - 'Part1' | 'Part2' | 'Part3' | 'Full'
 * @param {string} questionPrompt - The question/prompt the student responded to
 * @param {Object} studentContext - Student's performance data
 * @returns {Promise<Object>} Evaluation result with bands and feedback
 */
async function evaluateIELTSSpeaking(speakingText, partType = 'Full', questionPrompt = '', studentContext = {}) {
  try {
    if (!speakingText || speakingText.trim().length < 20) {
      throw new Error('Speaking response must be at least 20 characters');
    }

    const client = initGroqClient();
    const contextString = formatStudentContext(studentContext);

    const fullPrompt = `${IELTS_SPEAKING_SYSTEM_PROMPT}

---

Evaluate this IELTS Speaking ${partType} response from a student${contextString ? ` with this background: ${contextString}` : ''}.

QUESTION/PROMPT:
"${questionPrompt || 'General IELTS Speaking question'}"

STUDENT RESPONSE:
"${speakingText}"

Provide a detailed evaluation in JSON format with band scores for each criteria.`;

    const message = await client.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: fullPrompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1200,
    });

    const responseText = message.choices[0].message.content;
    const evaluation = parseJSONResponse(responseText);

    logger.info('IELTS speaking evaluation completed', { studentId: studentContext.id, partType });
    return evaluation;
  } catch (error) {
    logger.error('Error evaluating IELTS speaking:', error);
    throw new Error(`Speaking evaluation failed: ${error.message}`);
  }
}

async function evaluateIELTSWriting(writingText, studentContext = {}) {
  try {
    if (!writingText || writingText.trim().length < 50) {
      throw new Error('Writing sample must be at least 50 characters');
    }

    const client = initGroqClient();

    // Build context string
    const contextString = formatStudentContext(studentContext);

    const fullPrompt = `${IELTS_WRITING_SYSTEM_PROMPT}

---

Please evaluate this IELTS writing sample from a student${
      contextString ? ` with this background: ${contextString}` : ''
    }:

"${writingText}"

Provide a detailed evaluation in JSON format with band scores for each criteria.`;

    const message = await client.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: fullPrompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
    });

    // Parse response
    const responseText = message.choices[0].message.content;
    const evaluation = parseJSONResponse(responseText);

    logger.info('IELTS writing evaluation completed', { studentId: studentContext.id });
    return evaluation;
  } catch (error) {
    logger.error('Error evaluating IELTS writing:', error);
    throw new Error(`Writing evaluation failed: ${error.message}`);
  }
}

/**
 * Get AI mentoring response for student questions
 * @param {string} question - Student's question
 * @param {Object} studentContext - Student's performance data
 * @param {Object} options - Options including isVoiceChat
 * @returns {Promise<Object>} Mentor response
 */
async function getIELTSMentoring(question, studentContext = {}, options = {}) {
  try {
    if (!question || question.trim().length < 5) {
      throw new Error('Question must be at least 5 characters');
    }

    logger.info('Initializing Groq client for mentoring...');
    const client = initGroqClient();

    // Debug: Check client structure
    logger.info('Groq client structure:', {
      hasClient: !!client,
      hasChat: !!(client && client.chat),
      hasCompletions: !!(client && client.chat && client.chat.completions),
      completionsMethods: client && client.chat && client.chat.completions ? Object.keys(client.chat.completions) : 'N/A'
    });

    const contextString = formatStudentContext(studentContext);
    const isVoiceChat = options.isVoiceChat || false;
    const promptTemplate = isVoiceChat ? IELTS_MENTOR_VOICE_SYSTEM_PROMPT : IELTS_MENTOR_SYSTEM_PROMPT;
    const systemPrompt = promptTemplate.replace(
      '{studentContext}',
      contextString || 'Limited data available'
    );

    // Build messages array supporting conversation history
    let messages = [];
    messages.push({
      role: 'system',
      content: systemPrompt
    });

    if (options.history && Array.isArray(options.history) && options.history.length > 0) {
      // Filter only text messages to build chat history
      const textMessages = options.history.filter(m => m.type === 'text');
      
      // Get the last 15 messages (history) excluding the current question if it's already at the end
      let historyToSend = textMessages;
      if (historyToSend.length > 0) {
        const lastMsg = historyToSend[historyToSend.length - 1];
        if (lastMsg.text === question && lastMsg.socketId !== 'ai-coach') {
          historyToSend = historyToSend.slice(0, -1);
        }
      }

      // Slice to last 12 messages to keep prompt size & latency minimal
      const recentHistory = historyToSend.slice(-12);
      recentHistory.forEach(msg => {
        const role = msg.socketId === 'ai-coach' ? 'assistant' : 'user';
        const content = role === 'assistant' ? msg.text : `${msg.userName || 'Student'}: ${msg.text}`;
        messages.push({
          role: role,
          content: content
        });
      });

      // Finally add the current user question
      messages.push({
        role: 'user',
        content: `${studentContext.name || 'Student'}: ${question}`
      });
    } else {
      // Fallback if no history is provided: combine system prompt with user question
      messages.push({
        role: 'user',
        content: question
      });
    }

    logger.info('Calling Groq API with model: llama-3.3-70b-versatile');

    // Verify client has required methods
    if (!client.chat || !client.chat.completions || typeof client.chat.completions.create !== 'function') {
      logger.error('Groq client missing chat.completions.create method');
      logger.error('client.chat:', Object.keys(client.chat || {}));
      throw new Error('Groq client not properly initialized');
    }

    const message = await client.chat.completions.create({
      messages: messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.8,
      max_tokens: 1000,
    });

    const response = message.choices[0].message.content;

    logger.info('IELTS mentoring response generated', { studentId: studentContext.id });
    return {
      response,
      model: 'llama-3.3-70b-versatile',
      tokens_used: message.usage?.total_tokens || 0,
    };
  } catch (error) {
    logger.error('Error generating mentoring response:', error);
    throw new Error(`Mentoring failed: ${error.message}`);
  }
}

/**
 * Get detailed writing tips based on student's weak areas
 * @param {string[]} weakAreas - Array of weak areas (e.g., ['grammar', 'vocabulary'])
 * @param {Object} studentContext - Student's data
 * @returns {Promise<Object>} Tips and strategies
 */
async function getWritingTips(weakAreas = [], studentContext = {}) {
  try {
    if (!weakAreas || weakAreas.length === 0) {
      weakAreas = ['all writing skills'];
    }

    const client = initGroqClient();

    const weakAreasList = weakAreas.join(', ');
    const contextString = formatStudentContext(studentContext);

    const prompt = `As an IELTS mentor, provide specific, actionable tips for improving these areas: ${weakAreasList}
${contextString ? `This student background: ${contextString}` : ''}

Provide 5-7 concrete exercises and strategies that work. Be specific and practical.`;

    const message = await client.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1200,
    });

    const tips = message.choices[0].message.content;

    logger.info('Writing tips generated', { areas: weakAreas });
    return {
      tips,
      weakAreas,
      timestamp: new Date(),
    };
  } catch (error) {
    logger.error('Error generating writing tips:', error);
    throw new Error(`Tips generation failed: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Format student performance context for AI prompts
 * @param {Object} studentContext - Student data
 * @returns {string} Formatted context string
 */
function formatStudentContext(studentContext) {
  if (!studentContext || Object.keys(studentContext).length === 0) {
    return '';
  }

  const parts = [];

  if (studentContext.name) parts.push(`Name: ${studentContext.name}`);
  if (studentContext.currentBand) parts.push(`Current Band: ${studentContext.currentBand}`);
  if (studentContext.targetBand) parts.push(`Target Band: ${studentContext.targetBand}`);
  if (studentContext.examDate) parts.push(`Exam Date: ${new Date(studentContext.examDate).toLocaleDateString()}`);
  if (studentContext.studyHours) parts.push(`Study Hours Completed: ${studentContext.studyHours}`);
  if (studentContext.tasksDone) parts.push(`Practice Tasks Completed: ${studentContext.tasksDone}`);
  if (studentContext.roomName) parts.push(`Speaking Room Topic/Name: ${studentContext.roomName}`);
  
  if (studentContext.listeningAvg || studentContext.readingAvg) {
     parts.push(`Latest Averages -> L: ${studentContext.listeningAvg||0}, R: ${studentContext.readingAvg||0}, W: ${studentContext.writingAvg||0}, S: ${studentContext.speakingAvg||0}`);
  }

  if (studentContext.weakAreas && studentContext.weakAreas.length > 0) {
    parts.push(`Identified Weak Areas: ${studentContext.weakAreas.join(', ')}`);
  }

  if (studentContext.typingWpm) {
    parts.push(`Typing Speed (CBT relevant): ${studentContext.typingWpm} WPM`);
  }
  
  if (studentContext.previousSubmissions) {
    parts.push(`Previous submissions: ${studentContext.previousSubmissions}`);
  }

  return parts.join(' | ');
}

/**
 * Parse JSON from Groq response (handles markdown code blocks)
 * @param {string} text - Response text from Groq
 * @returns {Object} Parsed JSON
 */
function parseJSONResponse(text) {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch {
    // Handle markdown code blocks
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Handle plain JSON blocks
    const plainJsonMatch = text.match(/\{[\s\S]*\}/);
    if (plainJsonMatch) {
      return JSON.parse(plainJsonMatch[0]);
    }

    throw new Error('Could not parse JSON from response');
  }
}

/**
 * Check if Groq API is available
 * @returns {Promise<boolean>}
 */
async function isGroqAvailable() {
  try {
    if (!process.env.GROQ_API_KEY) {
      logger.warn('GROQ_API_KEY not configured');
      return false;
    }

    const client = initGroqClient();

    // Quick test call
    await client.chat.completions.create({
      messages: [{ role: 'user', content: 'ping' }],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 10,
    });

    return true;
  } catch (error) {
    logger.error('Groq API unavailable:', error.message);
    return false;
  }
}

/**
 * Generate 3-5 custom study tasks using Groq Llama-3 based on user stats
 * @param {Object} stats - Student performance stats
 * @returns {Promise<Object>} Object containing { todos: [ { task } ] }
 */
async function generateTodoRecommendations(stats = {}) {
  try {
    const client = initGroqClient();

    const currentBand = stats.currentBand || 5.0;
    const targetBand = stats.targetBand || 7.0;
    const averages = stats.categoryAverages || {};
    const weaknesses = stats.weaknesses || [];
    const typingWpm = stats.typingWpm || 0;

    const statsContext = `
Current overall band score: ${currentBand}
Target band score: ${targetBand}
Category averages:
- Listening: ${averages.listening || 'No attempts yet'}
- Reading: ${averages.reading || 'No attempts yet'}
- Writing: ${averages.writing || 'No attempts yet'}
- Speaking: ${averages.speaking || 'No attempts yet'}
Weaknesses: ${weaknesses.length > 0 ? weaknesses.join(', ') : 'None identified yet'}
Typing Speed: ${typingWpm ? typingWpm + ' WPM' : 'Not tested yet'}
    `;

    const systemPrompt = `You are a helpful, data-driven IELTS tutor.
Your task is to analyze a student's statistics and generate 3 to 5 highly specific, actionable study tasks for their weekly To-Do list.

Each task must be a concrete, realistic action (e.g. "Take 1 Reading Practice Test focusing on Matching Headings", "Write 1 Writing Task 2 essay on environment topics", "Practice Typing Dojo for 10 minutes to improve WPM").
Make the tasks directly relevant to their weakest areas and the difference between their current band and target band.
Keep task descriptions short, concise and clear (maximum 100 characters).

RESPONSE FORMAT - ALWAYS respond in this strict JSON format:
{
  "todos": [
    { "task": "Short task description (max 100 chars)" }
  ]
}`;

    const message = await client.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: `${systemPrompt}\n\nStudent Statistics:\n${statsContext}\n\nProvide the To-Do recommendations in JSON format:`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = message.choices[0].message.content;
    const result = parseJSONResponse(responseText);

    logger.info('To-Do recommendations successfully generated by Groq');
    return result;
  } catch (error) {
    logger.warn('Error generating To-Do recommendations using Groq API, using smart rules fallback: ' + error.message);
    return getFallbackTodoRecommendations(stats);
  }
}

/**
 * Fallback rules-based recommendations generator
 */
function getFallbackTodoRecommendations(stats = {}) {
  const currentBand = stats.currentBand || 5.0;
  const targetBand = stats.targetBand || 7.0;
  const averages = stats.categoryAverages || {};
  const weaknesses = stats.weaknesses || [];
  const typingWpm = stats.typingWpm || 0;

  const todos = [];

  // 1. Weakness-based tasks
  if (weaknesses.length > 0) {
    weaknesses.slice(0, 2).forEach(weakness => {
      const cleanWeakness = String(weakness).replace(/_/g, ' ');
      todos.push({ task: `Target weakness: Practice ${cleanWeakness} exercises for 20 minutes` });
    });
  }

  // 2. Skill-specific score-based tasks
  const skills = [
    { name: 'Listening', score: averages.listening, task: 'Complete 1 Listening mock section focusing on spelling/MCQs' },
    { name: 'Reading', score: averages.reading, task: 'Read 1 academic passage and practice True/False/Not Given questions' },
    { name: 'Writing', score: averages.writing, task: 'Write 1 Writing Task 2 essay on environment/education and submit' },
    { name: 'Speaking', score: averages.speaking, task: 'Record a Speaking Part 2 cue card session and listen to your fluency' }
  ];

  // Sort skills by score ascending (weakest first)
  const scoreParsed = skills.map(s => {
    let numScore = parseFloat(s.score);
    if (isNaN(numScore) || numScore === 0) {
      numScore = 5.0; // default initial score
    }
    return { ...s, numScore };
  });

  // Sort lowest score first
  scoreParsed.sort((a, b) => a.numScore - b.numScore);

  // Add tasks for the two weakest skills
  scoreParsed.slice(0, 2).forEach(s => {
    todos.push({ task: s.task });
  });

  // 3. Typing speed tasks
  if (typingWpm < 40) {
    todos.push({ task: `Spend 10 minutes on Typing Dojo to increase speed above ${typingWpm} WPM` });
  } else if (typingWpm < 60) {
    todos.push({ task: 'Complete 1 advanced typing lesson to sustain 60+ WPM for computer-based IELTS' });
  }

  // 4. General tasks if we still don't have enough (need at least 3)
  if (todos.length < 3) {
    todos.push({ task: 'Review 15 high-frequency IELTS vocabulary words and use them in sentences' });
    todos.push({ task: 'Review previous mock test mistakes and document key grammar errors' });
  }

  // Ensure unique tasks and slice to 3-5 tasks
  const uniqueTodos = [];
  const tasksSeen = new Set();
  for (const item of todos) {
    const cleanTask = item.task.substring(0, 100);
    if (!tasksSeen.has(cleanTask)) {
      tasksSeen.add(cleanTask);
      uniqueTodos.push({ task: cleanTask });
    }
  }

  return {
    todos: uniqueTodos.slice(0, 4)
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  evaluateIELTSWriting,
  evaluateIELTSSpeaking,
  getIELTSMentoring,
  getWritingTips,
  isGroqAvailable,
  parseJSONResponse,
  formatStudentContext,
  initGroqClient,
  resetGroqClient,
  generateTodoRecommendations,
};
