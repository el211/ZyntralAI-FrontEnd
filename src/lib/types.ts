export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  emailVerified: boolean;
  roles: string[];
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: UserSummary;
}

export type PlanCode = "FREE" | "PRO" | "BUSINESS";
export type WorkspaceRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: PlanCode;
  imageUrl: string | null;
  myRole: WorkspaceRole;
  memberCount: number;
  createdAt: string;
}

export interface Plan {
  code: PlanCode;
  name: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  aiCreditsMonthly: number;
  maxTeamMembers: number;
  maxSocialAccounts: number;
  maxWorkspaces: number;
}

export type AiContentKind =
  | "LINKEDIN_POST" | "X_POST" | "INSTAGRAM_CAPTION" | "TIKTOK_IDEA" | "FACEBOOK_POST"
  | "MARKETING_COPY" | "PRODUCT_DESCRIPTION" | "EMAIL_CAMPAIGN" | "BLOG_OUTLINE" | "CTA" | "HASHTAGS";
export type AiTone = "PROFESSIONAL" | "FRIENDLY" | "CORPORATE" | "CASUAL" | "SALES" | "MARKETING" | "TECHNICAL";
export type AiLength = "SHORT" | "MEDIUM" | "LONG";

export interface GenerationResult {
  id: string;
  output: string;
  provider: string;
  model: string;
  promptTokens: number;
  outputTokens: number;
  creditsCost: number;
}

export interface CreditUsage {
  limit: number;
  used: number;
  remaining: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

// ---- Dubbing (ElevenLabs, BYOK) ----
export type DubbingStatus = "QUEUED" | "DUBBING" | "DUBBED" | "FAILED";

export interface DubbingJob {
  id: string;
  name: string | null;
  sourceLang: string | null;
  targetLang: string;
  status: DubbingStatus;
  error: string | null;
  createdAt: string;
}

export interface CredentialStatus {
  configured: boolean;
}
