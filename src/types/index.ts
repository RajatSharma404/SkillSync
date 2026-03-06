// Shared TypeScript types for SkillSync
// Plain TypeScript interfaces — independent of Prisma generated types.
// Structurally compatible with Prisma return values for stable VS Code support.

export interface DomainData {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
}

export interface ActivityWithDomain {
  id: string;
  userId: string;
  domainId: string;
  loggedAt: Date;
  createdAt: Date;
  value: number | null;
  unit: string | null;
  mood: number | null;
  energy: number | null;
  notes: string | null;
  metadata: unknown; // Prisma JsonValue — can be scalar, object, array, or null
  domain: DomainData;
}

export interface InsightData {
  id: string;
  userId: string;
  weeklyReportId: string | null;
  insightText: string;
  domainsInvolved: string[];
  confidenceLevel: number;
  recommendation: string;
  insightType: string;
  createdAt: Date;
}

export interface WeeklyReportData {
  id: string;
  userId: string;
  weekStart: Date;
  weekEnd: Date;
  summary: string;
  totalLogs: number;
  domainsActive: string[];
  generatedAt: Date;
  insights?: InsightData[];
}

export interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    activityLogs: number;
    insights: number;
    weeklyReports: number;
  };
}

// Legacy type aliases for backwards compatibility
export type InsightWithReport = InsightData & {
  weeklyReport?: WeeklyReportData | null;
};
export type WeeklyReportWithInsights = WeeklyReportData & {
  insights: InsightData[];
};
export type UserWithStats = UserData;

// Domain categories used for seeding and display
export const DEFAULT_DOMAINS = [
  {
    name: "Coding",
    icon: "💻",
    color: "#00b8e6",
    description: "Programming, LeetCode, projects",
  },
  {
    name: "Fitness",
    icon: "🏋️",
    color: "#10b981",
    description: "Gym, running, sports",
  },
  {
    name: "Reading",
    icon: "📚",
    color: "#f59e0b",
    description: "Books, articles, courses",
  },
  {
    name: "Mood",
    icon: "🧘",
    color: "#ec4899",
    description: "Daily mood and mental state",
  },
  {
    name: "Sleep",
    icon: "😴",
    color: "#8b5cf6",
    description: "Sleep duration and quality",
  },
  {
    name: "SideProject",
    icon: "🚀",
    color: "#0ea5e9",
    description: "Personal projects and creative work",
  },
] as const;

export type DomainName = (typeof DEFAULT_DOMAINS)[number]["name"];
