import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { buildResumeSystemPrompt } from "./resumePrompt.tsx";

const app = new Hono();
app.use("*", logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

const PREFIX = "/make-server-72d8818c";

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function authUser(c: any): Promise<{ id: string; email?: string } | null> {
  const token = c.req.header("Authorization")?.split(" ")[1];
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email ?? undefined };
}

type CareerTier = "fresh_grad" | "experienced_undergrad" | "mid_level" | "senior" | "executive";

function classifyTier(input: any): CareerTier {
  const exp = Array.isArray(input?.experience) ? input.experience : [];
  const edu = Array.isArray(input?.education) ? input.education : [];
  const now = new Date().getFullYear();
  let years = 0;
  for (const e of exp) {
    const s = parseInt(e.startYear || `${now}`, 10);
    const en = e.current || !e.endYear ? now : parseInt(e.endYear, 10);
    if (!isNaN(s) && !isNaN(en)) years += Math.max(0, en - s);
  }
  const hasExp = exp.length > 0 && years > 0;
  const completed = edu.some((e: any) => e.status === "completed");
  const ongoing = edu.some((e: any) => e.status === "ongoing");
  const leadership = !!input?.heldLeadershipRole;
  if (years > 10 && completed && leadership) return "executive";
  if (years > 5 && completed) return "senior";
  if (hasExp && ongoing) return "experienced_undergrad";
  if (years >= 1 && years <= 5 && completed) return "mid_level";
  return "fresh_grad";
}

app.get(`${PREFIX}/health`, (c) => c.json({ status: "ok" }));

app.post(`${PREFIX}/signup`, async (c) => {
  try {
    const { email, password, full_name } = await c.req.json();
    if (!email || !password) return c.json({ error: "email and password required" }, 400);
    const { data, error } = await admin().auth.admin.createUser({
      email,
      password,
      user_metadata: { full_name: full_name ?? "" },
      // Auto-confirm email since no email server is configured in this environment
      email_confirm: true,
    });
    if (error) {
      console.log("signup error:", error.message);
      // Check if this is a duplicate email error
      if (error.message?.toLowerCase().includes("already been registered") ||
          error.message?.toLowerCase().includes("already exists")) {
        return c.json({ error: "ALREADY_REGISTERED", message: "This email is already registered. Please sign in instead." }, 409);
      }
      return c.json({ error: `Signup failed: ${error.message}` }, 400);
    }
    const profile = {
      id: data.user!.id,
      email,
      full_name: full_name ?? "",
      current_tier: "fresh_grad",
      subscription_tier: "free",
      credits_remaining: 3,
      onboarded: false,
      career_domain: null,
      created_at: new Date().toISOString(),
    };
    await kv.set(`profile:${data.user!.id}`, profile);
    return c.json({ user: data.user, profile });
  } catch (e) {
    console.log("signup exception:", e);
    return c.json({ error: `Signup exception: ${String(e)}` }, 500);
  }
});

app.get(`${PREFIX}/profile`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  let profile = await kv.get(`profile:${u.id}`);
  if (!profile) {
    profile = {
      id: u.id,
      email: u.email ?? "",
      full_name: "",
      current_tier: "fresh_grad",
      subscription_tier: "free",
      credits_remaining: 3,
      onboarded: false,
      career_domain: null,
      created_at: new Date().toISOString(),
    };
    await kv.set(`profile:${u.id}`, profile);
  } else if (profile.subscription_tier === "free" && (profile.credits_remaining ?? 0) === 0 && !profile.free_trial_granted) {
    profile.credits_remaining = 3;
    profile.free_trial_granted = true;
    await kv.set(`profile:${u.id}`, profile);
  }
  return c.json({ profile });
});

app.put(`${PREFIX}/profile`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  try {
    const patch = await c.req.json();
    const existing = (await kv.get(`profile:${u.id}`)) ?? {};
    const next = { ...existing, ...patch, id: u.id, email: u.email ?? existing.email ?? "" };
    await kv.set(`profile:${u.id}`, next);
    return c.json({ profile: next });
  } catch (e) {
    return c.json({ error: `Profile update failed during PUT /profile: ${String(e)}` }, 500);
  }
});

