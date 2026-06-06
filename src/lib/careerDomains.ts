import { Code2, Briefcase, Wrench, Plane, Stethoscope, DollarSign, Palette, GraduationCap, MoreHorizontal, LucideIcon } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
//  HOW TO ADD A NEW CAREER DOMAIN
// ─────────────────────────────────────────────────────────────────────────────
//  1. Pick a short kebab-case id (e.g. "law") and add it to `CareerDomainId`.
//  2. Add a new object to the `CAREER_DOMAINS` array below with:
//       - icon:            any lucide-react icon (import it at the top)
//       - label / blurb:   shown on the CareerPicker card
//       - suggestedSkills: chips offered on the skills step
//       - profileExtras:   profile-level questions added to the Contact step
//                          (e.g. "Bar admission #", "GitHub URL")
//       - experienceMeta:  per-job questions added to each Experience entry
//                          (e.g. "Flight hours", "Patient volume")
//       - cvSectionLabels: heading names used in the generated CV
//       - achievementsHint / toneHint: passed to the Claude prompt so AI
//                          tailors the writing style for this field
//  3. The picker, onboarding form, account page, dashboard badge, and the AI
//     prompt all read from this file — nothing else needs editing.
//  4. To also bias the AI for this domain, mirror the entry inside
//     `DOMAIN_PROMPTS` in `supabase/functions/server/index.tsx`.
// ─────────────────────────────────────────────────────────────────────────────

export type CareerDomainId =
  | "software"
  | "management"
  | "engineering"
  | "aviation"
  | "medicine"
  | "finance"
  | "design"
  | "education"
  | "other";

export interface DomainField {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "url" | "number";
}

export interface CareerDomain {
  id: CareerDomainId;
  label: string;
  blurb: string;
  icon: LucideIcon;
  suggestedSkills: string[];
  profileExtras: DomainField[];
  experienceMeta: DomainField[];
  experienceSectionLabel: string;
  cvSectionLabels: { experience: string; skills: string; education: string };
  achievementsHint: string;
  toneHint: string;
}

