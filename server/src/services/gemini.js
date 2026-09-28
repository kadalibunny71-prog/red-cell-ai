import { config } from '../config.js';
import { AppError } from '../utils/http.js';

const SAFE_INSTRUCTION = `You assist red cell.ai, a blood-request coordination platform. Write concise, compassionate operational copy only. Do not give medical diagnosis, transfusion compatibility advice, emergency triage, or guarantees. Remind users to verify requirements with the hospital blood bank where useful. Never invent contact details, availability, or clinical facts.`;

export async function generateHelp({ action, details }) {
  if (!config.geminiApiKey) throw AppError('AI assist is not configured yet.', 503, 'AI_NOT_CONFIGURED');
  const actions = {
    draft: 'Draft a clear 2–4 sentence broadcast description for this blood request.',
    summarize: 'Summarize this request as a short handoff with the key logistics.',
    checklist: 'Create a short operational follow-up checklist for the requester.'
  };
  if (!actions[action]) throw AppError('Unsupported AI action.', 400, 'INVALID_AI_ACTION');
  const content = `${SAFE_INSTRUCTION}\n\nTask: ${actions[action]}\n\nRequest data:\n${JSON.stringify(details, null, 2)}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    // AQ authentication keys are accepted through x-goog-api-key; legacy AIza keys work too.
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiApiKey },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: content }] }], generationConfig: { temperature: 0.35, maxOutputTokens: 420 } })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Gemini error', response.status, payload?.error?.message);
    throw AppError('AI assist is temporarily unavailable. Please try again.', 502, 'AI_UPSTREAM_ERROR');
  }
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!text) throw AppError('AI assist returned no text. Please try again.', 502, 'AI_EMPTY_RESPONSE');
  return text;
}
