# ⚡ SkillSync

**Your personal performance scientist.**

SkillSync is a full-stack habit and activity tracker that logs your life across multiple domains — coding, fitness, reading, mood, sleep, and side projects — then uses AI to surface hidden correlations and actionable insights like _"Your morning runs correlate with 40% better coding output."_

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## ✨ Features

- **Multi-Domain Activity Logging** — Track Coding 💻, Fitness 🏋️, Reading 📚, Mood 🧘, Sleep 😴, and Side Projects 🚀 in one place
- **AI-Powered Insights** — Groq (Llama 3.3 70B) analyzes your data and surfaces correlations, trends, wins, and warnings
- **Weekly Intelligence Reports** — Auto-generated weekly summaries with typed insights: `CORRELATION`, `TREND`, `WIN`, `WARNING`, `TIMING_OPTIMIZATION`
- **Natural Language Q&A** — Ask your performance scientist anything: _"How does my sleep affect my mood?"_
- **Advanced Analytics** — Activity heatmaps, domain correlation scatter charts, streak tracking, and trend charts powered by Recharts
- **Goal Tracking** — Set weekly or monthly targets per domain with AI-suggested goals; track real-time progress with a visual progress bar
- **Domain Management** — Activate/deactivate built-in domains or create fully custom ones with a name, description, icon, and color
- **Daily Reminders** — Browser notification reminders if you haven't logged by a chosen time
- **Data Export** — Download your complete activity history as CSV or JSON
- **Dark / Light Mode** — Persistent theme toggle with a polished light theme; no flash on load
- **Rate Limiting** — API routes protected against abuse via sliding-window rate limiting
- **Full Auth** — Credentials (no-password demo), Google OAuth, and GitHub OAuth via NextAuth v4

---

## 🛠 Tech Stack

| Layer        | Technology                                  |
| ------------ | ------------------------------------------- |
| Framework    | Next.js 16 (App Router, Turbopack)          |
| Language     | TypeScript                                  |
| Styling      | Tailwind CSS v4                             |
| Database     | PostgreSQL (Neon serverless)                |
| ORM          | Prisma v7 + `@prisma/adapter-pg`            |
| Auth         | NextAuth v4 (Credentials + Google + GitHub) |
| AI           | Groq API — `llama-3.3-70b-versatile`        |
| Charts       | Recharts                                    |
| Icons        | Lucide React                                |
| Date helpers | date-fns                                    |

---

## 📁 Project Structure

```
skillsync/
├── prisma/
│   ├── schema.prisma            # DB schema (User, Domain, ActivityLog, Insight, WeeklyReport, Goal)
│   ├── seed.ts                  # Seeds 6 default domains
│   └── prisma.config.ts         # Prisma v7 config with pg driver adapter
├── src/
│   ├── middleware.ts             # Auth + rate-limit middleware (protects all app routes)
│   ├── app/
│   │   ├── page.tsx             # Landing page
│   │   ├── icon.svg             # App icon (gradient lightning bolt)
│   │   ├── (auth)/login/        # Sign-in page
│   │   ├── dashboard/           # Stats, streaks, recent activity, latest insights
│   │   ├── log/                 # Log a new activity + recent log history
│   │   ├── analytics/           # Heatmaps, correlation charts, and domain trends
│   │   ├── insights/            # AI insight browser + natural language Q&A
│   │   ├── reports/             # Weekly AI report generator + history
│   │   ├── settings/            # Domain management, goals, notifications, data export
│   │   └── api/
│   │       ├── auth/[...nextauth]/   # NextAuth handler
│   │       ├── activities/           # GET / POST / PATCH / DELETE activity logs
│   │       ├── domains/              # GET all domains
│   │       ├── goals/                # GET / POST / DELETE goals
│   │       ├── insights/             # GET insights
│   │       ├── insights/generate/    # POST — trigger AI weekly report
│   │       ├── weekly-report/        # GET weekly reports
│   │       ├── query/                # POST — on-demand AI Q&A
│   │       ├── export/               # GET — download activity data as CSV or JSON
│   │       └── seed/                 # POST — seed default domains
│   ├── components/
│   │   ├── Navbar.tsx               # Top nav with theme toggle
│   │   ├── ThemeProvider.tsx        # React context for dark/light theme
│   │   ├── NotificationProvider.tsx # Browser notification scheduler
│   │   └── SessionProvider.tsx      # NextAuth session wrapper
│   ├── lib/
│   │   ├── prisma.ts            # Prisma client singleton (Prisma v7 adapter-pg)
│   │   ├── auth.ts              # NextAuth config
│   │   ├── claude.ts            # Groq AI wrapper (weekly report + Q&A)
│   │   └── ratelimit.ts         # Sliding-window rate limiter
│   └── types/
│       ├── index.ts             # Shared TypeScript interfaces
│       └── next-auth.d.ts       # Session type augmentation
├── tsconfig.seed.json           # Windows-compatible tsconfig for seed script
└── .env                         # Environment variables
```

