# Academic Strategist

An AI-assisted academic planning tool for UK university students that understands the actual mathematics of degree classification — not just deadlines. Set a target grade (e.g. a First), and it calculates exactly what you need on your remaining assessments to get there, breaks that into scheduled tasks, and tells you the single most valuable thing to work on right now.

**Status:** actively in development, running locally. Not yet deployed — see [Status](#status--known-limitations) below for why, and what's genuinely done vs. in progress.

## Why this exists

Most student planning tools (Notion, generic to-do apps, even most "AI study planner" products) treat every university the same way: a flat GPA or percentage average. UK degree classification doesn't work like that — it's credit-weighted, year-weighted differently per institution, and the exact rules genuinely vary between universities. This project models that properly: a configurable classification engine that calculates real, correct answers to "what do I need to get a First?" for a specific university's actual published rules, verified against two structurally different real schemes (University of Kent's percentage-based year weighting, and UCL's ratio-based weighting) — proven to work through the same, unmodified calculation code for both.

## What it does

- **Classification engine** — enter your modules, credits, and assessment weightings; get a mathematically correct answer for what average you need on remaining work to hit your target grade, for full years, empty years, and partially-graded years in progress.
- **Task generation & scheduling** — breaks each assessment into a sensible set of tasks (research/draft/revise for coursework, review/practice for exams), and schedules them into your actual free time around fixed weekly commitments, prioritized by deadline urgency and assessment weighting.
- **"What should I do right now"** — a single, explained recommendation, not a list — the core idea the whole project is built around.
- **Adaptive pace learning** — tracks real time spent vs. estimated per task type, with a minimum-sample-size safeguard before it trusts learned data over the original estimate (deliberately cautious about acting on too little evidence).
- **Multi-university support** — classification rules are stored as configuration, not hardcoded logic, so a second university (UCL) works correctly through the exact same engine with zero code changes.

## Tech stack

- **Backend:** Node.js, TypeScript, Express, Prisma ORM, SQLite
- **Frontend:** React, Vite, TypeScript
- **Testing:** Vitest — 48+ tests covering the classification engine, scheduling algorithm, and pace-learning logic, each checked against hand-worked numerical examples, not just "does it run"
- **No external paid services** — runs entirely locally; deliberately avoided any hosted database or LLM API dependency to keep the project free to build and run end-to-end

## Development approach

Built incrementally, engine-first: every calculation function was written, hand-verified against a worked example, and covered by a test *before* anything was wired into an API route or UI. This caught several real issues along the way rather than after the fact — including a data-entry mistake in an initial university scheme (corrected against the actual published source), a server crash caused by an unhandled edge case in malformed data, and a subtly wrong test that the engine itself proved incorrect. Known limitations (see below) are tracked deliberately rather than hidden.

## Status & known limitations

This is a working local prototype, not a finished product. Deliberate, documented gaps:

- **Not deployed.** Runs locally via `npm install` + a couple of start commands — see below.
- **Single local user, no authentication.** Multi-user support would need real auth and a hosted database; intentionally deferred until the core logic was proven.
- **University schemes are sourced starting points, not exhaustively verified per course.** Kent and UCL's *default* undergraduate schemes are encoded and correct for the standard case; some universities run alternate calculation methods or course-specific variants (e.g. UCL's Engineering/Law-specific schemes) not yet covered.
- **Scheduler doesn't yet reorder the week relative to "today."** It correctly avoids scheduling into already-passed hours today, but still walks the week in fixed day order.
- **No document upload / AI extraction feature.** This would require a paid LLM API integration; deliberately cut to keep the project entirely free to run.

Full task-by-task roadmap and design reasoning are in [`/docs`](./docs).

## Running it locally

```bash
npm install
cp backend/.env.example backend/.env
npm run db:migrate
npm run db:seed --workspace=backend
npm run dev:backend    # in one terminal
npm run dev:frontend   # in another
```

Then open the frontend's local URL (printed by Vite, typically `http://localhost:5173`).
