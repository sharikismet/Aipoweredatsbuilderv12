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
  { id: "j1", title: "Software Engineering Intern", company: "Northwind Labs", location: "Remote", level: "fresh_grad", skills: ["javascript", "react", "git"], description: "Summer 2026 internship working on developer tooling." },
  { id: "j2", title: "Junior Frontend Engineer", company: "Mosaic", location: "Berlin", level: "fresh_grad", skills: ["react", "typescript", "css"], description: "Entry-level role building marketing surfaces." },
  { id: "j3", title: "Associate Product Designer", company: "Field & Co", location: "Remote (EU)", level: "experienced_undergrad", skills: ["figma", "ux", "prototyping"], description: "Part-time friendly, ships every two weeks." },
  { id: "j4", title: "Mid-level Backend Engineer", company: "Tetra", location: "NYC", level: "mid_level", skills: ["go", "postgres", "kubernetes"], description: "Own a service end-to-end." },
  { id: "j5", title: "Senior Platform Engineer", company: "Glassline", location: "Remote (US)", level: "senior", skills: ["aws", "terraform", "ci/cd"], description: "Lead platform reliability." },
  { id: "j6", title: "Head of Engineering", company: "Cardinal AI", location: "SF", level: "executive", skills: ["leadership", "hiring", "strategy"], description: "Run a 40-person org." },
  { id: "j7", title: "Product Manager, Growth", company: "Brushfire", location: "Remote", level: "mid_level", skills: ["product", "analytics", "experimentation"], description: "Drive activation experiments." },
  { id: "j8", title: "VP of Marketing", company: "Lattice & Loom", location: "London", level: "executive", skills: ["leadership", "brand", "demand gen"], description: "Build the marketing function." },
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
  const scored = SEED_JOBS
    .filter((j) => eligible.has(j.level))
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
    const { jobTitle, company, location, description } = await c.req.json();
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

async function generateWithClaude(resume: any, job: any, domainId: string, tier: string, customCareerLabel?: string | null): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const systemPrompt = buildResumeSystemPrompt(resume, job, domainId, tier, customCareerLabel);

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

Deno.serve(app.fetch);
