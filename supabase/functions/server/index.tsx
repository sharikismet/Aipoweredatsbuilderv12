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
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function authUser(c: any): Promise<{ id: string; email?: string } | null> {
  const token = c.req.header("Authorization")?.split(" ")[1];
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email ?? undefined };
}

app.post(`${PREFIX}/signup`, async (c) => {
  try {
    const { email, password, full_name } = await c.req.json();
    const { data, error } = await admin().auth.admin.createUser({ 
      email, 
      password, 
      user_metadata: { full_name: full_name ?? "" }, 
      email_confirm: true 
    });
    if (error) return c.json({ error: error.message }, 400);
    const profile = { 
      id: data.user!.id, 
      email, 
      full_name: full_name ?? "", 
      current_tier: "fresh_grad", 
      subscription_tier: "free", 
      credits_remaining: 3, 
      onboarded: false, 
      career_domain: null, 
      created_at: new Date().toISOString() 
    };
    await kv.set(`profile:${data.user!.id}`, profile);
    return c.json({ user: data.user, profile });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

app.get(`${PREFIX}/profile`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  const profile = await kv.get(`profile:${u.id}`);
  return c.json({ profile });
});

app.put(`${PREFIX}/profile`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  const patch = await c.req.json();
  const existing = (await kv.get(`profile:${u.id}`)) ?? {};
  const next = { ...existing, ...patch, id: u.id };
  await kv.set(`profile:${u.id}`, next);
  return c.json({ profile: next });
});

app.put(`${PREFIX}/resume`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();
  const resume = { 
    profile_id: u.id, 
    contact_info: body.contact_info ?? {}, 
    summary: body.summary ?? "",
    education: body.education ?? [], 
    experience: body.experience ?? [], 
    skills: body.skills ?? [] 
  };
  await kv.set(`resume:${u.id}`, resume);
  const profile = (await kv.get(`profile:${u.id}`)) ?? {};
  profile.onboarded = true;
  await kv.set(`profile:${u.id}`, profile);
  return c.json({ resume, profile, tier: profile.current_tier });
});

app.get(`${PREFIX}/resume`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  const resume = await kv.get(`resume:${u.id}`);
  return c.json({ resume: resume ?? null });
});

app.post(`${PREFIX}/subscribe`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  const { plan } = await c.req.json();
  const credits = plan === "aggressive" ? 9999 : plan === "job_hunter" ? 100 : 3;
  const profile = (await kv.get(`profile:${u.id}`)) ?? {};
  profile.subscription_tier = plan;
  profile.credits_remaining = credits;
  await kv.set(`profile:${u.id}`, profile);
  return c.json({ profile });
});

// ============================================================================
// DEDICATED AI WRITER ENDPOINT (5-Line Summary & Rough Note Enhancer)
// ============================================================================
app.post(`${PREFIX}/ai-writer`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { prompt, type } = await c.req.json();
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured.");

    let systemInstruction = "You are an expert ATS resume writer.";
    
    if (type === "bullets") {
      systemInstruction += " The user will give you their rough notes about a job role. Transform their raw notes into 3-4 professional, impact-driven bullet points starting with strong action verbs. Do not use Markdown formatting other than standard bullet points (-). Do not include any conversational text.";
    } else if (type === "summary") {
      systemInstruction += " Write a highly compelling, comprehensive 5-sentence professional summary based on the provided candidate details. You MUST ensure the summary is exactly 5 lines long and deeply detailed. Do not use introductory phrases like 'Here is your summary'.";
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 }
      })
    });

    if (!res.ok) throw new Error("Gemini API error");
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return c.json({ result: text.trim() });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// ============================================================================
// FULL CV GENERATOR & FALLBACK COMPILER
// ============================================================================
async function generateWithGemini(resume: any, job: any, domainId: string, tier: string, customCareerLabel?: string | null, template?: string | null): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured in Supabase Secrets.");

  const templateGuide = template === "modern" ? "\nTEMPLATE STYLE: Modern" : "\nTEMPLATE STYLE: Classic";
  const systemPrompt = buildResumeSystemPrompt(resume, job, domainId, tier, customCareerLabel) + templateGuide;
  const userPrompt = `# TARGET JOB\nTitle: ${job.title}\nCompany: ${job.company}\nRequired skills: ${job.skills.join(", ")}\nDescription: ${job.description}\n\n# CANDIDATE RESUME DATA\n${JSON.stringify({ contact: resume.contact_info, summary: resume.summary, skills: resume.skills, education: resume.education, experience: resume.experience }, null, 2)}\n\nGenerate the tailored ATS-optimized resume markdown now. Do not wrap output in markdown fences.`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.7 }
    })
  });

  if (!res.ok) throw new Error(`Gemini API error: ${await res.text()}`);
  const data = await res.json();
  let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return text.replace(/^```(markdown)?\n?/i, "").replace(/\n```$/, "");
}

