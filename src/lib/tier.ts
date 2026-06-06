export type CareerTier = "fresh_grad" | "experienced_undergrad" | "mid_level" | "senior" | "executive";
export type SubscriptionTier = "free" | "job_hunter" | "aggressive";

export interface EducationEntry {
  school: string;
  degree: string;
  status: "ongoing" | "completed";
  endYear?: string;
}

export interface ExperienceEntry {
  company: string;
  role: string;
  startYear: string;
  endYear?: string;
  current?: boolean;
  bullets: string[];
  isLeadership?: boolean;
  meta?: Record<string, string>;
}

export interface ResumeInput {
  education: EducationEntry[];
  experience: ExperienceEntry[];
  skills: string[];
  heldLeadershipRole?: boolean;
}

function yearsOfExperience(exp: ExperienceEntry[]): number {
  const now = new Date().getFullYear();
  let total = 0;
  for (const e of exp) {
    const start = parseInt(e.startYear || `${now}`, 10);
    const end = e.current || !e.endYear ? now : parseInt(e.endYear, 10);
    if (!isNaN(start) && !isNaN(end)) total += Math.max(0, end - start);
  }
  return total;
}

function hasCompletedDegree(edu: EducationEntry[]): boolean {
  return edu.some((e) => e.status === "completed");
}

function hasOngoingDegree(edu: EducationEntry[]): boolean {
  return edu.some((e) => e.status === "ongoing");
}

export function classifyTier(input: ResumeInput): CareerTier {
  const years = yearsOfExperience(input.experience);
  const hasExp = input.experience.length > 0 && years > 0;
  const completedDegree = hasCompletedDegree(input.education);
  const ongoingDegree = hasOngoingDegree(input.education);
  const leadership = !!input.heldLeadershipRole;

  if (years > 10 && completedDegree && leadership) return "executive";
  if (years > 5 && completedDegree) return "senior";
  if (hasExp && ongoingDegree) return "experienced_undergrad";
  if (years >= 1 && years <= 5 && completedDegree) return "mid_level";
  if (!hasExp && (ongoingDegree || completedDegree)) return "fresh_grad";
  return "fresh_grad";
}

export const TIER_LABEL: Record<CareerTier, string> = {
  fresh_grad: "Fresh Grad",
  experienced_undergrad: "Experienced Undergrad",
  mid_level: "Mid Level",
  senior: "Senior",
  executive: "Executive",
};

export const TIER_BLURB: Record<CareerTier, string> = {
  fresh_grad: "Internships & entry-level roles",
  experienced_undergrad: "Entry to mid-level roles",
  mid_level: "Mid-level individual contributor roles",
  senior: "Senior IC and team-lead roles",
  executive: "Director, VP, and C-suite roles",
};

export const SUBSCRIPTION_LABEL: Record<SubscriptionTier, string> = {
  free: "Free Tier",
  job_hunter: "Job Hunter Pass",
  aggressive: "Aggressive Campaigner",
};

export const SUBSCRIPTION_PRICE: Record<SubscriptionTier, number> = {
  free: 0,
  job_hunter: 14,
  aggressive: 29,
};

export const SUBSCRIPTION_CREDITS: Record<SubscriptionTier, number> = {
  free: 0,
  job_hunter: 10,
  aggressive: 9999,
};
