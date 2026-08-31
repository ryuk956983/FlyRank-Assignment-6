import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';
import { SupportTicketOutputSchema } from './schema.js';

const SYSTEM_INSTRUCTION = `You are an automated, reliable data classification engine. 
Analyze the customer message and return structured triage metadata strictly matching the requested JSON schema.`;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in the environment or .env file');
  }
  return new GoogleGenAI({ apiKey });
}

async function callModel(promptText) {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: promptText,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            enum: ['billing', 'technical', 'account', 'general_inquiry'],
          },
          urgency: {
            type: Type.STRING,
            enum: ['low', 'medium', 'high', 'critical'],
          },
          sentiment: {
            type: Type.STRING,
            enum: ['positive', 'neutral', 'negative'],
          },
          key_entities: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          suggested_action: { type: Type.STRING },
          confidence_score: { type: Type.NUMBER },
        },
        required: ['category', 'urgency', 'sentiment', 'suggested_action', 'confidence_score'],
      },
      temperature: 0.1,
    },
  });

  return response.text;
}

export async function triageCustomerMessage(text, maxRetries = 2) {
  let attempts = 0;
  let lastError;

  while (attempts <= maxRetries) {
    try {
      const rawJson = await callModel(text);
      const parsedData = JSON.parse(rawJson);
      
      // Strict runtime validation via Zod
      return SupportTicketOutputSchema.parse(parsedData);
    } catch (error) {
      lastError = error;
      attempts++;
      if (attempts <= maxRetries) {
        // Linear backoff
        await new Promise((res) => setTimeout(res, attempts * 750));
      }
    }
  }

  throw new Error(`LLM evaluation failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`);
}