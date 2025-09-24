import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const modelName = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash-lite";

let genAIInstance: GoogleGenerativeAI | null = null;

function getClient() {
  if (!apiKey) {
    throw new Error(
      "Missing VITE_GEMINI_API_KEY. Add it to a .env file and restart dev server."
    );
  }
  if (!genAIInstance) {
    genAIInstance = new GoogleGenerativeAI(apiKey);
  }
  return genAIInstance;
}

export async function generateSentence(topicOrPrompt: string) {
  const client = getClient();
  const model = client.getGenerativeModel({ model: modelName });

  const prompt =
    typeof topicOrPrompt === "string" && topicOrPrompt.trim().length > 0
      ? `Write one short, clear sentence about: ${topicOrPrompt}`
      : "Write one short, clear sentence about anything you choose.";

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err: any) {
    const message = err?.message || "Request failed";
    throw new Error(`Gemini error: ${message}`);
  }
}

export async function generateSentenceFromWords(words: string[]) {
  const client = getClient();
  const model = client.getGenerativeModel({ model: modelName });

  const safeWords = Array.isArray(words) ? words.filter(Boolean) : [];
  const wordList = safeWords.join(", ");
  const prompt =
    safeWords.length > 0
      ? `Using these words: [${wordList}], craft one short, natural English sentence that logically uses them. Keep it under 12 words.`
      : "Write one short, clear sentence.";

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err: any) {
    const message = err?.message || "Request failed";
    throw new Error(`Gemini error: ${message}`);
  }
}