app.put(`${PREFIX}/resume`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  try {
    const body = await c.req.json();
    const resume = {
      profile_id: u.id,
      contact_info: body.contact_info ?? {},
      education: body.education ?? [],
      experience: body.experience ?? [],
      skills: body.skills ?? [],
      heldLeadershipRole: !!body.heldLeadershipRole,
      raw_markdown_cv: body.raw_markdown_cv ?? "",
      updated_at: new Date().toISOString(),
    };
    await kv.set(`resume:${u.id}`, resume);
    const tier = classifyTier(resume);
    const profile = (await kv.get(`profile:${u.id}`)) ?? {};
    profile.current_tier = tier;
    profile.onboarded = true;
    if (body.contact_info?.full_name) profile.full_name = body.contact_info.full_name;
    await kv.set(`profile:${u.id}`, profile);
    return c.json({ resume, tier, profile });
  } catch (e) {
    console.log("resume save error:", e);
    return c.json({ error: `Resume save failed: ${String(e)}` }, 500);
  }
});

app.get(`${PREFIX}/resume`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  const resume = await kv.get(`resume:${u.id}`);
  return c.json({ resume: resume ?? null });
});

app.put(`${PREFIX}/career`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { career_domain, custom_career_label } = await c.req.json();
    if (!career_domain) return c.json({ error: "career_domain required" }, 400);
    const profile = (await kv.get(`profile:${u.id}`)) ?? {};
    profile.career_domain = career_domain;
    profile.custom_career_label = career_domain === "other" ? (custom_career_label ?? null) : null;
    await kv.set(`profile:${u.id}`, profile);
    if (career_domain === "other" && custom_career_label) {
      await kv.set(`custom_career_request:${u.id}:${Date.now()}`, { user_id: u.id, label: custom_career_label, created_at: new Date().toISOString() });
    }
    return c.json({ profile });
  } catch (e) {
    return c.json({ error: `Career save failed: ${String(e)}` }, 500);
  }
});

app.post(`${PREFIX}/subscribe`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { plan } = await c.req.json();
    const credits = plan === "aggressive" ? 9999 : plan === "job_hunter" ? 10 : 3;
    const profile = (await kv.get(`profile:${u.id}`)) ?? {};
    profile.subscription_tier = plan;
    profile.credits_remaining = credits;
    profile.subscribed_at = new Date().toISOString();
    await kv.set(`profile:${u.id}`, profile);
    return c.json({ profile });
  } catch (e) {
    return c.json({ error: `Subscribe failed: ${String(e)}` }, 500);
  }
});

