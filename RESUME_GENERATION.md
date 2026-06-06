# Resume Generation System — Technical Documentation

## Overview

The ATS Resume Maker uses a sophisticated AI-powered system to generate career-domain-aware, ATS-optimized resumes. The system processes custom career extras and experience metadata to create highly personalized, keyword-rich markdown resumes.

## Architecture

### Components

1. **Frontend Resume Prompt** (`src/lib/resumePrompt.ts`)
   - Client-side prompt builder (future use for direct API calls)
   - Comprehensive type definitions
   - Template fallback generation

2. **Backend Resume Prompt** (`supabase/functions/server/resumePrompt.tsx`)
   - Deno-compatible system prompt generator
   - Career domain definitions
   - Tier-specific guidance

3. **Server Integration** (`supabase/functions/server/index.tsx`)
   - `/tailor` endpoint uses Claude Sonnet 4 API
   - Graceful fallback to template generation
   - Prompt caching for cost optimization

## Career Domain System

The system supports **5 career domains**, each with specialized handling:

### 1. Software Engineering
**Profile Extras:**
- `github` — GitHub profile URL (featured prominently)
- `portfolio` — Portfolio website
- `linkedin` — LinkedIn profile
- `website` — Personal website

**Experience Metadata:**
- `tech_stack` — Technologies used (extracted to Skills section)
- `team_size` — Team size for leadership context

**Optimization Focus:**
- Quantify: latency, throughput, users served, uptime, cost savings
- Keywords: agile, CI/CD, scalability, microservices, cloud native
- Achievement examples: "Reduced API latency by 40%", "Shipped to 2M+ users"

### 2. Medicine & Healthcare
**Profile Extras:**
- `medical_license` — Medical license number (critical credential)
- `board_certification` — Board certification status
- `npi_number` — National Provider Identifier

**Experience Metadata:**
- `specialization` — Medical specialty
- `patients_per_week` — Patient volume metrics
- `procedures_performed` — Procedure counts

**Optimization Focus:**
- Quantify: patient volume, procedures, outcomes, satisfaction rates
- Keywords: patient care, clinical research, EMR/EHR, HIPAA
- Achievement examples: "50+ patients weekly, 98% satisfaction"

### 3. Aviation & Aerospace
**Profile Extras:**
- `pilot_license` — Pilot license type and number
- `aircraft_ratings` — Aircraft type ratings
- `total_flight_hours` — Total logged hours (featured in headline)

**Experience Metadata:**
- `aircraft_type` — Aircraft types flown
- `flight_hours_in_role` — Hours logged in specific role

**Optimization Focus:**
- Quantify: flight hours, aircraft types, safety record
- Keywords: flight safety, crew resource management, FAA regulations
- Achievement examples: "2,500+ hours, perfect safety record"

### 4. Management & Business
**Profile Extras:**
- `mba_institution` — MBA institution (if top-tier)
- `professional_certification` — PMP, Six Sigma, etc.
- `linkedin` — LinkedIn profile

**Experience Metadata:**
- `budget_managed` — Annual budget responsibility
- `direct_reports` — Team size
- `key_accounts` — Major client relationships

**Optimization Focus:**
- Quantify: budget, headcount, revenue impact, cost savings
- Keywords: P&L, strategic planning, stakeholder management
- Achievement examples: "$5M launch, 120% of revenue targets"

### 5. Other / Custom Domains
**Profile Extras:**
- `linkedin`, `website`, `portfolio`

**Experience Metadata:**
- Minimal (general-purpose)

**Optimization Focus:**
- Quantify impact wherever possible
- Generic professional keywords

## Tier Classification & Impact

The system classifies candidates into **5 career tiers** based on experience and education:

### Fresh Graduate (`fresh_grad`)
- **Detection**: No experience or <1 year, ongoing/recent degree
- **Resume Strategy**: 
  - Leverage academic projects, capstones
  - Feature internships prominently
  - Include relevant coursework if matching job
  - Highlight student leadership, hackathons, honors
  - Include GPA if >3.5

### Experienced Undergraduate (`experienced_undergrad`)
- **Detection**: Has work experience but still in school
- **Resume Strategy**:
  - Treat internships like full experience
  - Show academic + work balance
  - Emphasize growth trajectory
  - Include leadership in student orgs

### Mid-Level (`mid_level`)
- **Detection**: 1-5 years experience, completed degree
- **Resume Strategy**:
  - Show progression in responsibility
  - End-to-end ownership of projects
  - Cross-team collaboration
  - Independent decision-making

### Senior (`senior`)
- **Detection**: 5-10 years experience
- **Resume Strategy**:
  - Balance "what I built" with "what my team achieved"
  - Technical depth + cross-functional leadership
  - Mentorship, architecture decisions
  - Impact beyond individual contributions

