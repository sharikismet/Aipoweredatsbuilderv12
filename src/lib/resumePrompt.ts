import { CareerDomainId, getDomain } from "./careerDomains";
import { CareerTier, TIER_LABEL } from "./tier";

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
  career_domain: CareerDomainId | null;
  custom_career_label?: string | null;
  tier: CareerTier;
}

interface JobDescription {
  title: string;
  company: string;
  description: string;
}

export function buildResumePrompt(data: ResumeData, job?: JobDescription): string {
  const domain = getDomain(data.career_domain);
  const tierLabel = TIER_LABEL[data.tier];

  const SYSTEM_PROMPT = `You are an expert ATS-optimized resume writer specializing in ${domain.label} careers.

# YOUR ROLE
Generate a professional, ATS-friendly resume in clean markdown format that maximizes keyword matching while maintaining authenticity and readability.

# CANDIDATE PROFILE
- **Field**: ${domain.label}${data.custom_career_label ? ` (${data.custom_career_label})` : ""}
- **Career Tier**: ${tierLabel}
- **Target Level**: ${getTierGuidance(data.tier)}

# CAREER DOMAIN CONTEXT: ${domain.label}

${buildDomainGuidance(domain, data)}

# ATS OPTIMIZATION RULES

## Structure Requirements
1. Use clean markdown with clear section headers (# for name, ## for sections)
2. Section order: Contact → Summary/Headline → ${domain.label === "Software Engineering" ? "Technical Skills" : "Core Skills"} → ${domain.experienceSectionLabel} → Education
3. Use bullet points (- ) for lists, never nested bullets beyond one level
4. Keep formatting simple: **bold** for emphasis, no tables, no complex formatting
5. Use standard section names that ATS systems recognize

## Keyword Strategy
${job ? `- **PRIMARY**: Extract and naturally incorporate keywords from the job description
- **TECHNICAL TERMS**: Use exact terminology from the job posting when relevant
- **VARIANTS**: Include both acronyms and full forms (e.g., "AI/Artificial Intelligence")` : `- Use industry-standard terminology and buzzwords relevant to ${domain.label}
- Include both acronyms and full forms for technical terms
- Front-load important keywords in bullet points`}
- Skills section should mirror ${job ? "job requirements" : "current industry demands"}
- Incorporate keywords naturally in achievement bullets, not keyword-stuffed

## Achievement Formatting (Critical for ATS)
${domain.achievementsHint}

Each bullet must follow: **[Action Verb] + [What You Did] + [Quantifiable Result/Impact]**

Examples:
${getAchievementExamples(domain.id)}

## Metrics & Quantification
- Use numbers, percentages, timescales wherever possible
- ${domain.id === "software" ? "Include scale metrics (users served, data volume, requests/sec)" : ""}
- ${domain.id === "medicine" ? "Include patient volume, procedures performed, success rates" : ""}
- ${domain.id === "aviation" ? "Include flight hours, aircraft types, safety records" : ""}
- ${domain.id === "management" ? "Include team size, budget managed, revenue impact" : ""}
- Spell out large numbers for readability (e.g., "200 million users" not "200M")

## Domain-Specific Metadata Integration
${buildMetadataGuidance(domain, data)}

# CONTENT GUIDELINES

## Summary/Headline
- 2-3 sentences maximum
- Lead with years of experience and specialization
- Mention 2-3 high-impact achievements or unique qualifications
- ${job ? `Align with the job's required experience level and key requirements` : `Position for the candidate's tier: ${tierLabel}`}

## Skills Section
- Organize into 2-3 logical categories (e.g., "Technical Skills", "Tools & Platforms", "Soft Skills")
- List 12-20 skills maximum
- ${job ? "Prioritize skills mentioned in job description" : "Focus on most relevant and current skills"}
- Use canonical names (e.g., "JavaScript" not "JS", "Python 3.x" not "Python")

## Experience Section
- List in reverse chronological order
- Company | Role | Dates format
- 3-5 achievement bullets per role (fewer for older/less relevant roles)
- ${data.tier === "executive" ? "Focus on leadership impact, strategy, and business outcomes" : ""}
- ${data.tier === "senior" ? "Balance technical depth with cross-functional impact" : ""}
- ${data.tier === "mid_level" ? "Show growth in responsibility and technical breadth" : ""}
- ${data.tier === "junior" || data.tier === "fresh_grad" ? "Emphasize learning, contributions, and ownership of discrete projects" : ""}
- Highlight ${domain.id === "software" ? "technical decisions, architecture, scale" : domain.id === "medicine" ? "clinical outcomes, research contributions" : domain.id === "aviation" ? "safety record, certifications, aircraft proficiency" : "measurable business impact"}

## Education Section
- Degree | Institution | Year (or "Expected Year" for ongoing)
- Include GPA only if > 3.5 and recent grad
- Relevant coursework only if fresh grad with limited experience
- Certifications go here if not numerous (otherwise separate section)

# OUTPUT REQUIREMENTS

1. **Format**: Clean markdown, no code blocks, no preamble
2. **Length**: ${data.tier === "executive" ? "2 pages maximum (keep it punchy)" : "1 page strongly preferred, 2 pages maximum if 8+ years experience"}
3. **Tone**: Professional, confident, achievement-oriented (not flowery)
4. **Authenticity**: Enhance and optimize the provided information, but do NOT fabricate achievements, companies, or skills
5. **ATS Compatibility**: Simple formatting, keyword-rich, standard section headers
${job ? `6. **Job Matching**: Explicitly address the job requirements in your bullet point selection and phrasing` : ""}

# SPECIAL INSTRUCTIONS FOR TIER: ${tierLabel}

${getTierSpecificInstructions(data.tier)}

${job ? `# JOB DESCRIPTION ANALYSIS

**Target Role**: ${job.title} at ${job.company}

Parse this job description and optimize the resume accordingly:

\`\`\`
${job.description}
\`\`\`

**Your Tasks**:
1. Extract key required skills, qualifications, and experience
2. Identify 15-20 critical keywords to incorporate
3. Match resume tone to company culture (startup vs enterprise, formal vs casual)
4. Prioritize achievements that demonstrate the required competencies
5. Adjust headline/summary to position candidate for THIS specific role` : ""}

