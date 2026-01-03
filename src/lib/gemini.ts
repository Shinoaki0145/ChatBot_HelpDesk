import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing in .env.local");
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate AI response using Gemini
 * @param options Configuration for generating response
 * @returns Generated text response
 */
export async function generateResponse(options: {
  model: string;
  userMessage: string;
  context?: string;
  chatHistory?: Array<{ role: string; content: string }>;
}) {
  const { model, userMessage, context = "", chatHistory = [] } = options;

  // Select model (default to gemini-2.5-flash if not specified)
  const modelName = model?.toLowerCase().includes("gemini") ? model : "gemini-2.5-flash";
  const generativeModel = genAI.getGenerativeModel({ model: modelName });

  // Build prompt with context and history
  let prompt = "";

  // Add context if available
  if (context) {
    prompt += `Context/Knowledge Base:\n${context}\n\n`;
  }

  // Add chat history for context
  if (chatHistory.length > 0) {
    prompt += "Previous conversation:\n";
    chatHistory.slice(-5).forEach((msg) => {
      // Only include last 5 messages
      prompt += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n`;
    });
    prompt += "\n";
  }

  // Add current user message
  prompt += `User: ${userMessage}\nAssistant:`;

  try {
    const result = await generativeModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text;
  } catch (error: any) {
    console.error("Error generating response:", error);
    throw new Error(`Failed to generate AI response: ${error.message}`);
  }
}
