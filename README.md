# Prios: Reclaim Your Focus
Prios is a high-performance, focus-first productivity tool built with **Fastify**, **React**, and **SQLite**.

## The Problem
Typical todo apps become "infinite scrolls of guilt." We add tasks to boards, they pile up in lists, and eventually, the noise makes it impossible to know what to actually work on *right now*. Productivity is lost to decision fatigue.

## The Solution
**Prios** (short for Priorities) is a minimalist, API-first productivity tool that forces a daily "yes/no" decision. It transforms your stagnant backlog into an active, single-task focus stream.

### The Core Loop
1.  **Collect**: Add tasks to your boards in the "Maybe" column.
2.  **Prioritise**: At your scheduled time, Prios prompts you with a Tinder-style swipe interface.
    *   **Swipe Left**: Not today. The task stays in the backlog.
    *   **Swipe Right**: Integrated! The task moves to your "Doing" slot.
3.  **Execute**: You can only have **one** task in "Doing" at a time. This eliminates multi-tasking and forces completion.
4.  **Reward**: Track your streaks and daily progress with a visual dashboard that weights difficulty and priority.

## Key Features
- **Board-Specific Schedules**: Tasks are automatically scheduled using Google Calendar availability, respecting your specific work hours for each board.
- **Dependency Tracking**: Never start a task that's blocked by another.
- **PWA & Offline First**: Get your daily nudge on mobile or desktop, even without an internet connection.
- **Eisenhower Assistance**: Not sure how to rate a task? Use the built-in matrix to objectively determine difficulty and priority.

## Vision
Prios isn't just a place to store tasks; it's a coach that helps you decide what's worth your time and gives you the permission to ignore the rest.


## Prerequisites
- **Node.js**: v22.x (Recommended: use `nvm use 22`)
- **SQLite**: Database is managed automatically by Drizzle ORM.

## Project Structure
- `/server`: Node.js/Fastify backend.
- `/client`: Vite/React/Tailwind/DaisyUI frontend.
- `/planning`: Design docs, mockups, and standards.

## Getting Started

### 1. Setup Backend
```bash
cd server
npm install
# Create the local database and push the schema
npm run db:push
# Seed the database with essential data
npm run db:seed
# Start the dev server (defaults to port 3000)
npm run dev
```

### 2. Setup Frontend
```bash
cd client
npm install
# Start the Vite dev server (defaults to port 5173)
npm run dev
```

## Core Workflows
1. **Collect**: Add tasks to your backlog.
2. **Prioritise**: Use the swipe interface to move "Maybe" tasks to "Doing".
3. **Execute**: Focus on your single active task until it's "Done".

## Testing & Seeding
- **Seed with test data** (extra board, sample tasks, 7 days of stats): `cd server && SEED_TEST_DATA=1 npm run db:seed` (or `npm run db:seed:test` on Unix).
- **Client unit tests**: `cd client && npm run test`.
- **API smoke test** (server must be running): `./scripts/smoke-test.sh`.
- **Current state & roadmap**: See `planning/CURRENT_STATE_VERIFICATION.md`.

## Tech Stack
- **Backend**: Fastify, Drizzle ORM, Better-SQLite3.
- **Frontend**: Vite, React, Tailwind CSS, DaisyUI.
- **Standards**: British English naming, TypeScript strict mode.
