const { GoogleGenerativeAI } = require("@google/generative-ai");
const markdownService = require("./markdownService");

// The user will replace the API key in .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE");

exports.generateItinerary = async (title, state, city, days, masterData) => {
  const prompt = markdownService.generatePrompt(masterData, title, state, city, days);
  const finalPrompt = `${prompt}\n\nIMPORTANT: Return ONLY the markdown. Do not include any conversational text or code blocks. Start directly with '#'.`;
  const modelNames = ["gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError = null;

  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(finalPrompt);
      const response = await result.response;
      const text = response.text();
      if (text && text.trim()) return text;
    } catch (error) {
      lastError = error;
      console.error(`AI Generation Error with model ${modelName}:`, error?.message || error);
    }
  }

  const reason =
    lastError?.message ||
    lastError?.errorDetails?.[0]?.reason ||
    "Unknown AI provider error";
  throw new Error(`Failed to generate itinerary with AI. ${reason}`);
};




