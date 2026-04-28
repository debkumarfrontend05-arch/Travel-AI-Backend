const { GoogleGenerativeAI } = require("@google/generative-ai");
const markdownService = require("./markdownService");

// The user will replace the API key in .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE");

exports.generateItinerary = async (title, state, city, days, masterData) => {
  try {
    const prompt = markdownService.generatePrompt(masterData, title, state, city, days);
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Add strict formatting instructions
    const finalPrompt = `${prompt}\n\nIMPORTANT: Return ONLY the markdown. Do not include any conversational text or code blocks. Start directly with '#'.`;

    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const text = response.text();

    return text;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate itinerary with AI.");
  }
};