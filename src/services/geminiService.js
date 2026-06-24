// src/services/geminiService.js
const apiKey = process.env.GEMINI_API_KEY;

let aiFeaturesAvailable = true;

if (!apiKey || apiKey.startsWith('your_')) {
    console.error('⚠️ DEMO MODE: GEMINI_API_KEY is missing or placeholder. AI features temporarily unavailable.');
    aiFeaturesAvailable = false;
}

const generateResponse = async (prompt) => {
    if (!aiFeaturesAvailable) {
        return "AI features temporarily unavailable";
    }
    // Placeholder for actual implementation once key is provided
    throw new Error("AI currently not implemented");
};

module.exports = {
    generateResponse
};
