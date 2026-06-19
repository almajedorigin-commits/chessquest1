// netlify/functions/coach.js
//
// OPTIONAL -- only needed if you enable LLMCoach (see src/coach/LLMCoach.js).
// This is a stub showing the contract. To make it live:
//   1. Set an API key in Netlify env vars (e.g. ANTHROPIC_API_KEY).
//   2. Replace the TODO block with a real call to your LLM provider.
//   3. In the app, construct GameController with `coach: new LLMCoach()`.
//
// The key NEVER reaches the browser -- it stays in this serverless function.
// The function must return JSON shaped as { insight: MoveInsight } so the
// front-end LLMCoach can hand it straight to the UI unchanged.

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { kind, moveSan } = payload;

  // TODO: build a prompt from payload.linesBefore/linesAfter (eval numbers and
  // principal variations from the local Stockfish engine) plus the FENs, call
  // your LLM provider here using process.env.ANTHROPIC_API_KEY, and map the
  // model's reply into the MoveInsight shape below.

  const insight = {
    summary: `${moveSan} played. (LLM coaching is not configured on this deployment.)`,
    category: kind === 'opponent-move' ? 'best' : 'good',
    tags: [],
    mathExplanation: 'Connect an LLM provider in netlify/functions/coach.js to enable richer commentary.',
    evalBeforeCp: 0,
    evalAfterCp: 0,
  };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ insight }),
  };
}
