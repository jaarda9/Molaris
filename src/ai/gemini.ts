import { GoogleGenAI } from '@google/genai';
import { redactContents } from '../domain/ai-privacy.js';
import { patientDb } from '../repositories/patients.js';

let geminiClient: GoogleGenAI | null = null;

function getGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }
  return geminiClient;
}

// If the preferred model hits a transient capacity error, fall through to the
// next candidate so a chairside question still gets an answer.
export const MODEL_CANDIDATES = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

export interface GenerateResilientOptions {
  contents: any;
  config?: any;
  preferredModel?: string;
}

export async function callGeminiWithResilience(options: GenerateResilientOptions): Promise<{ text: string; modelUsed: string }> {
  const ai = getGemini();
  // Single choke point: no patient name or chart ID may leave the clinic, whatever
  // path it took into the prompt (templates, chat history, action summaries).
  options = { ...options, contents: redactContents(options.contents, patientDb.getAllPatients()) };
  const models = options.preferredModel
    ? [options.preferredModel, ...MODEL_CANDIDATES.filter(m => m !== options.preferredModel)]
    : MODEL_CANDIDATES;

  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({ model, contents: options.contents, config: options.config });
        return { text: response.text || '', modelUsed: model };
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        const isTransient = ['503', 'UNAVAILABLE', 'high demand', '429', 'ResourceExhausted', 'overloaded'].some(s => msg.includes(s));
        console.warn(`[AI] Model ${model} (attempt ${attempt + 1}/2) failed: ${msg.slice(0, 160)}`);
        if (isTransient && attempt === 0) {
          await new Promise(r => setTimeout(r, 600));
          continue;
        }
        if (isTransient) break;
        throw err;
      }
    }
  }

  throw lastError || new Error('All clinical models are temporarily experiencing high demand. Please retry in a few moments.');
}
