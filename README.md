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
- **Analytics Dashboard** — Visual charts (Recharts) showing activity trends per domain over time
- **Streak & Stats Tracking** — Day streaks, weekly log counts, active domain counts
- **Full Auth** — Credentials (no password demo), Google OAuth, and GitHub OAuth via NextAuth v4

---

## 🛠 Tech Stack

| Layer     | Technology                                  |
| --------- | ------------------------------------------- |
| Framework | Next.js 16 (App Router, Turbopack)          |
| Language  | TypeScript                                  |
| Styling   | Tailwind CSS v4                             |
| Database  | PostgreSQL (Neon serverless)                |
| ORM       | Prisma v7 + `@prisma/adapter-pg`            |
| Auth      | NextAuth v4 (Credentials + Google + GitHub) |
| AI        | Groq API — `llama-3.3-70b-versatile`        |
| Charts    | Recharts                                    |

---

## 📁 Project Structure

```
skillsync/
├── prisma/
│   ├── schema.prisma            # Database schema (User, Domain, ActivityLog, Insight, WeeklyReport)
│   ├── seed.ts                  # Seeds 6 default domains
│   └── prisma.config.ts         # Prisma v7 config with pg driver adapter
├── src/
│   ├── app/
│   │   ├── page.tsx             # Landing page
│   │   ├── (auth)/login/        # Sign-in page
│   │   ├── dashboard/           # Stats, streaks, recent activity, latest insights
│   │   ├── log/                 # Log a new activity + recent log history
│   │   ├── analytics/           # Charts and visual trends per domain
│   │   ├── insights/            # AI insights browser + natural language Q&A
│   │   ├── reports/             # Weekly AI report generator + history
│   │   └── api/
│   │       ├── auth/[...nextauth]/   # NextAuth handler
│   │       ├── activities/           # GET / POST / PATCH / DELETE
│   │       ├── domains/              # GET all domains
│   │       ├── insights/             # GET insights
│   │       ├── insights/generate/    # POST — triggers AI weekly report
│   │       ├── weekly-report/        # GET weekly reports
│   │       ├── query/                # POST — on-demand AI Q&A
│   │       └── seed/                 # POST — seed default domains
│   ├── components/
│   │   ├── Navbar.tsx
│   │   └── SessionProvider.tsx
│   ├── lib/
│   │   ├── prisma.ts            # Prisma client singleton (Prisma v7 adapter-pg)
│   │   ├── auth.ts              # NextAuth config
│   │   └── claude.ts            # Groq AI wrapper (weekly report + Q&A)
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

| Route        | Description                                                 |
| ------------ | ----------------------------------------------------------- |
| `/`          | Landing page                                                |
| `/login`     | Sign in (credentials / Google / GitHub)                     |
| `/dashboard` | Stats, streaks, recent activity, latest AI insights         |
| `/log`       | Log a new activity for any domain                           |
| `/analytics` | Charts: activity volume and trends over time                |
| `/insights`  | Browse AI insights by type + ask natural language questions |
| `/reports`   | Generate and browse weekly AI performance reports           |

### API Endpoints

| Method           | Endpoint                 | Description                                    |
| ---------------- | ------------------------ | ---------------------------------------------- |
| `GET / POST`     | `/api/activities`        | List or create activity logs                   |
| `PATCH / DELETE` | `/api/activities/[id]`   | Update or delete a log entry                   |
| `GET`            | `/api/domains`           | List all domains                               |
| `GET`            | `/api/insights`          | Fetch user's AI insights                       |
| `POST`           | `/api/insights/generate` | Trigger AI weekly report generation            |
| `GET`            | `/api/weekly-report`     | List weekly reports                            |
| `POST`           | `/api/query`             | Ask AI a natural language performance question |

---

## 🗄 Database Schema

| Model          | Purpose                                                                              |
| -------------- | ------------------------------------------------------------------------------------ |
| `User`         | Auth user — linked to NextAuth accounts/sessions                                     |
| `Domain`       | Life area to track (Coding, Fitness, Reading, Mood, Sleep, SideProject)              |
| `UserDomain`   | Tracks which domains each user has activated                                         |
| `ActivityLog`  | A single logged activity with `value`, `unit`, `mood`, `energy`, `notes`, `metadata` |
| `Insight`      | AI-generated insight with type, confidence level, and recommendation                 |
| `WeeklyReport` | Weekly summary containing multiple insights                                          |

---

## 📜 Scripts

```bash
npm run dev           # Start dev server (Turbopack)
npm run build         # Production build
npm run start         # Start production server
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

---

## 🔐 OAuth Setup

**Google** — create credentials at [console.cloud.google.com](https://console.cloud.google.com)

- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

**GitHub** — create an OAuth App at [github.com/settings/developers](https://github.com/settings/developers)

- Callback URL: `http://localhost:3000/api/auth/callback/github`

---

## 📄 License

MIT
npm run db:seed # Re-seed domains

````

---

_SkillSync — built with Next.js, Prisma, PostgreSQL & Claude._

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
````

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
