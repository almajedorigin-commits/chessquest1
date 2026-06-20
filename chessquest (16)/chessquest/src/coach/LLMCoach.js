// src/coach/LLMCoach.js
//
// OPTIONAL UPGRADE PATH -- not used by default.
//
// This implements the exact same CoachProvider interface as RuleBasedCoach,
// proving the "start free, swap in an LLM later" design works: to enable it,
// you'd construct GameController with `coach: new LLMCoach()` instead of
// letting it default to RuleBasedCoach. Nothing else in the app changes.
//
// It calls a Netlify Function (see netlify/functions/coach.js) which holds the
// API key server-side. That turns the app from "fully static & free" into
// "static + one serverless function + per-move API cost", which is why it is
// off by default. The numeric analysis (eval, best lines) still comes from the
// local Stockfish engine -- the LLM only turns those numbers into nicer prose.

import { CoachProvider } from './CoachProvider.js';

const COACH_ENDPOINT = '/.netlify/functions/coach';

export class LLMCoach extends CoachProvider {
  async explainMove({ fenBefore, fenAfter, moveSan, linesBefore, linesAfter, mover }) {
    try {
      const res = await fetch(COACH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'human-move', fenBefore, fenAfter, moveSan, linesBefore, linesAfter, mover }),
      });
      if (!res.ok) throw new Error(`coach endpoint ${res.status}`);
      const data = await res.json();
      // The function returns the same MoveInsight shape RuleBasedCoach produces,
      // so the UI and storage layers need no changes.
      return data.insight;
    } catch (err) {
      // Graceful fallback: if the LLM call fails, return a minimal insight so
      // the game never blocks on coaching.
      return {
        summary: `${moveSan} played. (Coaching commentary is temporarily unavailable.)`,
        category: 'good',
        tags: [],
        mathExplanation: '',
        evalBeforeCp: 0,
        evalAfterCp: 0,
      };
    }
  }

  async explainOpponentMove({ fenBefore, fenAfter, moveSan, lines, character }) {
    try {
      const res = await fetch(COACH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'opponent-move', fenBefore, fenAfter, moveSan, lines, character }),
      });
      if (!res.ok) throw new Error(`coach endpoint ${res.status}`);
      const data = await res.json();
      return data.insight;
    } catch (err) {
      return {
        summary: `${character?.name || 'The opponent'} played ${moveSan}.`,
        category: 'best',
        tags: [],
        mathExplanation: '',
        evalBeforeCp: 0,
        evalAfterCp: 0,
      };
    }
  }
}