export const CAREER_DOMAINS: CareerDomain[] = [
  {
    id: "software",
    label: "Software / IT",
    blurb: "Engineering, data, devops, security.",
    icon: Code2,
    suggestedSkills: ["typescript", "react", "python", "go", "aws", "docker", "kubernetes", "postgres", "system design", "ci/cd"],
    profileExtras: [
      { key: "github", label: "GitHub URL", placeholder: "https://github.com/you", type: "url" },
      { key: "portfolio", label: "Portfolio / personal site", placeholder: "https://", type: "url" },
      { key: "core_stack", label: "Core tech stack", placeholder: "TypeScript, React, Node, Postgres" },
      { key: "linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/you", type: "url" },
    ],
    experienceMeta: [
      { key: "stack", label: "Tech stack used", placeholder: "React, Node, Postgres" },
      { key: "team_size", label: "Team size", placeholder: "5 engineers" },
      { key: "repo", label: "Public repo / case study", placeholder: "https://", type: "url" },
    ],
    experienceSectionLabel: "Engineering experience",
    cvSectionLabels: { experience: "Experience", skills: "Technical Skills", education: "Education" },
    achievementsHint: "Quantify impact — latency cut, throughput, users shipped to.",
    toneHint: "Concise, metrics-driven, no marketing fluff.",
  },
  {
    id: "management",
    label: "Management / Executive",
    blurb: "People leadership, ops, strategy.",
    icon: Briefcase,
    suggestedSkills: ["leadership", "strategy", "hiring", "p&l", "okrs", "stakeholder management", "budgeting", "operations", "agile", "scrum"],
    profileExtras: [
      { key: "linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/you", type: "url" },
      { key: "methodologies", label: "Core methodologies", placeholder: "Agile, Lean, OKRs, P&L" },
      { key: "industries", label: "Industries", placeholder: "SaaS, Fintech, Retail" },
    ],
    experienceMeta: [
      { key: "reports", label: "Direct reports", placeholder: "8" },
      { key: "org_size", label: "Total org size (incl. indirect)", placeholder: "40 across 3 timezones" },
      { key: "budget", label: "Budget / P&L owned", placeholder: "$2M opex / $10M ARR" },
      { key: "scope", label: "Scope", placeholder: "Global, Regional, US-only" },
    ],
    experienceSectionLabel: "Leadership experience",
    cvSectionLabels: { experience: "Leadership Experience", skills: "Core Competencies", education: "Education" },
    achievementsHint: "Headcount grown, revenue/cost moved, programs launched.",
    toneHint: "Outcome-focused, business language.",
  },
  {
    id: "engineering",
    label: "Engineering",
    blurb: "Mechanical, civil, electrical, chemical.",
    icon: Wrench,
    suggestedSkills: ["autocad", "solidworks", "matlab", "fea", "project management", "iso 9001", "lean", "six sigma"],
    profileExtras: [
      { key: "pe_license", label: "PE / Chartered license", placeholder: "PE — CA #12345" },
      { key: "disciplines", label: "Disciplines", placeholder: "Mechanical, HVAC" },
      { key: "linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/you", type: "url" },
    ],
    experienceMeta: [
      { key: "discipline", label: "Discipline", placeholder: "Mechanical" },
      { key: "project_scale", label: "Project scale / value", placeholder: "$5M, 18-month build" },
      { key: "standards", label: "Codes / standards", placeholder: "ASME, ISO 9001" },
    ],
    experienceSectionLabel: "Engineering experience",
    cvSectionLabels: { experience: "Professional Experience", skills: "Engineering Skills", education: "Education" },
    achievementsHint: "Projects shipped, specs met, safety/quality wins.",
    toneHint: "Formal, project-centric, precise.",
  },
  {
    id: "aviation",
    label: "Aviation",
    blurb: "Pilots, cabin crew, ATC, maintenance.",
    icon: Plane,
    suggestedSkills: ["atpl", "cpl", "crm", "icao english", "type rating", "ifr", "vfr", "safety management"],
    profileExtras: [
      { key: "license_class", label: "Pilot license class", placeholder: "ATPL / CPL / PPL" },
      { key: "license_authority", label: "Issuing authority", placeholder: "FAA / EASA / DGCA" },
      { key: "license_number", label: "License number", placeholder: "ATP-12345" },
      { key: "total_hours", label: "Total flight hours", placeholder: "3,500", type: "number" },
      { key: "type_ratings", label: "Type ratings", placeholder: "A320, B737-800" },
      { key: "medical_class", label: "Medical class", placeholder: "Class 1 — valid through 2027" },
    ],
    experienceMeta: [
      { key: "hours_logged", label: "Hours logged at this employer", placeholder: "1,200" },
      { key: "aircraft", label: "Aircraft flown", placeholder: "A320" },
      { key: "role_detail", label: "Role detail", placeholder: "First Officer / Captain" },
      { key: "routes", label: "Routes / regions", placeholder: "Domestic, EU short-haul" },
    ],
    experienceSectionLabel: "Flight experience",
    cvSectionLabels: { experience: "Flight Experience", skills: "Certifications & Ratings", education: "Training & Education" },
    achievementsHint: "Hours flown, type ratings, safety record, command time.",
    toneHint: "Formal, regulator-friendly, no jargon-free fluff.",
  },
  {
    id: "medicine",
    label: "Medicine / Healthcare",
    blurb: "Clinicians, nurses, researchers.",
    icon: Stethoscope,
    suggestedSkills: ["patient care", "ehr", "bls", "acls", "clinical research", "differential diagnosis", "hipaa"],
    profileExtras: [
      { key: "license_numbers", label: "Medical license #(s)", placeholder: "NY MD-12345; NJ MD-67890" },
      { key: "board_certs", label: "Board certifications", placeholder: "ABIM — Internal Medicine (2024)" },
      { key: "specialty", label: "Primary specialty", placeholder: "Internal Medicine" },
      { key: "npi", label: "NPI", placeholder: "1234567890" },
      { key: "dea", label: "DEA #", placeholder: "AB1234567" },
    ],
    experienceMeta: [
      { key: "rotation", label: "Rotation / unit", placeholder: "MICU, Cardiology consult" },
      { key: "residency_pgy", label: "Residency PGY", placeholder: "PGY-3" },
      { key: "patient_volume", label: "Patient volume", placeholder: "~30/day" },
      { key: "procedures", label: "Key procedures", placeholder: "Central line, intubation, LP" },
    ],
    experienceSectionLabel: "Clinical experience",
    cvSectionLabels: { experience: "Clinical Experience", skills: "Clinical Skills & Certifications", education: "Education & Training" },
    achievementsHint: "Patient outcomes, procedures performed, research published.",
    toneHint: "Formal CV style suitable for licensure and credentialing.",
  },
  {
    id: "finance",
    label: "Finance",
    blurb: "Banking, accounting, investing.",
    icon: DollarSign,
    suggestedSkills: ["financial modeling", "valuation", "excel", "vba", "dcf", "bloomberg", "ifrs", "gaap", "risk"],
    profileExtras: [
      { key: "certs", label: "Certifications", placeholder: "CFA L3, Series 7, CPA" },
      { key: "linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/you", type: "url" },
      { key: "specialties", label: "Specialties", placeholder: "M&A, FP&A, Equity Research" },
    ],
    experienceMeta: [
      { key: "aum", label: "AUM / deal size", placeholder: "$500M / $50M deal" },
      { key: "asset_class", label: "Asset class / sector", placeholder: "Tech equities, EM credit" },
      { key: "team_size", label: "Team size", placeholder: "6-person desk" },
    ],
    experienceSectionLabel: "Finance experience",
    cvSectionLabels: { experience: "Professional Experience", skills: "Technical Skills", education: "Education" },
    achievementsHint: "Deals closed, returns delivered, accuracy of models.",
    toneHint: "Numbers-first, conservative tone.",
  },
  {
    id: "design",
    label: "Design",
    blurb: "Product, brand, motion, UX.",
    icon: Palette,
    suggestedSkills: ["figma", "ux research", "prototyping", "design systems", "illustration", "motion", "user testing"],
    profileExtras: [
      { key: "portfolio", label: "Portfolio URL", placeholder: "https://", type: "url" },
      { key: "behance", label: "Behance / Dribbble", placeholder: "https://", type: "url" },
      { key: "primary_tools", label: "Primary tools", placeholder: "Figma, After Effects" },
    ],
    experienceMeta: [
      { key: "scope", label: "Scope", placeholder: "End-to-end product, brand sprint" },
      { key: "shipped_link", label: "Shipped work link", placeholder: "https://", type: "url" },
      { key: "collaborators", label: "Cross-functional team", placeholder: "2 PMs, 4 eng, 1 researcher" },
    ],
    experienceSectionLabel: "Design experience",
    cvSectionLabels: { experience: "Selected Work", skills: "Tools & Methods", education: "Education" },
    achievementsHint: "Shipped products, design system adoption, research impact.",
    toneHint: "Crisp, portfolio-aware, no buzzwords.",
  },
  {
    id: "education",
    label: "Education",
    blurb: "Teaching, research, academia.",
    icon: GraduationCap,
    suggestedSkills: ["curriculum design", "lecturing", "assessment", "lms", "research", "grant writing", "mentoring"],
    profileExtras: [
      { key: "teaching_license", label: "Teaching license / credential", placeholder: "NY State Cert #12345" },
      { key: "subjects", label: "Subjects of expertise", placeholder: "AP Calculus, Statistics" },
      { key: "orcid", label: "ORCID iD", placeholder: "0000-0000-0000-0000" },
    ],
    experienceMeta: [
      { key: "grade_level", label: "Grade level / cohort", placeholder: "HS Junior, PhD students" },
      { key: "students", label: "Student load", placeholder: "120 students" },
      { key: "courses", label: "Courses / programs", placeholder: "AP Calc, Linear Algebra" },
    ],
    experienceSectionLabel: "Teaching experience",
    cvSectionLabels: { experience: "Teaching & Research Experience", skills: "Areas of Expertise", education: "Education" },
    achievementsHint: "Student outcomes, programs designed, publications.",
    toneHint: "Academic, references publications and outcomes.",
  },
  {
    id: "other",
    label: "Other",
    blurb: "Doesn't fit a bucket above — tell us.",
    icon: MoreHorizontal,
    suggestedSkills: [],
    profileExtras: [
      { key: "linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/you", type: "url" },
      { key: "industry", label: "Industry / field", placeholder: "Logistics, hospitality, etc." },
    ],
    experienceMeta: [
      { key: "context", label: "Industry / context", placeholder: "Logistics, hospitality, etc." },
    ],
    experienceSectionLabel: "Work experience",
    cvSectionLabels: { experience: "Experience", skills: "Skills", education: "Education" },
    achievementsHint: "Quantify impact wherever possible.",
    toneHint: "Professional, neutral, ATS-friendly.",
  },
];

export const DOMAIN_BY_ID: Record<CareerDomainId, CareerDomain> = CAREER_DOMAINS.reduce((m, d) => {
  m[d.id] = d;
  return m;
}, {} as Record<CareerDomainId, CareerDomain>);

export function getDomain(id: CareerDomainId | undefined | null): CareerDomain {
  return (id && DOMAIN_BY_ID[id]) || DOMAIN_BY_ID.other;
}

export const EMPLOYMENT_TYPES = [
  { id: "full_time", label: "Full-time" },
  { id: "internship", label: "Internship" },
  { id: "trainee", label: "Trainee / Apprenticeship" },
  { id: "contract", label: "Contract" },
  { id: "freelance", label: "Freelance" },
  { id: "part_time", label: "Part-time" },
  { id: "volunteer", label: "Volunteer" },
  { id: "executive", label: "Executive / C-suite" },
] as const;

export type EmploymentType = typeof EMPLOYMENT_TYPES[number]["id"];