function renderTailoredMarkdown(resume: any, job: any, template: string = 'classic'): string {
  const name = resume?.contact_info?.full_name || "Candidate";
  const email = resume?.contact_info?.email || "";
  const phone = resume?.contact_info?.phone || "";
  const location = resume?.contact_info?.location || "";
  const extras = resume?.contact_info?.extras || {};

  const contactLine = [location, email, phone].filter(Boolean).join(" · ");
  const extraLine = Object.entries(extras).filter(([_, v]) => v).map(([k, v]) => `**${k.toUpperCase()}**: ${v}`).join(" | ");

  let summary = resume?.summary || `Results-driven professional equipped with a robust background aligned to the **${job.title}** role.`;

  const skillsMd = (resume?.skills || []).join(", ");
  const expMd = (resume?.experience || []).map((x: any) => {
    const dates = `${x.startYear || ""} – ${x.current ? "Present" : (x.endYear || "")}`;
    const bulletsText = x.bullets && x.bullets.length > 0 ? x.bullets.map((b: string) => `- ${b}`).join("\n") : `- Delivered key outcomes within the ${x.role || "role"} position.`;
    return `### ${x.role || "Professional"}\n**${x.company || "Company"}** | ${dates}\n${bulletsText}`;
  }).join("\n\n");

  const eduMd = (resume?.education || []).map((e: any) => `**${e.degree || "Degree"}**\n${e.school || "Institution"}, ${e.status === 'ongoing' ? 'Expected' : 'Completed'} ${e.endYear || ""}`).join("\n\n");

  if (template === 'minimal') return `# ${name}\n${contactLine}\n${extraLine}\n\n## Experience\n${expMd}\n\n## Education\n${eduMd}\n\n## Skills\n${skillsMd}`;
  if (template === 'modern') return `# ${name}\n${contactLine}\n${extraLine}\n\n## Profile\n${summary}\n\n## Core Competencies\n${skillsMd}\n\n## Experience\n${expMd}\n\n## Education\n${eduMd}`;
  return `# ${name}\n${contactLine}\n${extraLine}\n\n## Professional Summary\n${summary}\n\n## Core Competencies\n${skillsMd}\n\n## Professional Experience\n${expMd}\n\n## Education\n${eduMd}`;
}

const SEED_JOBS = [
  { id: "j1", domain: "software", title: "Software Engineering Intern", company: "Northwind Labs", location: "Remote", level: "fresh_grad", skills: ["javascript", "react", "git"], description: "Summer internship." },
  { id: "j4", domain: "software", title: "Mid-level Backend Engineer", company: "Tetra", location: "NYC", level: "mid_level", skills: ["go", "postgres", "kubernetes"], description: "Own a service end-to-end." },
];

app.get(`${PREFIX}/matches`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ matches: SEED_JOBS });
});

