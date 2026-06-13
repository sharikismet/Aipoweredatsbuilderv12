// Career domain definitions
const CAREER_DOMAINS = {
  software: {
    id: "software" as const,
    label: "Software Engineering",
    achievementsHint: "Quantify: latency, throughput, users served, uptime, cost savings",
    profileExtras: ["github", "portfolio", "linkedin", "website"],
    experienceMeta: ["tech_stack", "team_size"],
    suggestedSkills: ["javascript", "typescript", "react", "python", "aws", "docker", "kubernetes", "postgresql", "rest api", "git"],
  },
  medicine: {
    id: "medicine" as const,
    label: "Medicine & Healthcare",
    achievementsHint: "Quantify: patient volume, procedures, outcomes, satisfaction rates",
    profileExtras: ["medical_license", "board_certification", "npi_number"],
    experienceMeta: ["specialization", "patients_per_week", "procedures_performed"],
    suggestedSkills: ["patient care", "clinical research", "diagnosis", "emr systems", "medical imaging", "surgery", "pharmacology"],
  },
  aviation: {
    id: "aviation" as const,
    label: "Aviation & Aerospace",
    achievementsHint: "Quantify: flight hours, aircraft types, safety record, missions flown",
    profileExtras: ["pilot_license", "aircraft_ratings", "total_flight_hours"],
    experienceMeta: ["aircraft_type", "flight_hours_in_role"],
    suggestedSkills: ["flight operations", "navigation", "crew resource management", "aviation safety", "flight planning", "weather systems"],
  },
  management: {
    id: "management" as const,
    label: "Management & Business",
    achievementsHint: "Quantify: budget, headcount, revenue impact, cost savings, delivery speed",
    profileExtras: ["mba_institution", "professional_certification", "linkedin"],
    experienceMeta: ["budget_managed", "direct_reports", "key_accounts"],
    suggestedSkills: ["strategic planning", "p&l management", "team leadership", "stakeholder management", "budget planning", "process improvement"],
  },
  other: {
    id: "other" as const,
    label: "Other",
    achievementsHint: "Quantify impact: time saved, revenue generated, efficiency gains",
    profileExtras: ["linkedin", "website", "portfolio"],
    experienceMeta: [],
    suggestedSkills: [],
  },
};

type CareerDomainId = keyof typeof CAREER_DOMAINS;
type CareerTier = "fresh_grad" | "experienced_undergrad" | "mid_level" | "senior" | "executive";

const TIER_LABELS: Record<CareerTier, string> = {
  fresh_grad: "Fresh Graduate / Entry Level",
  experienced_undergrad: "Experienced Undergraduate",
  mid_level: "Mid-Level Professional",
  senior: "Senior Professional",
  executive: "Executive / Leadership",
};

interface ResumeData {
  contact_info: {
    full_name: string;
    email: string;
    phone: string;
    location: string;
    headline: string;
    extras?: Record<string, string>;
  };
  summary?: string;
  education: Array<{
    school: string;
    degree: string;
    status: "ongoing" | "completed";
    endYear: string;
  }>;
  experience: Array<{
    company: string;
    role: string;
    startYear: string;
    endYear: string;
    current?: boolean;
    description?: string;
    bullets: string[];
    isLeadership?: boolean;
    employmentType?: string;
    meta?: Record<string, string>;
  }>;
  skills: string[];
  heldLeadershipRole?: boolean;
}

interface JobDescription {
  title: string;
  company: string;
  location: string;
  level: string;
  skills: string[];
  description: string;
}

export function buildResumeSystemPrompt(
  resume: ResumeData,
  job: JobDescription,
  domainId: CareerDomainId,
  tier: CareerTier,
  customCareerLabel?: string | null,
): string {
  const domain = CAREER_DOMAINS[domainId] || CAREER_DOMAINS.other;
  const tierLabel = TIER_LABELS[tier];
  const extras = resume.contact_info.extras || {};

  return `You are an expert ATS-optimized resume writer specializing in ${domain.label} careers.

# YOUR ROLE
Generate a professional, ATS-friendly resume in clean markdown format that maximizes keyword matching while maintaining authenticity and readability.

# CRITICAL SUMMARY DIRECTIVE
You MUST write a highly compelling, comprehensive 5-sentence 'Professional Summary' (or 'Profile') at the top of the resume. 
You MUST ensure the summary is exactly 5 sentences long.
To write this summary, you MUST deeply analyze the candidate's JSON profile data:
1. Read their 'experience' timeline to calculate total years of experience.
2. Read their 'skills' array and explicitly inject their top 3-4 hard skills into the summary.
3. Read their 'education' and explicit 'domain extras' (e.g. GitHub, medical license) and mention their highest credential.
If a TARGET JOB is provided, explicitly tailor this summary to match the target job's title, company, and required skills. Demonstrate how the candidate's history makes them a perfect fit. DO NOT output a generic "Tailored for this position" sentence. Synthesize actual facts.

# CANDIDATE PROFILE
- **Field**: ${domain.label}${customCareerLabel ? ` (${customCareerLabel})` : ""}
- **Career Tier**: ${tierLabel}
- **Target Level**: ${getTierGuidance(tier)}

# CAREER DOMAIN CONTEXT: ${domain.label}
**Field Norms**: ${domain.achievementsHint}

${buildProfileExtrasGuidance(extras, domain)}

**Critical ATS Keywords for ${domain.label}**:
${domain.suggestedSkills.slice(0, 10).map(s => `- ${s}`).join("\n")}

# ATS OPTIMIZATION RULES

## Structure Requirements
1. Use clean markdown with clear section headers (# for name, ## for sections)
2. Section order: Contact → Summary/Headline → ${domain.id === "software" ? "Technical Skills" : "Core Skills"} → Professional Experience → Education
3. Use bullet points (- ) for lists, never nested bullets beyond one level
4. Keep formatting simple: **bold** for emphasis, no tables, no complex formatting

## Keyword Strategy
- **PRIMARY**: Extract and naturally incorporate keywords from the job description
- **TECHNICAL TERMS**: Use exact terminology from the job posting when relevant
- Skills section should mirror job requirements

## Achievement Formatting (Critical for ATS)
${domain.achievementsHint}
The candidate has provided rough notes or draft bullets in their JSON data (inside the experience 'description' and 'bullets' arrays). Transform their raw notes into professional, impact-driven bullet points.
Each bullet must follow: **[Action Verb] + [What You Did] + [Quantifiable Result/Impact]**

Examples:
${getAchievementExamples(domain.id)}

## Metrics & Quantification
- Use numbers, percentages, timescales wherever possible
${buildMetricsGuidance(domain.id)}

${buildMetadataGuidance(domain)}

# CONTENT GUIDELINES
- Skills: Organize logically, list 12-20 maximum.
- Experience: Reverse chronological. 3-5 achievement bullets per role.
- Education: Degree | Institution | Year.

# OUTPUT REQUIREMENTS
Output ONLY the resume markdown. No preamble, no code fences, no explanations.`;
}

