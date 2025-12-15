// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';

type GenerateRequestBody = {
  prompt?: string;
  model?: string;
  maxOutputTokens?: 10000;
  temperature?: number;
};

function extractTextFromResponse(body: any): string {
  if (!body) return '';
  try {
    const out = body.outputs?.[0]?.content?.find((c: any) => c?.text)?.text;
    if (typeof out === 'string' && out.length) return out;
  } catch {}
  try {
    const cand = body.candidates?.[0];
    if (cand) {
      if (typeof cand.output === 'string') return cand.output;
      if (Array.isArray(cand.content)) {
        const found = cand.content.find((c: any) => c?.text)?.text;
        if (found) return found;
      }
    }
  } catch {}
  if (typeof body.text === 'string' && body.text.length) return body.text;
  return JSON.stringify(body);
}

export async function POST(req: NextRequest) {
  try {
    const envKey = process.env.GEMINI_API_KEY;
    if (!envKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not set in environment (GEMINI_API_KEY)' },
        { status: 500 }
      );
    }

    const body = (await req.json()) as GenerateRequestBody;
    const prompt = body.prompt ?? '';
    const modelRaw = body.model ?? 'models/gemini-2.5-pro';
    // note: docs show model path as models/{model} in some examples; using model id works in endpoint path below
    const model = modelRaw;
    const maxOutputTokens = body.maxOutputTokens ?? 10000;
    const temperature = typeof body.temperature === 'number' ? body.temperature : 0.2;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;

    // <-- IMPORTANT: put sampling/length params INSIDE generationConfig -->
    const payload = {
      contents: [
        {
          // For simple text query use parts array
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 10000,
        temperature,
        // you can add topP, topK, stopSequences, candidateCount ... per docs
      },
      // optionally: systemInstruction, safetySettings, tools, etc.
    };

    const res = await fetch(endpoint + `?key=${encodeURIComponent(envKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You can pass API key either via ?key= or header x-goog-api-key. Using ?key= is fine for testing.
        // 'x-goog-api-key': envKey,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      console.error('GEMINI ERROR:', res.status, JSON.stringify(json, null, 2));
      return NextResponse.json(
        { error: 'Gemini API error', status: res.status, details: json },
        { status: 502 }
      );
    }

    const text = extractTextFromResponse(json);
    return NextResponse.json({ output: text, raw: json });
  } catch (err: any) {
    console.error('app/api/generate error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