---

## 🚀 Getting Started

### 1. Clone & install

```bash
git clone https://github.com/your-username/skillsync.git
cd skillsync
npm install
```

### 2. Configure environment variables

Create a `.env` file:

```env
# PostgreSQL — Neon (https://neon.tech) or any Postgres instance
DATABASE_URL="postgresql://user:password@host/db?sslmode=verify-full"

# NextAuth
NEXTAUTH_SECRET="your-secret"    # generate: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# OAuth (optional — remove providers you don't need from src/lib/auth.ts)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# Groq API — free tier at https://console.groq.com
GROQ_API_KEY="gsk_..."
```

### 3. Push schema & seed domains

```bash
npm run db:push       # push schema to your database
npm run db:seed       # seed 6 default domains
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — sign in with any email and start logging.

---

## 🗺 Pages & Routes

| Route        | Description                                                       |
| ------------ | ----------------------------------------------------------------- |
| `/`          | Landing page                                                      |
| `/login`     | Sign in (credentials / Google / GitHub)                           |
| `/dashboard` | Stats, streaks, recent activity, latest AI insights               |
| `/log`       | Log a new activity for any domain                                 |
| `/analytics` | Heatmaps, correlation scatter charts, and per-domain trend charts |
| `/insights`  | Browse AI insights by type + ask natural language questions       |
| `/reports`   | Generate and browse weekly AI performance reports                 |
| `/settings`  | Manage domains & goals, configure notifications, export your data |

### API Endpoints

| Method           | Endpoint                  | Description                                      |
| ---------------- | ------------------------- | ------------------------------------------------ |
| `GET / POST`     | `/api/activities`         | List or create activity logs                     |
| `PATCH / DELETE` | `/api/activities/[id]`    | Update or delete a log entry                     |
| `GET`            | `/api/domains`            | List all domains                                 |
| `GET / POST`     | `/api/goals`              | List goals with progress or create/upsert a goal |
| `DELETE`         | `/api/goals/[id]`         | Delete a goal                                    |
| `GET`            | `/api/insights`           | Fetch user's AI insights                         |
| `POST`           | `/api/insights/generate`  | Trigger AI weekly report generation              |
| `GET`            | `/api/weekly-report`      | List weekly reports                              |
| `POST`           | `/api/query`              | Ask AI a natural language performance question   |
| `GET`            | `/api/export?format=csv`  | Download full activity history as CSV            |
| `GET`            | `/api/export?format=json` | Download full activity history as JSON           |

---

## 🗄 Database Schema

| Model          | Purpose                                                                              |
| -------------- | ------------------------------------------------------------------------------------ |
| `User`         | Auth user — linked to NextAuth accounts/sessions                                     |
| `Domain`       | Life area to track (Coding, Fitness, Reading, Mood, Sleep, SideProject, or custom)   |
| `UserDomain`   | Tracks which domains each user has activated                                         |
| `ActivityLog`  | A single logged activity with `value`, `unit`, `mood`, `energy`, `notes`, `metadata` |
| `Goal`         | Weekly or monthly target per domain with a numeric `targetValue` and `unit`          |
| `Insight`      | AI-generated insight with type, confidence level, and recommendation                 |
| `WeeklyReport` | Weekly summary containing multiple typed insights                                    |

---

## 📜 Scripts

```bash
npm run dev           # Start dev server (Turbopack)
npm run build         # Production build
npm run start         # Start production server
npm run lint          # Run ESLint
npm run db:push       # Push Prisma schema to DB (no migration history)
npm run db:migrate    # Create & apply a named migration
npm run db:seed       # Seed default domains
npm run db:studio     # Open Prisma Studio GUI
npm run db:generate   # Regenerate Prisma client
```

---

## 🤖 AI Configuration

AI features use the **Groq API** (free tier). Get a key at [console.groq.com](https://console.groq.com).

Default model: `llama-3.3-70b-versatile`. To switch models, update the `model` field in `src/lib/claude.ts`.

Two AI functions:

- `generateWeeklyReport(activities)` — returns structured JSON with a week summary and typed insights
- `answerPerformanceQuery(question, activities, insights)` — answers a natural language question about your data

Goal suggestions are generated inline in the Settings page using the same Groq client.

---

## 🔐 OAuth Setup

**Google** — create credentials at [console.cloud.google.com](https://console.cloud.google.com)

- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

**GitHub** — create an OAuth App at [github.com/settings/developers](https://github.com/settings/developers)

- Callback URL: `http://localhost:3000/api/auth/callback/github`

---

## 🎨 Theming

SkillSync ships with a dark mode (default) and a polished light mode. The selected theme is persisted to `localStorage` under the key `skillsync_theme` and applied via a `data-theme` attribute on `<html>` before first paint (no flash). Toggle the theme using the ☀️/🌙 button in the navbar.

---

## 📄 License

MIT

---

_SkillSync — built with Next.js, Prisma, PostgreSQL & Groq._
