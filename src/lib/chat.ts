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

export async function chatWithGemini(
  question: string,
  conversationHistory?: historyType[],
  context?: string
) {
  let historyContext = "";

  if (conversationHistory && conversationHistory.length > 0) {
    // ส่งแค่ 3 ข้อความล่าสุด
    const recentHistory = conversationHistory.slice(-3);
    recentHistory.forEach((msg) => {
      const role = msg.is_bot ? "พนักงาน" : "ลูกค้า";
      historyContext += `${role}: ${msg.message}\n`;
    });
  } else {
    historyContext = "(ไม่มีข้อมูลเพิ่มเติม)";
  }

  const prompt = `
  - You are a female hotel staff member at Neatly Hotel
  - Answer questions in the same language the user used in their latest message
  - Respond in a friendly and professional manner
  - Answer all questions
  - Keep responses concise
  - Review conversation history to understand context

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