const SEED_JOBS = [
  // software
  { id: "j1", domain: "software", title: "Software Engineering Intern", company: "Northwind Labs", location: "Remote", level: "fresh_grad", skills: ["javascript", "react", "git"], description: "Summer 2026 internship working on developer tooling." },
  { id: "j2", domain: "software", title: "Junior Frontend Engineer", company: "Mosaic", location: "Berlin", level: "fresh_grad", skills: ["react", "typescript", "css"], description: "Entry-level role building marketing surfaces." },
  { id: "j4", domain: "software", title: "Mid-level Backend Engineer", company: "Tetra", location: "NYC", level: "mid_level", skills: ["go", "postgres", "kubernetes"], description: "Own a service end-to-end." },
  { id: "j5", domain: "software", title: "Senior Platform Engineer", company: "Glassline", location: "Remote (US)", level: "senior", skills: ["aws", "terraform", "ci/cd"], description: "Lead platform reliability." },
  { id: "j6", domain: "software", title: "Head of Engineering", company: "Cardinal AI", location: "SF", level: "executive", skills: ["leadership", "hiring", "strategy"], description: "Run a 40-person org." },
  // management
  { id: "j7", domain: "management", title: "Operations Coordinator", company: "Brushfire", location: "Remote", level: "fresh_grad", skills: ["operations", "excel", "communication"], description: "Support an ops team with reporting and vendor coordination." },
  { id: "j8", domain: "management", title: "Product Manager, Growth", company: "Trellis", location: "Remote", level: "mid_level", skills: ["product", "analytics", "experimentation"], description: "Drive activation experiments." },
  { id: "j9", domain: "management", title: "Senior Program Manager", company: "Beacon Labs", location: "Austin", level: "senior", skills: ["program management", "stakeholder mgmt", "roadmapping"], description: "Run multi-team initiatives end-to-end." },
  { id: "j10", domain: "management", title: "VP of Marketing", company: "Lattice & Loom", location: "London", level: "executive", skills: ["leadership", "brand", "demand gen"], description: "Build the marketing function." },
  { id: "j11", domain: "management", title: "Director of Operations", company: "Northgate Group", location: "Chicago", level: "executive", skills: ["leadership", "p&l", "process design"], description: "Own operations across three business units." },
  // engineering (non-software)
  { id: "j12", domain: "engineering", title: "Junior Mechanical Engineer", company: "Helix Works", location: "Detroit", level: "fresh_grad", skills: ["solidworks", "cad", "manufacturing"], description: "Support product design in an automotive supplier." },
  { id: "j13", domain: "engineering", title: "Senior Civil Engineer", company: "Bridgeline", location: "Remote (US)", level: "senior", skills: ["structural", "autocad", "permitting"], description: "Lead bridge & highway design projects." },
  // medicine
  { id: "j14", domain: "medicine", title: "Resident Physician — Internal Medicine", company: "Mercy Health", location: "Boston", level: "fresh_grad", skills: ["clinical", "patient care", "EMR"], description: "Residency program for newly graduated MDs." },
  { id: "j15", domain: "medicine", title: "Attending Physician", company: "Riverside Hospital", location: "Denver", level: "senior", skills: ["clinical", "diagnosis", "leadership"], description: "Attending role with teaching responsibilities." },
  // aviation
  { id: "j16", domain: "aviation", title: "First Officer — A320", company: "BlueArc Airways", location: "Dubai", level: "mid_level", skills: ["A320", "ATPL", "CRM"], description: "Right seat on short-haul A320 operations." },
  { id: "j17", domain: "aviation", title: "Captain — B737", company: "Northwind Air", location: "Singapore", level: "senior", skills: ["B737", "command", "type rating"], description: "Command position for experienced 737 pilots." },
  // finance
  { id: "j18", domain: "finance", title: "Financial Analyst", company: "Highmark Capital", location: "NYC", level: "fresh_grad", skills: ["excel", "modelling", "valuation"], description: "Entry analyst on the equities desk." },
  { id: "j19", domain: "finance", title: "Senior Investment Manager", company: "Cornerstone Wealth", location: "London", level: "senior", skills: ["portfolio mgmt", "risk", "client advisory"], description: "Manage HNW client portfolios." },
  // design
  { id: "j20", domain: "design", title: "Associate Product Designer", company: "Field & Co", location: "Remote (EU)", level: "experienced_undergrad", skills: ["figma", "ux", "prototyping"], description: "Part-time friendly, ships every two weeks." },
  { id: "j21", domain: "design", title: "Senior Product Designer", company: "Loomwork", location: "Remote", level: "senior", skills: ["figma", "design systems", "research"], description: "Own end-to-end design for a B2B SaaS surface." },
  // education
  { id: "j22", domain: "education", title: "Classroom Teacher", company: "Lakeside School", location: "Seattle", level: "fresh_grad", skills: ["pedagogy", "lesson planning", "classroom mgmt"], description: "K-12 teacher position." },
  { id: "j23", domain: "education", title: "Head of Department", company: "Crescent Academy", location: "Dubai", level: "senior", skills: ["curriculum", "leadership", "mentorship"], description: "Lead an academic department." },
];

app.get(`${PREFIX}/jobs`, (c) => c.json({ jobs: SEED_JOBS }));

