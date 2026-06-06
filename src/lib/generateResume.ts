import { buildResumePrompt } from "./resumePrompt";
import { CareerDomainId } from "./careerDomains";
import { CareerTier } from "./tier";

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

interface GenerateResumeOptions {
  resumeData: ResumeData;
  job?: JobDescription;
  apiKey?: string;
}

/**
 * Generate an ATS-optimized resume using Claude API
 * Falls back to template-based generation if API call fails
 */
export async function generateResume(options: GenerateResumeOptions): Promise<string> {
  const { resumeData, job, apiKey } = options;

  // If API key is available, use Claude API
  if (apiKey) {
    try {
      const systemPrompt = buildResumePrompt(resumeData, job);

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          temperature: 0.7,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: "Generate the ATS-optimized resume now.",
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${error}`);
      }

      const result = await response.json();
      const resumeMarkdown = result.content[0].text;

      return resumeMarkdown;
    } catch (error) {
      console.error("Claude API generation failed, falling back to template:", error);
      return generateTemplateResume(resumeData, job);
    }
  }

  // Fallback to template-based generation
  return generateTemplateResume(resumeData, job);
}

/**
 * Fallback template-based resume generation
 * Used when Claude API is unavailable or fails
 */
function generateTemplateResume(data: ResumeData, job?: JobDescription): string {
  const { contact_info, education, experience, skills } = data;
  const extras = contact_info.extras || {};

  let md = `# ${contact_info.full_name}\n\n`;

  // Contact info
  md += `${contact_info.email} | ${contact_info.phone}`;
  if (contact_info.location) md += ` | ${contact_info.location}`;
  if (extras.linkedin) md += ` | [LinkedIn](${extras.linkedin})`;
  if (extras.github) md += ` | [GitHub](${extras.github})`;
  if (extras.portfolio) md += ` | [Portfolio](${extras.portfolio})`;
  if (extras.website) md += ` | [Website](${extras.website})`;
  md += "\n\n";

  // Headline/Summary
  if (contact_info.headline) {
    md += `## Professional Summary\n\n${contact_info.headline}\n\n`;
  }

  // Certifications/Licenses (for certain domains)
  const certs = [];
  if (extras.medical_license) certs.push(`Medical License: ${extras.medical_license}`);
  if (extras.board_certification) certs.push(`Board Certification: ${extras.board_certification}`);
  if (extras.pilot_license) certs.push(`Pilot License: ${extras.pilot_license}`);
  if (extras.aircraft_ratings) certs.push(`Aircraft Ratings: ${extras.aircraft_ratings}`);
  if (extras.total_flight_hours) certs.push(`Total Flight Hours: ${extras.total_flight_hours}`);
  if (extras.professional_certification) certs.push(extras.professional_certification);

  if (certs.length > 0) {
    md += `## Certifications & Licenses\n\n`;
    certs.forEach(cert => md += `- ${cert}\n`);
    md += "\n";
  }

  // Skills
  if (skills.length > 0) {
    md += `## Skills\n\n`;
    md += skills.join(" • ");
    md += "\n\n";
  }

  // Experience
  if (experience.length > 0) {
    md += `## Professional Experience\n\n`;

    experience.forEach((exp) => {
      const endYear = exp.current ? "Present" : exp.endYear;
      md += `### ${exp.role}\n`;
      md += `**${exp.company}** | ${exp.startYear} - ${endYear}\n\n`;

      // Add domain-specific metadata
      const meta = exp.meta || {};
      const metaLines = [];
      if (meta.tech_stack) metaLines.push(`Tech Stack: ${meta.tech_stack}`);
      if (meta.team_size) metaLines.push(`Team Size: ${meta.team_size}`);
      if (meta.patients_per_week) metaLines.push(`Patient Volume: ${meta.patients_per_week}/week`);
      if (meta.aircraft_type) metaLines.push(`Aircraft: ${meta.aircraft_type}`);
      if (meta.flight_hours_in_role) metaLines.push(`Flight Hours: ${meta.flight_hours_in_role}`);
      if (meta.budget_managed) metaLines.push(`Budget: ${meta.budget_managed}`);
      if (meta.direct_reports) metaLines.push(`Team: ${meta.direct_reports} direct reports`);

      if (metaLines.length > 0) {
        md += `*${metaLines.join(" | ")}*\n\n`;
      }

      // Achievements
      exp.bullets.filter(b => b.trim()).forEach((bullet) => {
        md += `- ${bullet.trim()}\n`;
      });

      md += "\n";
    });
  }

  // Education
  if (education.length > 0) {
    md += `## Education\n\n`;

    education.forEach((edu) => {
      const status = edu.status === "ongoing" ? " (Expected)" : "";
      md += `### ${edu.degree}${status}\n`;
      md += `**${edu.school}**`;
      if (edu.endYear) md += ` | ${edu.endYear}`;
      md += "\n\n";
    });
  }

  // MBA if present
  if (extras.mba_institution) {
    md += `**MBA** | ${extras.mba_institution}\n\n`;
  }

  return md.trim();
}
