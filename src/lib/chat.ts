import { VertexAI } from "@google-cloud/vertexai";

const credentialsString = process.env.GOOGLE_APPLICATION_CREDENTIALS_VERTEX_JSON;
if (!credentialsString) {
  throw new Error("GOOGLE_APPLICATION_CREDENTIALS_VERTEX_JSON environment variable is not set");
}

let credentials;
try {
  credentials = JSON.parse(credentialsString);
} catch (error) {
  throw new Error(`Invalid JSON in GOOGLE_APPLICATION_CREDENTIALS_VERTEX_JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

const vertex = new VertexAI({
  project: process.env.GCLOUD_PROJECT_ID!,
  location: process.env.GCLOUD_LOCATION!,
  googleAuthOptions: {
    credentials
  }
});

const model = vertex.getGenerativeModel({ model: "gemini-2.5-flash" });

export type historyType = { is_bot: boolean; message: string };

// Direct call to Gemini without system prompt (for task-specific operations)
export async function directGeminiCall(prompt: string) {
  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  });
  return result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function chatWithGemini(
  question: string,
  conversationHistory?: historyType[],
  context?: string
) {
  let historyContext = "";

  if (conversationHistory && conversationHistory.length > 0) {
    // Last 3 messages only
    const recentHistory = conversationHistory.slice(-3);
    recentHistory.forEach((msg) => {
      const role = msg.is_bot ? "Assistant" : "User";
      historyContext += `${role}: ${msg.message}\n`;
    });
  } else {
    historyContext = "(No previous conversation)";
  }

  const prompt = `
  - You are a female hotel staff member at Neatly Hotel
  - Answer in the same language the user used
  - Be friendly, professional, and concise
  - Keep responses concise
  - Review conversation history for context
  
  IMPORTANT:
  - Only use provided information - don't make things up
  - If you don't have the answer, be honest about it
  - DO NOT say you will "check" or "investigate"
  - For additional help: suggest opening a "ticket" (English) - DO NOT translate to "ตั๋ว" or any other language

  ${context ? `Context: ${context}\n` : ""}
  
  Conversation History:
  ${historyContext}

  Question: ${question}
  `;

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  });
  return result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