app.get(`${PREFIX}/matches`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  const resume = (await kv.get(`resume:${u.id}`)) ?? {};
  const profile = (await kv.get(`profile:${u.id}`)) ?? {};
  const tier = profile.current_tier ?? "fresh_grad";
  const userSkills = new Set((resume.skills ?? []).map((s: string) => s.toLowerCase()));
  const ladder: Record<string, string[]> = {
    fresh_grad: ["fresh_grad"],
    experienced_undergrad: ["fresh_grad", "experienced_undergrad", "mid_level"],
    mid_level: ["mid_level"],
    senior: ["mid_level", "senior"],
    executive: ["senior", "executive"],
  };
  const eligible = new Set(ladder[tier] ?? ["fresh_grad"]);
  const domain = profile.career_domain ?? null;
  const scored = SEED_JOBS
    .filter((j) => eligible.has(j.level))
    .filter((j) => !domain || domain === "other" || j.domain === domain)
    .map((j) => {
      const overlap = j.skills.filter((s) => userSkills.has(s.toLowerCase())).length;
      const score = Math.round(((overlap / Math.max(1, j.skills.length)) * 0.7 + 0.3) * 100);
      return { ...j, score, overlap };
    })
    .sort((a, b) => b.score - a.score);
  return c.json({ matches: scored });
});

app.post(`${PREFIX}/tailor`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { jobId } = await c.req.json();
    const profile = (await kv.get(`profile:${u.id}`)) ?? {};
    const resume = (await kv.get(`resume:${u.id}`)) ?? {};
    if (!resume?.profile_id) return c.json({ error: "Complete onboarding before tailoring" }, 400);
    if ((profile.credits_remaining ?? 0) <= 0 && profile.subscription_tier !== "aggressive") {
      return c.json({ error: "No tailoring credits remaining. Upgrade your plan." }, 402);
    }
    const job = SEED_JOBS.find((j) => j.id === jobId);
    if (!job) return c.json({ error: "Job not found" }, 404);
    let md: string;
    let generated_by: "ai" | "template" = "template";
    try {
      md = await generateWithClaude(
        resume,
        job,
        profile.career_domain ?? "other",
        profile.current_tier ?? "fresh_grad",
        profile.custom_career_label,
      );
      generated_by = "ai";
    } catch (aiErr) {
      console.log("Claude generation failed, falling back to template:", aiErr);
      md = renderTailoredMarkdown(resume, job);
    }
    const id = crypto.randomUUID();
    const tailored = { id, profile_id: u.id, job_id: jobId, job_title: job.title, company: job.company, markdown: md, generated_by, created_at: new Date().toISOString() };
    await kv.set(`tailored:${u.id}:${id}`, tailored);
    if (profile.subscription_tier !== "aggressive") {
      profile.credits_remaining = Math.max(0, (profile.credits_remaining ?? 0) - 1);
      await kv.set(`profile:${u.id}`, profile);
    }
    return c.json({ tailored, profile });
  } catch (e) {
    console.log("tailor error:", e);
    return c.json({ error: `Tailoring failed: ${String(e)}` }, 500);
  }
});

app.get(`${PREFIX}/tailored`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  const items = await kv.getByPrefix(`tailored:${u.id}:`);
  return c.json({ tailored: items });
});

app.delete(`${PREFIX}/tailored/:id`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  try {
    const id = c.req.param("id");
    const key = `tailored:${u.id}:${id}`;
    const existing = await kv.get(key);
    if (!existing) return c.json({ error: "Tailored CV not found" }, 404);
    await kv.del(key);
    return c.json({ ok: true, id });
  } catch (e) {
    console.log("delete tailored error:", e);
    return c.json({ error: `Delete failed: ${String(e)}` }, 500);
  }
});