### Executive (`executive`)
- **Detection**: 10+ years + completed degree + leadership checkbox
- **Resume Strategy**:
  - Lead with business impact (revenue, P&L)
  - Leadership scale (team size, budget, scope)
  - Strategic wins, not implementation details
  - Keep it concise (max 2 pages)

## System Prompt Architecture

### Prompt Structure

The master prompt is built dynamically based on:
1. **Career domain** (5 options)
2. **Career tier** (5 levels)
3. **Custom career label** (if "Other" domain)
4. **Profile extras** (domain-specific credentials)
5. **Experience metadata** (domain-specific context)
6. **Target job description** (for tailoring)

### Prompt Sections

```
1. Role Definition
   └─ "You are an expert ATS-optimized resume writer specializing in [domain]"

2. Candidate Profile
   ├─ Field (with custom label if applicable)
   ├─ Career Tier
   └─ Target Level guidance

3. Career Domain Context
   ├─ Field norms & achievement formatting
   ├─ Profile extras guidance
   └─ Critical ATS keywords

4. ATS Optimization Rules
   ├─ Structure requirements
   ├─ Keyword strategy
   ├─ Achievement formatting (CAR method)
   ├─ Metrics & quantification
   └─ Domain-specific metadata integration

5. Content Guidelines
   ├─ Summary/Headline (2-3 sentences)
   ├─ Skills Section (12-20 skills, categorized)
   ├─ Experience Section (tier-specific guidance)
   └─ Education Section

6. Output Requirements
   ├─ Format (clean markdown)
   ├─ Length (1-2 pages based on tier)
   ├─ Tone (professional, confident)
   ├─ Authenticity (no fabrication)
   └─ ATS compatibility

7. Tier-Specific Instructions
   └─ Detailed guidance for the candidate's tier

8. Job Description Analysis (for tailoring)
   ├─ Parse job requirements
   ├─ Extract critical keywords
   ├─ Match tone to company culture
   └─ Prioritize relevant achievements
```

## Achievement Formatting (CAR Method)

All achievement bullets follow the **Context-Action-Result** pattern:

**Formula**: `[Action Verb] + [What You Did] + [Quantifiable Result/Impact]`

### Domain-Specific Examples

**Software:**
```markdown
- Architected microservices migration that reduced API latency by 40% and improved reliability to 99.95%
- Led team of 4 engineers to rebuild auth system, enabling 2M+ users to migrate with zero downtime
```

**Medicine:**
```markdown
- Managed comprehensive care for 50+ patients weekly, maintaining 98% satisfaction rate
- Performed 200+ minimally invasive procedures with zero complications, reducing recovery time by 30%
```

**Aviation:**
```markdown
- Maintained perfect safety record over 2,500+ flight hours across 4 aircraft types
- Trained 8 junior pilots with 100% first-time checkride pass rate
```

**Management:**
```markdown
- Directed $5M product launch achieving 120% of revenue targets in first quarter
- Scaled ops team from 5 to 25 while reducing cost-per-transaction by 35%
```

## Metadata Processing

### How Domain-Specific Metadata Is Used

#### Tech Stack (Software)
```json
{ "tech_stack": "React, Node.js, PostgreSQL, AWS" }
```
- **In Bullets**: "Built user dashboard using React, Node.js, and PostgreSQL..."
- **In Skills**: Extracted individually → React, Node.js, PostgreSQL, AWS

#### Team Size (All Domains)
```json
{ "team_size": "5 engineers" }
```
- **In Bullets**: "Led team of 5 engineers to deliver..."

#### Patient Volume (Medicine)
```json
{ "patients_per_week": "40-50" }
```
- **In Bullets**: "Managed comprehensive care for 40-50 patients weekly..."

#### Budget (Management)
```json
{ "budget_managed": "$2M annually" }
```
- **In Bullets**: "Managed $2M annual budget across 3 product lines..."

#### Flight Hours (Aviation)
```json
{ "flight_hours_in_role": "800" }
```
- **In Bullets**: "Logged 800+ flight hours on Boeing 737 MAX..."

## API Integration

### Claude API Configuration

**Model**: `claude-sonnet-4-20250514`
**Max Tokens**: 4000
**Temperature**: 0.7
**Caching**: System prompt cached (ephemeral)

### Environment Variables Required

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Set via the `create_supabase_secret` tool if not already configured.

### Graceful Degradation

```
┌─────────────────────┐
│   /tailor request   │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │ Try Claude   │───┐ Success
    │ API call     │   │
    └──────┬───────┘   │
           │ Error     │
           ▼           ▼
    ┌──────────────────────┐
    │ Fallback to template │
    │ generation           │
    └──────────────────────┘
```

## Usage Examples

### Basic Tailoring Request

```typescript
const response = await api("/tailor", {
  method: "POST",
  token: accessToken,
  body: { jobId: "j4" }
});

const { tailored, profile } = response;
// tailored.markdown = ATS-optimized markdown resume
// tailored.generated_by = "ai" | "template"
// profile.credits_remaining = updated credit count
```

