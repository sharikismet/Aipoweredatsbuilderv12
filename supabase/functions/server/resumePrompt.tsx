// Career domain definitions (subset needed for prompt generation)
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
5. Use standard section names that ATS systems recognize

## Keyword Strategy
- **PRIMARY**: Extract and naturally incorporate keywords from the job description
- **TECHNICAL TERMS**: Use exact terminology from the job posting when relevant
- **VARIANTS**: Include both acronyms and full forms (e.g., "AI/Artificial Intelligence")
- Skills section should mirror job requirements
- Incorporate keywords naturally in achievement bullets, not keyword-stuffed

## Achievement Formatting (Critical for ATS)
${domain.achievementsHint}

Each bullet must follow: **[Action Verb] + [What You Did] + [Quantifiable Result/Impact]**

Examples:
${getAchievementExamples(domain.id)}

## Metrics & Quantification
- Use numbers, percentages, timescales wherever possible
${buildMetricsGuidance(domain.id)}
- Spell out large numbers for readability (e.g., "200 million users" not "200M")

${buildMetadataGuidance(domain)}

# CONTENT GUIDELINES

## Summary/Headline
- 2-3 sentences maximum
- Lead with years of experience and specialization
- Mention 2-3 high-impact achievements or unique qualifications
- Align with the job's required experience level and key requirements

## Skills Section
- Organize into 2-3 logical categories
- List 12-20 skills maximum
- Prioritize skills mentioned in job description
- Use canonical names (e.g., "JavaScript" not "JS")

## Experience Section
- List in reverse chronological order
- Company | Role | Dates format
- 3-5 achievement bullets per role (fewer for older/less relevant roles)
${getTierExperienceGuidance(tier, domain.id)}

## Education Section
- Degree | Institution | Year (or "Expected Year" for ongoing)
- Include GPA only if > 3.5 and recent grad
- Relevant coursework only if fresh grad with limited experience

# OUTPUT REQUIREMENTS

1. **Format**: Clean markdown, no code blocks, no preamble
2. **Length**: ${tier === "executive" ? "2 pages maximum (keep it punchy)" : "1 page strongly preferred, 2 pages maximum if 8+ years experience"}
3. **Tone**: Professional, confident, achievement-oriented (not flowery)
4. **Authenticity**: Enhance and optimize the provided information, but do NOT fabricate achievements, companies, or skills
5. **ATS Compatibility**: Simple formatting, keyword-rich, standard section headers
6. **Job Matching**: Explicitly address the job requirements in your bullet point selection and phrasing

# SPECIAL INSTRUCTIONS FOR TIER: ${tierLabel}

${getTierSpecificInstructions(tier)}

---

Output ONLY the resume markdown. No preamble, no code fences, no explanations.`;
}

function getTierGuidance(tier: CareerTier): string {
  switch (tier) {
    case "executive":
      return "C-suite / VP / Director level - emphasize strategic impact, P&L responsibility, org-wide influence";
    case "senior":
      return "Senior IC / Lead / Manager - balance deep expertise with cross-functional leadership";
    case "mid_level":
      return "Mid-level professional - show growth trajectory and expanding scope";
    case "experienced_undergrad":
      return "Student with experience - highlight internships and academic projects";
    case "fresh_grad":
      return "Entry-level / New grad - leverage academic projects, internships, relevant coursework";
  }
}

function getTierSpecificInstructions(tier: CareerTier): string {
  switch (tier) {
    case "executive":
      return `- Lead with business impact (revenue, cost savings, strategic wins)
- Emphasize leadership scale (team size, budget, scope)
- Include board-level/executive context if present
- Minimize technical implementation details
- Keep it concise - executives are busy, your resume should be too`;
    case "senior":
      return `- Balance "what I built" with "what my team/org achieved"
- Show technical depth AND cross-functional influence
- Mention mentorship, technical leadership, architecture decisions
- Demonstrate impact beyond individual contributions`;
    case "mid_level":
      return `- Show clear progression in responsibility
- Emphasize end-to-end ownership and complexity
- Include collaborative achievements (cross-team projects)
- Demonstrate independent decision-making`;
    case "experienced_undergrad":
      return `- Feature internships prominently (treat like full experience)
- Include academic projects that demonstrate real skills
- Show growth trajectory even with limited experience
- Highlight leadership in student organizations`;
    case "fresh_grad":
      return `- Leverage academic projects, capstones, thesis work
- Feature internships prominently (treat like full experience)
- Include relevant coursework if it matches job requirements
- Highlight leadership in student orgs, hackathons, competitions
- GPA if strong (>3.5), Dean's List, honors, scholarships`;
  }
}