app.post(`${PREFIX}/tailor-custom`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { jobTitle, company, location, description, template } = await c.req.json();
    if (!description || description.trim().length < 30) {
      return c.json({ error: "Paste a real job description (min 30 chars)." }, 400);
    }
    const profile = (await kv.get(`profile:${u.id}`)) ?? {};
    const resume = (await kv.get(`resume:${u.id}`)) ?? {};
    if (!resume?.profile_id) return c.json({ error: "Complete onboarding before tailoring" }, 400);
    if ((profile.credits_remaining ?? 0) <= 0 && profile.subscription_tier !== "aggressive") {
      return c.json({ error: "No tailoring credits remaining. Upgrade your plan." }, 402);
    }
    const job = {
      id: `custom-${Date.now()}`,
      title: jobTitle?.trim() || "Target Role",
      company: company?.trim() || "Target Company",
      location: location?.trim() || "—",
      level: profile.current_tier ?? "fresh_grad",
      skills: [],
      description,
    };
    let md: string;
    let generated_by: "ai" | "template" = "template";
    try {
      md = await generateWithClaude(
        resume,
        job,
        profile.career_domain ?? "other",
        profile.current_tier ?? "fresh_grad",
        profile.custom_career_label,
        template,
      );
      generated_by = "ai";
    } catch (aiErr) {
      console.log("Claude generation failed for custom JD, falling back:", aiErr);
      md = renderTailoredMarkdown(resume, job);
    }
    const id = crypto.randomUUID();
    const tailored = {
      id,
      profile_id: u.id,
      job_id: job.id,
      job_title: job.title,
      company: job.company,
      markdown: md,
      generated_by,
      created_at: new Date().toISOString(),
    };
    await kv.set(`tailored:${u.id}:${id}`, tailored);
    if (profile.subscription_tier !== "aggressive") {
      profile.credits_remaining = Math.max(0, (profile.credits_remaining ?? 0) - 1);
      await kv.set(`profile:${u.id}`, profile);
    }
    return c.json({ tailored, profile });
  } catch (e) {
    console.log("tailor-custom error:", e);
    return c.json({ error: `Tailoring failed: ${String(e)}` }, 500);
  }
});

function renderTailoredMarkdown(resume: any, job: any): string {
  const name = resume?.contact_info?.full_name ?? "Candidate";
  const email = resume?.contact_info?.email ?? "";
  const phone = resume?.contact_info?.phone ?? "";
  const location = resume?.contact_info?.location ?? "";
  const skills = (resume?.skills ?? []).join(", ");
  const eduMd = (resume?.education ?? []).map((e: any) =>
    `- **${e.degree ?? ""}**, ${e.school ?? ""} (${e.status ?? ""}${e.endYear ? `, ${e.endYear}` : ""})`
  ).join("\n");
  const expMd = (resume?.experience ?? []).map((x: any) => {
    const bullets = (x.bullets ?? []).map((b: string) => `  - ${b}`).join("\n");
    return `- **${x.role ?? ""}**, ${x.company ?? ""} (${x.startYear ?? ""}–${x.current ? "Present" : x.endYear ?? ""})\n${bullets}`;
  }).join("\n");
  return `# ${name}\n${[location, email, phone].filter(Boolean).join(" · ")}\n\n> Tailored for **${job.title}** at **${job.company}** — ${job.location}\n\n## Summary\nProven candidate aligned to the ${job.title} role at ${job.company}. Strengths in ${job.skills.slice(0, 3).join(", ")}.\n\n## Skills\n${skills}\n\n## Experience\n${expMd}\n\n## Education\n${eduMd}\n`;
}