# CANDIDATE DATA

${formatCandidateData(data)}

---

Generate the ATS-optimized markdown resume now. Output ONLY the resume markdown, no explanations or preamble.`;

  return SYSTEM_PROMPT;
}

function getTierGuidance(tier: CareerTier): string {
  switch (tier) {
    case "executive":
      return "C-suite / VP / Director level - emphasize strategic impact, P&L responsibility, org-wide influence";
    case "senior":
      return "Senior IC / Lead / Manager - balance deep expertise with cross-functional leadership";
    case "mid_level":
      return "Mid-level professional - show growth trajectory and expanding scope";
    case "junior":
      return "Early career - demonstrate potential, learning agility, concrete contributions";
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

    case "junior":
      return `- Focus on concrete, measurable contributions
- Highlight growth and learning velocity
- Include projects where you drove clear outcomes
- Demonstrate collaboration and coachability`;

    case "fresh_grad":
      return `- Leverage academic projects, capstones, thesis work
- Feature internships prominently (treat like full experience)
- Include relevant coursework if it matches job requirements
- Highlight leadership in student orgs, hackathons, competitions
- GPA if strong (>3.5), Dean's List, honors, scholarships`;
  }
}

function buildDomainGuidance(domain: ReturnType<typeof getDomain>, data: ResumeData): string {
  const extras = data.contact_info.extras || {};
  let guidance = `**Field Norms**: ${domain.achievementsHint}\n\n`;

  // Add guidance based on domain-specific extras
  if (domain.profileExtras.length > 0) {
    guidance += "**Profile Enhancements**:\n";
    domain.profileExtras.forEach((extra) => {
      const value = extras[extra.key];
      if (value) {
        guidance += `- **${extra.label}**: ${value} — `;
        switch (extra.key) {
          case "github":
            guidance += "Include prominently in contact section, ensure it's a clean profile URL\n";
            break;
          case "portfolio":
          case "website":
            guidance += "Include in contact section, mention if it showcases relevant work\n";
            break;
          case "linkedin":
            guidance += "Standard inclusion in contact info\n";
            break;
          case "medical_license":
          case "board_certification":
            guidance += "Critical credential - include immediately after name or in dedicated Certifications section\n";
            break;
          case "npi_number":
            guidance += "Include if applying to clinical roles or hospital systems\n";
            break;
          case "pilot_license":
          case "aircraft_ratings":
            guidance += "Place in Certifications section with license number and ratings\n";
            break;
          case "total_flight_hours":
            guidance += "Feature prominently - use in headline (e.g., '3,500+ Hour Commercial Pilot')\n";
            break;
          case "mba_institution":
            guidance += "Highlight if from top-tier school; include in Education or mention in summary\n";
            break;
          case "professional_certification":
            guidance += "Include in Certifications section (PMP, Six Sigma, etc.)\n";
            break;
          default:
            guidance += "Incorporate appropriately based on relevance\n";
        }
      }
    });
    guidance += "\n";
  }

  // Add domain-specific ATS keywords
  guidance += "**Critical ATS Keywords for this Field**:\n";
  const domainKeywords: Record<CareerDomainId, string[]> = {
    software: ["agile", "CI/CD", "scalability", "microservices", "cloud native", "full-stack", "DevOps", "API design", "system architecture", "technical leadership"],
    medicine: ["patient care", "clinical research", "evidence-based", "multidisciplinary", "EMR/EHR", "HIPAA", "quality improvement", "diagnostic", "treatment protocols"],
    aviation: ["flight safety", "crew resource management", "FAA regulations", "flight operations", "aviation safety", "aircraft systems", "flight planning", "airspace management"],
    management: ["P&L", "stakeholder management", "strategic planning", "team leadership", "process improvement", "budget management", "change management", "cross-functional"],
    other: ["problem-solving", "collaboration", "communication", "leadership", "project management", "analytical skills", "attention to detail", "results-driven"],
  };

  const keywords = domainKeywords[domain.id] || domainKeywords.other;
  guidance += keywords.map(k => `- ${k}`).join("\n");

  return guidance;
}

