import { Code2, Briefcase, Wrench, Plane, Stethoscope, DollarSign, Palette, GraduationCap, MoreHorizontal, LucideIcon } from "lucide-react";

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

export interface ExperienceMetaField {
  key: string;
  label: string;
  placeholder?: string;
}

export interface CareerDomain {
  id: CareerDomainId;
  label: string;
  blurb: string;
  icon: LucideIcon;
  suggestedSkills: string[];
  experienceMeta: ExperienceMetaField[];
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
    experienceMeta: [
      { key: "stack", label: "Tech stack", placeholder: "React, Node, Postgres" },
      { key: "team_size", label: "Team size", placeholder: "5 engineers" },
    ],
    experienceSectionLabel: "Engineering experience",
    cvSectionLabels: { experience: "Experience", skills: "Technical Skills", education: "Education" },
    achievementsHint: "Quantify impact — latency cut, throughput, users shipped to.",
    toneHint: "Concise, metrics-driven, no marketing fluff.",
  },
  {
    id: "management",
    label: "Management",
    blurb: "People leadership, ops, strategy.",
    icon: Briefcase,
    suggestedSkills: ["leadership", "strategy", "hiring", "p&l", "okrs", "stakeholder management", "budgeting", "operations"],
    experienceMeta: [
      { key: "reports", label: "Direct reports", placeholder: "8" },
      { key: "budget", label: "Budget owned", placeholder: "$2M" },
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
    experienceMeta: [
      { key: "discipline", label: "Discipline", placeholder: "Mechanical" },
      { key: "license", label: "License / PE", placeholder: "PE — CA #12345" },
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
    experienceMeta: [
      { key: "flight_hours", label: "Total flight hours", placeholder: "3,500" },
      { key: "aircraft", label: "Aircraft / type ratings", placeholder: "A320, B737-800" },
      { key: "license", label: "License", placeholder: "ATPL — FAA" },
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
    experienceMeta: [
      { key: "specialty", label: "Specialty", placeholder: "Internal Medicine" },
      { key: "license", label: "License #", placeholder: "MD-12345 (NY)" },
      { key: "patient_volume", label: "Patient volume", placeholder: "~30/day" },
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
    experienceMeta: [
      { key: "aum", label: "AUM / deal size", placeholder: "$500M" },
      { key: "certs", label: "Certifications", placeholder: "CFA L3, Series 7" },
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
    experienceMeta: [
      { key: "portfolio", label: "Portfolio URL", placeholder: "https://" },
      { key: "tools", label: "Primary tools", placeholder: "Figma, After Effects" },
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
    experienceMeta: [
      { key: "subjects", label: "Subjects / courses", placeholder: "AP Calculus, Statistics" },
      { key: "students", label: "Student load", placeholder: "120 students" },
    ],
    experienceSectionLabel: "Teaching experience",
    cvSectionLabels: { experience: "Teaching & Research Experience", skills: "Areas of Expertise", education: "Education" },
    achievementsHint: "Student outcomes, programs designed, publications.",
    toneHint: "Academic, references publications and outcomes.",
  },
  {
    id: "other",
    label: "Other",
    blurb: "Doesn't fit a bucket above.",
    icon: MoreHorizontal,
    suggestedSkills: [],
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