async function generateWithClaude(resume: any, job: any, domainId: string, tier: string, customCareerLabel?: string | null, template?: string | null): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const templateGuide = template === "modern"
    ? "\n\nTEMPLATE STYLE: Modern — lead with a 'Profile' paragraph (3-4 lines), then 'Core Competencies' as a 3-column bullet grid, then Experience with strong action verbs, then Education and Skills."
    : template === "minimal"
    ? "\n\nTEMPLATE STYLE: Minimal — no summary paragraph, just contact line, then Experience (role | company | dates on one line, 2-4 tight bullets), then Education, then a single Skills line. No extra sections."
    : "\n\nTEMPLATE STYLE: Classic — Name, contact line, a 2-line Summary, Experience (chronological with CAR bullets), Education, Skills. Use clean ATS-friendly markdown.";

  const systemPrompt = buildResumeSystemPrompt(resume, job, domainId, tier, customCareerLabel) + templateGuide;

  const userPrompt = `# TARGET JOB
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Seniority: ${job.level}
Required skills: ${job.skills.join(", ")}
Description: ${job.description}

# CANDIDATE RESUME DATA
${JSON.stringify({
  contact: resume.contact_info,
  profile_extras: resume.contact_info?.extras ?? {},
  skills: resume.skills,
  education: resume.education,
  experience: resume.experience,
  leadership_experience: resume.heldLeadershipRole,
}, null, 2)}

Generate the tailored ATS-optimized resume now.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
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
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error(`Anthropic returned no text content: ${JSON.stringify(data).slice(0, 200)}`);
  return text;
}

// Generate a baseline ATS CV using only the user's profile + chosen domain
// (no specific job description). Used right after onboarding so the user
// always has at least one CV waiting on the dashboard.
app.post(`${PREFIX}/tailor-baseline`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  try {
    const body = await c.req.json().catch(() => ({}));
    const template = body?.template ?? "classic";
    const profile = (await kv.get(`profile:${u.id}`)) ?? {};
    const resume = (await kv.get(`resume:${u.id}`)) ?? {};
    if (!resume?.profile_id) return c.json({ error: "Complete onboarding before generating a CV" }, 400);

    const domainId = profile.career_domain ?? "other";
    const tier = profile.current_tier ?? "fresh_grad";
    const job = {
      id: `baseline-${Date.now()}`,
      title: profile.custom_career_label || `${tier.replace(/_/g, " ")} ${domainId} role`,
      company: "General application",
      location: resume?.contact_info?.location ?? "—",
      level: tier,
      skills: resume.skills ?? [],
      description: `Baseline general-purpose ATS resume for a ${tier.replace(/_/g, " ")} ${domainId} candidate. No specific job description — emphasize the candidate's strongest skills, achievements and career narrative so the CV is broadly applicable to ${domainId} roles at this seniority.`,
    };

    let md: string;
    let generated_by: "ai" | "template" = "template";
    try {
      md = await generateWithClaude(resume, job, domainId, tier, profile.custom_career_label, template);
      generated_by = "ai";
    } catch (aiErr) {
      console.log("Claude baseline failed, falling back:", aiErr);
      md = renderTailoredMarkdown(resume, job);
    }

    const id = crypto.randomUUID();
    const tailored = {
      id,
      profile_id: u.id,
      job_id: job.id,
      job_title: "Baseline ATS Resume",
      company: "Your profile",
      markdown: md,
      generated_by,
      created_at: new Date().toISOString(),
      is_baseline: true,
    };
    await kv.set(`tailored:${u.id}:${id}`, tailored);
    // Baseline generation does NOT consume tailoring credits.
    return c.json({ tailored, profile });
  } catch (e) {
    console.log("tailor-baseline error:", e);
    return c.json({ error: `Baseline generation failed: ${String(e)}` }, 500);
  }
});

// ─── Admin ───────────────────────────────────────────────────────────────────
// Admin access is granted via the ADMIN_EMAILS env var (comma-separated) OR
// any profile with `is_admin: true`. To bootstrap the very first admin, you
// can set ADMIN_EMAILS in your Supabase project.
async function isAdmin(profile: any, email?: string): Promise<boolean> {
  if (profile?.is_admin) return true;
  const list = (Deno.env.get("ADMIN_EMAILS") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (email && list.includes(email.toLowerCase())) return true;
  // In prototype mode, if no admin list is configured, allow ANY authenticated
  // user to view admin data. Lock this down before going to production.
  if (list.length === 0 && !profile?.is_admin) return true;
  return false;
}

app.get(`${PREFIX}/admin/users`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  const me = (await kv.get(`profile:${u.id}`)) ?? {};
  if (!(await isAdmin(me, u.email))) return c.json({ error: "Forbidden" }, 403);
  const profiles = await kv.getByPrefix("profile:");
  const users = profiles.map((p: any) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    current_tier: p.current_tier,
    subscription_tier: p.subscription_tier,
    credits_remaining: p.credits_remaining,
    career_domain: p.career_domain,
    custom_career_label: p.custom_career_label ?? null,
    onboarded: p.onboarded,
    created_at: p.created_at,
  })).sort((a: any, b: any) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  return c.json({ users });
});

app.get(`${PREFIX}/admin/users/:id`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  const me = (await kv.get(`profile:${u.id}`)) ?? {};
  if (!(await isAdmin(me, u.email))) return c.json({ error: "Forbidden" }, 403);
  const id = c.req.param("id");
  const profile = await kv.get(`profile:${id}`);
  if (!profile) return c.json({ error: "User not found" }, 404);
  const resume = await kv.get(`resume:${id}`);
  const tailored = await kv.getByPrefix(`tailored:${id}:`);
  return c.json({ profile, resume, tailored });
});

Deno.serve(app.fetch);
