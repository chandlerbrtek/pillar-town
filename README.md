# PillarTown

A personal, phone-first habit tracker where every healthy habit builds a piece of a growing town. Inspired by Forest and SleepTown.

Full design: [PillarTown — Design Doc](https://claude.ai/artifact/LV5D8wB3AnQ5MaStTbqTTg)

## The idea

- **8 pillars of wellness.** Every habit is tagged with a pillar, and each pillar builds something different.
- **One habit, one building.** Logging a habit places something in the town right away.
- **Weekly neighborhoods.** Each week becomes one block of the town. After a year, the map is a picture of the year.
- **Balance first.** The town only grows a stage when all 8 districts are ready. Each pillar has its own weekly target, and the most neglected pillar earns double progress.
- **Mild consequences.** A skipped habit leaves a wilted spot. Going past a pillar's target in a later week restores it.

| Pillar | Builds | Example habits |
| --- | --- | --- |
| Physical (Vitality) | Trees, a running track | Exercise, sleep, eating well |
| Intellectual (Mind) | A library, bookshops, a school | Reading, a course, puzzles |
| Emotional (Heart) | Ponds, flower beds, a café | Journaling, therapy, a screen-free hour |
| Spiritual (Spirit) | Lanterns, a shrine | Meditation, gratitude, time in nature |
| Social (Bond) | Houses, a town square | Calling a friend, quality time |
| Occupational (Craft) | Workshops, a clock tower | Deep work, practicing a skill |
| Financial (Fortune) | Market stalls, a bank, a harbor | Logging spending, saving, budgeting |
| Environmental (Harmony) | Gardens, windmills | Tidying, cooking at home, going outside |

## Version 1

- [x] Create habits, tag each with a pillar, set a weekly target per pillar
- [x] One-tap daily logging (today or yesterday)
- [x] Each habit places a pixel-art building in this week's block
- [x] Wilted spots for missed targets, and comeback restoration
- [x] Town map with weekly neighborhoods
- [x] Balance view: progress toward each pillar's target this week

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:5173/pillar-town/. Run the tests with `npm test`.

Without Supabase settings, data is saved in the browser only.

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the project's SQL editor, run [`supabase/schema.sql`](supabase/schema.sql).
3. Copy `.env.example` to `.env.local` and fill in the project URL and publishable (anon) key (Project Settings > API).
4. Restart `npm run dev`, then create an account with email and password.
5. If email confirmation is on (Authentication > Sign In / Providers > Email), confirm from the email before signing in. Add the app's URLs under Authentication > URL Configuration so the confirmation link returns to the app.

The publishable key is meant to be public; row level security limits each signed-in user to their own rows.

## Deploying to GitHub Pages

The app is live at https://chandlerbrtek.github.io/pillar-town/ and deploys automatically on every push to `main`.

Setup, already done: Pages is set to "GitHub Actions" under Settings > Pages, and `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are repository variables (Settings > Secrets and variables > Actions > Variables). The "Deploy to GitHub Pages" workflow can also be run by hand from the Actions tab.

## How the town works

Nothing about the town is stored. Buildings come from logs, and wilted spots come from missed weekly targets, all worked out in [`src/town.ts`](src/town.ts):

- When a week ends, each pillar's shortfall (target minus logged) becomes wilted spots.
- Logging past a pillar's target in a later week restores that pillar's oldest wilted spots, one per extra habit.
- The first week doesn't wilt if it started mid-week.
- A week where every target is met is a full week and gets a fountain.