### Frontend Resume Generation (Future)

```typescript
import { generateResume } from '@/lib/generateResume';

const markdown = await generateResume({
  resumeData: {
    contact_info: { ... },
    education: [ ... ],
    experience: [ ... ],
    skills: [ ... ],
    career_domain: "software",
    tier: "mid_level"
  },
  job: {
    title: "Senior Backend Engineer",
    company: "Acme Corp",
    description: "..."
  },
  apiKey: userApiKey // Optional, falls back to template
});
```

## Cost Optimization

### Prompt Caching Strategy

The system prompt is cached at the API level using Claude's prompt caching:

```typescript
system: [{
  type: "text",
  text: systemPrompt,
  cache_control: { type: "ephemeral" }
}]
```

**Benefits:**
- System prompt (~3-4K tokens) cached for 5 minutes
- Reduces cost by ~90% on cached requests
- Faster response times

**Cost Estimate** (with caching):
- First request: ~$0.02 (full prompt)
- Cached requests: ~$0.002 (only user prompt)

## Testing the System

### Test Resume Generation

```bash
# 1. Set API key
export ANTHROPIC_API_KEY="sk-ant-..."

# 2. Complete onboarding as a software engineer with 3 years experience

# 3. Navigate to Dashboard → Job Matches

# 4. Click "Tailor CV" on any job

# 5. Check generated resume in modal
```

### Verify Domain-Specific Handling

**Software Engineer:**
- Should include GitHub link in header
- Tech stack appears in bullets AND Skills section
- Metrics-focused achievements

**Medicine:**
- Medical license number after name
- Patient volume quantified
- Clinical outcomes emphasized

**Aviation:**
- Flight hours in headline
- Aircraft types listed
- Safety record highlighted

## Extending the System

### Adding a New Career Domain

1. **Update `resumePrompt.tsx`** (server):

```typescript
const CAREER_DOMAINS = {
  // ... existing domains
  finance: {
    id: "finance",
    label: "Finance & Investment",
    achievementsHint: "Quantify: AUM, returns, deals closed, portfolio size",
    profileExtras: ["cfa", "series_licenses", "linkedin"],
    experienceMeta: ["aum_managed", "portfolio_size"],
    suggestedSkills: ["financial modeling", "portfolio management", "risk analysis"],
  }
};
```

2. **Update `careerDomains.ts`** (frontend):

```typescript
export const CAREER_DOMAINS: CareerDomain[] = [
  // ... existing domains
  {
    id: "finance",
    label: "Finance & Investment",
    profileExtras: [
      { key: "cfa", label: "CFA Level", type: "text", placeholder: "Level I, II, or III" },
      { key: "series_licenses", label: "Series Licenses", placeholder: "7, 63, 65, etc." }
    ],
    experienceMeta: [
      { key: "aum_managed", label: "AUM Managed", placeholder: "$500M" },
      { key: "portfolio_size", label: "Portfolio Size", placeholder: "50 positions" }
    ],
    // ... rest of config
  }
];
```

3. **Add achievement examples** in `resumePrompt.tsx`:

```typescript
finance: [
  "- Managed $500M AUM with 12% annualized returns, outperforming benchmark by 3%",
  "- Closed $50M in new business across 15 institutional clients",
]
```

### Adding a New Tier

Update `tier.ts` classification logic and add tier-specific guidance in `resumePrompt.tsx`.

## Troubleshooting

### "ANTHROPIC_API_KEY not configured"

```bash
# Use the create_supabase_secret tool
# The system will prompt you to upload your API key
```

### AI generation failing, using template

**Check:**
1. API key is valid and has credits
2. Network connectivity to api.anthropic.com
3. Check server logs for detailed error

### Resume not matching domain

**Check:**
1. User completed career picker step
2. `profile.career_domain` is set correctly
3. Domain-specific fields were filled during onboarding

### Keywords not matching job description

**Expected behavior** — the AI analyzes the job description and incorporates relevant keywords. If it's not working:
1. Verify job description is detailed enough
2. Check that Claude API is being used (not template fallback)
3. Review generated_by field: "ai" vs "template"

## Performance Benchmarks

**Generation Time:**
- Claude API (with caching): ~3-5 seconds
- Claude API (cold): ~8-12 seconds
- Template fallback: <1 second

**Token Usage** (typical):
- System prompt: ~3,500 tokens (cached)
- User prompt: ~800-1,200 tokens
- Output: ~1,500-2,500 tokens

**Credit Cost** (with 3 free credits):
- Free tier: 3 tailored resumes
- Job Hunter ($14/mo): 10 resumes/month
- Aggressive Campaigner ($29/mo): Unlimited

---

Built with Claude Sonnet 4, optimized for ATS systems, personalized by career domain and tier.
