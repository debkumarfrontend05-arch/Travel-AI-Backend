const { GoogleGenerativeAI } = require("@google/generative-ai");
const markdownService = require("./markdownService");

// The user will replace the API key in .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseRetryDelayMs = (message = "") => {
  const match = String(message).match(/retry in\s+([\d.]+)s/i);
  if (!match) return 0;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? Math.ceil(seconds * 1000) : 0;
};

const extractModelNames = (listModelsResponse) => {
  const models = Array.isArray(listModelsResponse?.models)
    ? listModelsResponse.models
    : Array.isArray(listModelsResponse)
      ? listModelsResponse
      : [];

  return models
    .filter((model) =>
      Array.isArray(model?.supportedGenerationMethods) &&
      model.supportedGenerationMethods.includes("generateContent")
    )
    .map((model) => String(model.name || "").replace(/^models\//, ""))
    .filter(Boolean);
};

const getCandidateModels = async () => {
  const preferred = [
    process.env.GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
  ].filter(Boolean);

  try {
    const listed = await genAI.listModels();
    const available = extractModelNames(listed);
    const preferredAvailable = preferred.filter((model) => available.includes(model));
    return preferredAvailable.length ? preferredAvailable : available;
  } catch (error) {
    console.warn("Failed to list Gemini models, using preferred fallback list only.");
    return preferred;
  }
};

exports.generateItinerary = async (title, state, city, days, masterData) => {
  const prompt = markdownService.generatePrompt(masterData, title, state, city, days);
  const finalPrompt = `${prompt}\n\nIMPORTANT: Return ONLY the markdown. Do not include any conversational text or code blocks. Start directly with '#'.`;
  const modelNames = await getCandidateModels();
  let lastError = null;

  for (const modelName of modelNames) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(finalPrompt);
        const response = await result.response;
        const text = response.text();
        if (text && text.trim()) return text;
      } catch (error) {
        lastError = error;
        const message = error?.message || "";
        console.error(`AI Generation Error with model ${modelName}:`, message || error);

        const shouldRetry = message.includes("429") && attempt < 2;
        if (shouldRetry) {
          const delay = parseRetryDelayMs(message) || 15000;
          await sleep(delay);
          continue;
        }

        break;
      }
    }
  }

  const reason =
    lastError?.message ||
    lastError?.errorDetails?.[0]?.reason ||
    "Unknown AI provider error";

  if (String(reason).toLowerCase().includes("quota")) {
    throw new Error("Gemini quota exceeded. Enable billing or use a key/project with active quota, then retry.");
  }

  throw new Error(`Failed to generate itinerary with AI. ${reason}`);
};