function getTierGuidance(tier: CareerTier): string {
  switch (tier) {
    case "executive": return "C-suite / VP / Director level - emphasize strategic impact, P&L responsibility";
    case "senior": return "Senior IC / Lead / Manager - balance deep expertise with cross-functional leadership";
    case "mid_level": return "Mid-level professional - show growth trajectory and expanding scope";
    case "experienced_undergrad": return "Student with experience - highlight internships and academic projects";
    case "fresh_grad": return "Entry-level / New grad - leverage academic projects, internships";
  }
}

function buildProfileExtrasGuidance(extras: Record<string, string>, domain: typeof CAREER_DOMAINS[CareerDomainId]): string {
  let guidance = "";
  if (Object.keys(extras).length === 0) return guidance;

  guidance += "\n**Profile Enhancements**:\n";
  for (const [key, value] of Object.entries(extras)) {
    if (!value) continue;
    switch (key) {
      case "github": guidance += `- GitHub: ${value} — Include prominently in contact section\n`; break;
      case "portfolio":
      case "website": guidance += `- Portfolio: ${value} — Include in contact section\n`; break;
      case "medical_license":
      case "board_certification": guidance += `- ${key}: ${value} — CRITICAL: Include immediately after name\n`; break;
      case "pilot_license":
      case "aircraft_ratings": guidance += `- ${key}: ${value} — Place in Certifications section\n`; break;
      case "total_flight_hours": guidance += `- Flight Hours: ${value} — Feature in headline\n`; break;
      case "mba_institution": guidance += `- MBA: ${value} — Highlight in Education\n`; break;
    }
  }
  return guidance;
}

function buildMetadataGuidance(domain: typeof CAREER_DOMAINS[CareerDomainId]): string {
  if (domain.experienceMeta.length === 0) return "";
  let guidance = "\n## Domain-Specific Experience Metadata\n";
  guidance += "The candidate has provided additional context. Use it as follows:\n\n";
  for (const metaKey of domain.experienceMeta) {
    switch (metaKey) {
      case "tech_stack": guidance += "- **Tech Stack**: List in bullets for context, extract to Skills section\n"; break;
      case "team_size": guidance += "- **Team Size**: Use in leadership bullets (e.g., 'Led team of 5 engineers')\n"; break;
      case "patients_per_week": guidance += "- **Patient Volume**: Quantify in bullets\n"; break;
      case "budget_managed": guidance += "- **Budget**: Feature prominently\n"; break;
      case "direct_reports": guidance += "- **Direct Reports**: Always include for leadership roles\n"; break;
    }
  }
  return guidance;
}

function buildMetricsGuidance(domainId: string): string {
  switch (domainId) {
    case "software": return "- Include scale metrics (users served, data volume, requests/sec)";
    case "medicine": return "- Include patient volume, procedures performed, success rates";
    case "aviation": return "- Include flight hours, aircraft types, safety records";
    case "management": return "- Include team size, budget managed, revenue impact";
    default: return "- Quantify wherever possible";
  }
}

function getAchievementExamples(domainId: string): string {
  const examples: Record<string, string[]> = {
    software: [
      "- Architected microservices migration that reduced API latency by 40% and improved system reliability to 99.95%",
      "- Led team of 4 engineers to rebuild authentication system, enabling 2M+ users to migrate with zero downtime"
    ],
    medicine: [
      "- Managed comprehensive care for 50+ patients weekly, maintaining 98% satisfaction rate"
    ],
    aviation: [
      "- Maintained perfect safety record over 2,500+ flight hours across 4 aircraft types"
    ],
    management: [
      "- Directed $5M product launch achieving 120% of revenue targets in Q1"
    ],
    other: [
      "- Delivered [project] that resulted in [quantifiable outcome]"
    ],
  };
  return (examples[domainId] || examples.other).join("\n");
}