app.post(`${PREFIX}/tailor`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { jobId } = await c.req.json();
    const profile = (await kv.get(`profile:${u.id}`)) ?? {};
    const resume = (await kv.get(`resume:${u.id}`)) ?? {};
    if (profile.credits_remaining <= 0) return c.json({ error: "Out of credits." }, 402);

    const job = SEED_JOBS.find((j) => j.id === jobId) || { id: "custom", title: "Role", company: "Company", location: "", level: "mid_level", skills: [], description: "" };
    
    let md: string;
    try {
      md = await generateWithGemini(resume, job, profile.career_domain ?? "other", profile.current_tier ?? "fresh_grad", profile.custom_career_label, 'classic');
    } catch (err) {
      console.log("Gemini fallback:", err);
      md = renderTailoredMarkdown(resume, job, 'classic');
    }

    const id = crypto.randomUUID();
    const tailored = { id, profile_id: u.id, job_id: job.id, job_title: job.title, company: job.company, markdown: md, generated_by: "ai", created_at: new Date().toISOString() };
    await kv.set(`tailored:${u.id}:${id}`, tailored);
    
    profile.credits_remaining -= 1;
    await kv.set(`profile:${u.id}`, profile);
    return c.json({ tailored, profile });
  } catch (e) { return c.json({ error: String(e) }, 500); }
});

app.post(`${PREFIX}/tailor-custom`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { jobTitle, company, location, description, template } = await c.req.json();
    const profile = (await kv.get(`profile:${u.id}`)) ?? {};
    const resume = (await kv.get(`resume:${u.id}`)) ?? {};
    if (profile.credits_remaining <= 0) return c.json({ error: "Out of credits." }, 402);

    const job = { id: `custom`, title: jobTitle, company, location, level: profile.current_tier, skills: [], description };
    let md: string;
    try {
      md = await generateWithGemini(resume, job, profile.career_domain ?? "other", profile.current_tier ?? "fresh_grad", profile.custom_career_label, template);
    } catch (err) {
      md = renderTailoredMarkdown(resume, job, template);
    }

    const id = crypto.randomUUID();
    const tailored = { id, profile_id: u.id, job_id: job.id, job_title: job.title, company: job.company, markdown: md, generated_by: "ai", created_at: new Date().toISOString() };
    await kv.set(`tailored:${u.id}:${id}`, tailored);
    
    profile.credits_remaining -= 1;
    await kv.set(`profile:${u.id}`, profile);
    return c.json({ tailored, profile });
  } catch (e) { return c.json({ error: String(e) }, 500); }
});

app.post(`${PREFIX}/tailor-baseline`, async (c) => {
  const u = await authUser(c);
  if (!u) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { template } = await c.req.json();
    const profile = (await kv.get(`profile:${u.id}`)) ?? {};
    const resume = (await kv.get(`resume:${u.id}`)) ?? {};
    if (profile.credits_remaining <= 0) return c.json({ error: "Out of credits." }, 402);

    const job = { id: `baseline`, title: profile.career_domain || "Professional", company: "General", location: "", level: profile.current_tier, skills: [], description: "Baseline CV." };
    let md: string;
    try {
      md = await generateWithGemini(resume, job, profile.career_domain ?? "other", profile.current_tier ?? "fresh_grad", profile.custom_career_label, template);
    } catch (err) {
      md = renderTailoredMarkdown(resume, job, template);
    }

    const id = crypto.randomUUID();
    const tailored = { id, profile_id: u.id, job_id: job.id, job_title: "Baseline Resume", company: template || "Classic", markdown: md, generated_by: "ai", created_at: new Date().toISOString() };
    await kv.set(`tailored:${u.id}:${id}`, tailored);
    
    profile.credits_remaining -= 1;
    await kv.set(`profile:${u.id}`, profile);
    return c.json({ tailored, profile });
  } catch (e) { return c.json({ error: String(e) }, 500); }
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
  const id = c.req.param("id");
  await kv.del(`tailored:${u.id}:${id}`);
  return c.json({ ok: true, id });
});

Deno.serve(app.fetch);