function buildProfileExtrasGuidance(extras: Record<string, string>, domain: typeof CAREER_DOMAINS[CareerDomainId]): string {
  let guidance = "";
  if (Object.keys(extras).length === 0) return guidance;

  guidance += "\n**Profile Enhancements**:\n";
  for (const [key, value] of Object.entries(extras)) {
    if (!value) continue;

    switch (key) {
      case "github":
        guidance += `- GitHub: ${value} — Include prominently in contact section\n`;
        break;
      case "portfolio":
      case "website":
        guidance += `- Portfolio: ${value} — Include in contact section\n`;
        break;
      case "medical_license":
      case "board_certification":
        guidance += `- ${key}: ${value} — CRITICAL: Include immediately after name\n`;
        break;
      case "pilot_license":
      case "aircraft_ratings":
        guidance += `- ${key}: ${value} — Place in Certifications section\n`;
        break;
      case "total_flight_hours":
        guidance += `- Flight Hours: ${value} — Feature in headline (e.g., '${value}+ Hour Commercial Pilot')\n`;
        break;
      case "mba_institution":
        guidance += `- MBA: ${value} — Highlight in Education\n`;
        break;
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
      case "tech_stack":
        guidance += "- **Tech Stack**: List in bullets for context, extract to Skills section\n";
        break;
      case "team_size":
        guidance += "- **Team Size**: Use in leadership bullets (e.g., 'Led team of 5 engineers')\n";
        break;
      case "patients_per_week":
        guidance += "- **Patient Volume**: Quantify in bullets (e.g., '40+ patients weekly')\n";
        break;
      case "budget_managed":
        guidance += "- **Budget**: Feature prominently (e.g., 'Managed $2M budget')\n";
        break;
      case "direct_reports":
        guidance += "- **Direct Reports**: Always include for leadership roles\n";
        break;
    }
  }

  return guidance;
}

function buildMetricsGuidance(domainId: string): string {
  switch (domainId) {
    case "software":
      return "- Include scale metrics (users served, data volume, requests/sec)";
    case "medicine":
      return "- Include patient volume, procedures performed, success rates";
    case "aviation":
      return "- Include flight hours, aircraft types, safety records";
    case "management":
      return "- Include team size, budget managed, revenue impact";
    default:
      return "- Quantify wherever possible";
  }
}

function getTierExperienceGuidance(tier: CareerTier, domainId: string): string {
  let base = "";

  if (tier === "executive") {
    base = "- Focus on leadership impact, strategy, and business outcomes\n";
  } else if (tier === "senior") {
    base = "- Balance technical depth with cross-functional impact\n";
  } else if (tier === "mid_level" || tier === "experienced_undergrad") {
    base = "- Show growth in responsibility and technical breadth\n";
  } else {
    base = "- Emphasize learning, contributions, and ownership of discrete projects\n";
  }

  if (domainId === "software") {
    base += "- Highlight technical decisions, architecture, scale";
  } else if (domainId === "medicine") {
    base += "- Highlight clinical outcomes, research contributions";
  } else if (domainId === "aviation") {
    base += "- Highlight safety record, certifications, aircraft proficiency";
  } else {
    base += "- Highlight measurable business impact";
  }

  return base;
}

function getAchievementExamples(domainId: string): string {
  const examples: Record<string, string[]> = {
    software: [
      "- Architected microservices migration that reduced API latency by 40% and improved system reliability to 99.95% uptime",
      "- Led team of 4 engineers to rebuild authentication system, enabling 2M+ users to migrate with zero downtime",
      "- Optimized database queries and caching strategy, reducing infrastructure costs by $50K annually",
    ],
    medicine: [
      "- Managed comprehensive care for 50+ patients weekly, maintaining 98% satisfaction rate",
      "- Performed 200+ minimally invasive procedures with zero complications",
      "- Led quality improvement initiative that reduced readmission rates by 15%",
    ],
    aviation: [
      "- Maintained perfect safety record over 2,500+ flight hours across 4 aircraft types",
      "- Trained 8 junior pilots with 100% first-time checkride pass rate",
      "- Implemented checklist procedures that reduced ground delays by 12%",
    ],
    management: [
      "- Directed $5M product launch achieving 120% of revenue targets in Q1",
      "- Scaled operations team from 5 to 25 while reducing cost-per-transaction by 35%",
      "- Led process automation saving 200+ hours monthly",
    ],
    other: [
      "- Delivered [project] that resulted in [quantifiable outcome]",
      "- Collaborated with [team] to achieve [measurable improvement]",
      "- Implemented [solution] that reduced [cost/time] by [percentage]",
    ],
  };

  return (examples[domainId] || examples.other).join("\n");
}