function buildMetadataGuidance(domain: ReturnType<typeof getDomain>, data: ResumeData): string {
  if (domain.experienceMeta.length === 0) {
    return "No additional metadata for this domain.\n";
  }

  let guidance = "The candidate has provided domain-specific experience metadata. Use it as follows:\n\n";

  domain.experienceMeta.forEach((meta) => {
    guidance += `**${meta.label}** (${meta.key}):\n`;

    switch (meta.key) {
      case "tech_stack":
        guidance += "- List the full tech stack in the experience bullet as context (e.g., 'Built using React, Node.js, PostgreSQL')\n";
        guidance += "- Extract individual technologies and ensure they appear in Skills section\n";
        break;
      case "team_size":
        guidance += "- Incorporate into leadership/collaboration bullets (e.g., 'Led team of 5 engineers to...')\n";
        break;
      case "patients_per_week":
      case "procedures_performed":
        guidance += "- Use as quantifiable metrics in achievement bullets (e.g., 'Managed care for 40+ patients weekly')\n";
        break;
      case "specialization":
        guidance += "- Mention in role description or key achievement bullets to show focus area\n";
        break;
      case "aircraft_type":
        guidance += "- List all aircraft types in Certifications or create 'Aircraft Proficiency' section\n";
        break;
      case "flight_hours_in_role":
        guidance += "- Include as metric in role bullet (e.g., 'Logged 800+ flight hours on Boeing 737')\n";
        break;
      case "budget_managed":
        guidance += "- Feature prominently for management roles (e.g., 'Managed $2M annual budget')\n";
        break;
      case "direct_reports":
        guidance += "- Always include for leadership positions (e.g., 'Led 12-person cross-functional team')\n";
        break;
      case "key_accounts":
        guidance += "- Mention in client-facing achievement bullets with context\n";
        break;
      default:
        guidance += "- Incorporate naturally into relevant achievement bullets\n";
    }
    guidance += "\n";
  });

  return guidance;
}

function getAchievementExamples(domainId: CareerDomainId): string {
  const examples: Record<CareerDomainId, string[]> = {
    software: [
      "- Architected microservices migration that reduced API latency by 40% and improved system reliability to 99.95% uptime",
      "- Led team of 4 engineers to rebuild authentication system, enabling 2M+ users to migrate with zero downtime",
      "- Optimized database queries and caching strategy, reducing infrastructure costs by $50K annually while supporting 3x traffic growth",
    ],
    medicine: [
      "- Managed comprehensive care for 50+ patients weekly across cardiology and internal medicine, maintaining 98% patient satisfaction",
      "- Performed 200+ minimally invasive procedures with zero complications, reducing average recovery time by 30%",
      "- Led quality improvement initiative that reduced hospital readmission rates by 15% over 6-month period",
    ],
    aviation: [
      "- Maintained perfect safety record over 2,500+ flight hours across 4 aircraft types (737, A320, regional jets)",
      "- Trained and mentored 8 junior pilots, resulting in 100% first-time checkride pass rate",
      "- Implemented new pre-flight checklist procedures that reduced ground delays by 12% across fleet operations",
    ],
    management: [
      "- Directed $5M product launch across 3 markets, achieving 120% of revenue targets in first quarter",
      "- Built and scaled operations team from 5 to 25 employees while reducing cost-per-transaction by 35%",
      "- Spearheaded process automation initiative that saved 200+ hours monthly and improved delivery speed by 40%",
    ],
    other: [
      "- Delivered [specific project/initiative] that resulted in [quantifiable outcome]",
      "- Collaborated with [team/department] to achieve [measurable improvement]",
      "- Implemented [solution/process] that reduced [cost/time] by [percentage/amount]",
    ],
  };

  return examples[domainId].join("\n");
}

function formatCandidateData(data: ResumeData): string {
  let output = "```json\n";
  output += JSON.stringify({
    contact: data.contact_info,
    education: data.education,
    experience: data.experience,
    skills: data.skills,
  }, null, 2);
  output += "\n```";
  return output;
}
