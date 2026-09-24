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

export interface GeminiResult {
  text: string;
  modelUsed: string;
  /** Tool calls requested by the model (when config.tools was given). */
  functionCalls: Array<{ name: string; args: Record<string, unknown> }>;
}

export async function callGeminiWithResilience(options: GenerateResilientOptions): Promise<GeminiResult> {
  const ai = getGemini();
  // Single choke point: no patient name or chart ID may leave the clinic, whatever
  // path it took into the prompt (templates, chat history, action summaries).
  options = { ...options, contents: redactContents(options.contents, patientDb.getAllPatients()) };
  const models = options.preferredModel
    ? [options.preferredModel, ...MODEL_CANDIDATES.filter(m => m !== options.preferredModel)]
    : MODEL_CANDIDATES;

  let allQuota = true;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({ model, contents: options.contents, config: options.config });
        const functionCalls = (response.functionCalls || [])
          .filter(call => call.name)
          .map(call => ({ name: call.name!, args: (call.args || {}) as Record<string, unknown> }));
        // .text is empty (and warns) when the answer is only a tool call.
        const text = functionCalls.length ? '' : (response.text || '');
        return { text, modelUsed: model, functionCalls };
      } catch (err: any) {
        const msg = err?.message || String(err);
        const kind = classifyAiError(msg);
        console.warn(`[AI] Model ${model} (attempt ${attempt + 1}/2) failed (${kind}): ${msg.slice(0, 160)}`);
        if (kind === 'other') throw err;
        if (kind === 'overloaded') allQuota = false;
        // An exhausted daily quota won't recover in 600 ms: go straight to the next model.
        if (kind === 'overloaded' && attempt === 0) {
          await new Promise(r => setTimeout(r, 600));
          continue;
        }
        break;
      }
    }
  }

  throw new AiUnavailableError(allQuota ? 'quota' : 'unavailable');
}

type AiErrorKind = 'quota' | 'overloaded' | 'other';

function classifyAiError(message: string): AiErrorKind {
  if (/RESOURCE_EXHAUSTED|exceeded your current quota|\b429\b|ResourceExhausted/i.test(message)) return 'quota';
  if (/\b503\b|UNAVAILABLE|high demand|overloaded/i.test(message)) return 'overloaded';
  return 'other';
}

/** Every model failed for capacity reasons: 'quota' = daily API quota used up, 'unavailable' = overloaded. */
export class AiUnavailableError extends Error {
  constructor(public reason: 'quota' | 'unavailable') {
    super(reason === 'quota' ? 'AI quota exhausted' : 'AI temporarily unavailable');
  }
}

/** The message shown to the dentist when an AI call fails. */
export function aiErrorMessage(err: unknown, language: 'en' | 'fr'): string {
  if (err instanceof AiUnavailableError) {
    if (err.reason === 'quota') {
      return language === 'fr'
        ? "Quota de l'assistant IA épuisé pour aujourd'hui : la clé Gemini actuelle est une clé gratuite limitée. Réessayez demain ou activez la facturation sur la clé. Le reste de Molaris fonctionne normalement."
        : 'The AI assistant quota is used up for today: the current Gemini key is a limited free key. Try again tomorrow or enable billing on the key. The rest of Molaris works normally.';
    }
    return language === 'fr'
      ? "L'assistant IA est momentanément surchargé. Réessayez dans quelques instants."
      : 'The AI assistant is temporarily overloaded. Please try again in a moment.';
  }
  return (err as Error)?.message || (language === 'fr' ? "Erreur de l'assistant IA" : 'AI assistant error');
}
