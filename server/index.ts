// Narration proxy. Its only job is to keep the Gemini key off the client and
// to refuse any reply that contains a number the simulation did not compute.
import express from 'express';
import { validateNarration } from '../src/narrate/validate.ts';

try {
  process.loadEnvFile?.('.env');
} catch {
  // No .env file: the app runs on its built-in wording.
}

// The app launcher sets PORT for the web app, so this server reads API_PORT only.
const port = Number(process.env.API_PORT) || 8787;
const key = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || '';
const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const timeoutMs = Number(process.env.NARRATE_TIMEOUT_MS) || 4000;

const SYSTEM = [
  'You put simulation results into warm, plain words for a young Canadian. Grade-8 reading level, Canadian spelling.',
  'You are given FACTS as JSON. Use only those facts.',
  'Never state a number that is not in the facts. Never do arithmetic. Never turn a count into a percentage.',
  'Always write numbers as digits, exactly as they appear in the facts (for example 24, 26%, $327,000). Never spell a number out in words.',
  'Never give advice, never recommend or name any product, fund, provider or company.',
  'Never use the words: behind, should have, too late, at risk, danger, doom.',
  'Speak about options and control. Be calm and direct. No lists, no headings, no emoji. Plain text only.',
].join(' ');

const TASKS: Record<string, string> = {
  story: 'Tell this one simulated life as a 2 to 3 sentence story in the second person ("this version of you").',
  worry: 'Rephrase this sized answer to a worry in 2 to 3 sentences. Keep every count exactly as given.',
  ask: 'Answer the QUESTION in 2 to 3 sentences using only the facts. If the facts do not answer it, say what they do show.',
};

const app = express();
app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ai: Boolean(key) });
});

app.post('/api/narrate', async (req, res) => {
  const { kind, facts, question } = req.body ?? {};
  if (!key) return void res.status(503).json({ error: 'narration is not configured' });
  if (typeof kind !== 'string' || !TASKS[kind] || !facts) return void res.status(400).json({ error: 'bad request' });
  const q = typeof question === 'string' ? question.slice(0, 300) : '';
  const prompt = `${TASKS[kind]}\n\nFACTS:\n${JSON.stringify(facts)}${q ? `\n\nQUESTION: ${q}` : ''}`;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 220 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) return void res.status(502).json({ error: 'narration failed' });
    const data = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();
    if (!validateNarration(text, facts, q)) return void res.status(422).json({ error: 'narration rejected' });
    res.json({ text });
  } catch {
    res.status(504).json({ error: 'narration timed out' });
  }
});

app.listen(port, () => {
  console.log(`[api] narration ${key ? `on (${model})` : 'off: no GEMINI_API_KEY, the app uses built-in wording'} · http://localhost:${port}`);
});
