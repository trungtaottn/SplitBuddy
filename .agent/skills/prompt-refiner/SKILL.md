---
name: prompt-refiner
description: Transform raw, vague, or informal user requests into clear, structured, and actionable AI prompts by leveraging project context. Use this skill when the user's request is unclear, incomplete, or heavily dependent on project-specific context, such as when they say things like "I need to do this but don't know where to start", "Analyze this requirement for me", "Help the AI understand this properly", or when they provide a raw idea that needs clarification and structuring before execution.
---

# Prompt Refiner

## Purpose

This skill transforms raw, unstructured user requests into clear, structured, actionable AI prompts that another AI agent can reliably execute. It does NOT solve the user's request directly - it clarifies intent, leverages project context, and generates high-quality prompts for execution.

## Key Responsibilities

1. **Infer True Intent** - Understand WHY the user wants something, not just WHAT they asked for
2. **Identify Target AI Role** - Determine which AI persona is best suited (architect, debugger, planner, etc.)
3. **Extract Project Context** - Gather relevant tech stack, architecture, domain knowledge, and constraints
4. **Clarify Scope** - Define boundaries and identify missing information
5. **Generate Executable Prompt** - Create a complete, unambiguous prompt ready for another AI agent

## When to Use This Skill

Activate when:

- User request is vague, informal, or incomplete
- Request requires significant project-specific context
- User explicitly asks for planning, analysis, or requirement clarification
- Request has multiple interpretations without project context
- User indicates uncertainty about how to start or what to ask for

Common trigger phrases:

- "Tôi cần làm cái này nhưng chưa rõ bắt đầu từ đâu" (I need to do this but don't know where to start)
- "Phân tích giúp tôi yêu cầu này" (Analyze this requirement for me)
- "Từ yêu cầu này hãy giúp AI hiểu đúng để làm tiếp" (From this request, help the AI understand it properly to continue)
- "I want to add [feature] but not sure how it fits"
- "Can you help me figure out what I actually need?"

## Workflow

### Step 1: Understand the Raw Request

Carefully read the user's original request. Look for:

- Core action or feature they want
- Mentioned problems or pain points
- Implied outcomes or goals
- Any context they've provided (files, errors, descriptions)

### Step 2: Extract Relevant Project Context

Gather project-specific information that affects the solution:

1. **Technology Stack** - Languages, frameworks, libraries, databases
2. **Architecture Patterns** - REST/GraphQL, layered/clean architecture, state management
3. **Domain Knowledge** - Business domain, entities, relationships, rules
4. **Code Conventions** - Naming, file organization, error handling patterns
5. **Current Constraints** - Known issues, technical debt, performance concerns
6. **Project Phase** - MVP vs. production, active development vs. maintenance

**See [context_extraction.md](references/context_extraction.md) for detailed guidance.**

**Context Sources (in priority order):**

- User's currently open files and recent edits
- Code that will be modified or extended
- Similar existing features (precedents)
- Project documentation (README, architecture docs)
- Configuration files (package.json, Cargo.toml, etc.)
- Recent conversation history

### Step 3: Infer Intent and Define Goal

**Infer Intent:**

- Why does the user want this? What problem are they solving?
- What's the underlying business value or user need?
- Connect the request to project context when relevant

**Define Goal:**

- What are the concrete, observable outcomes?
- What does "done" look like?
- Include both functional and non-functional requirements

### Step 4: Identify Assumptions and Gaps

**Assumptions:**

- What did you assume to fill in blanks?
- Why were these assumptions reasonable given context?
- Which assumptions might need validation?

**Missing Information:**

- What critical gaps could affect the solution?
- What questions would help clarify the approach?
- Can reasonable defaults be suggested?

**Important:** Only list genuinely blocking or high-impact unknowns. Don't ask questions just for completeness.

### Step 5: Determine AI Role

Choose the appropriate AI role based on the refined requirement:

**Common Roles:**

- **Technical Architect** - Design system structure, choose patterns, define interfaces
- **Implementation Engineer** - Write code, implement features, handle edge cases
- **Debugger/Troubleshooter** - Diagnose issues, trace bugs, propose fixes
- **Code Reviewer** - Evaluate quality, suggest improvements, check standards
- **Project Planner** - Break down work, estimate effort, identify dependencies
- **Documentation Writer** - Create/update docs, explain complex systems
- **Refactoring Specialist** - Improve code structure without changing behavior

### Step 6: Generate the Final AI Prompt

Create a complete, structured prompt following this format:

**Required Sections:**

1. **Context** - Brief project overview and current state
2. **Objective** - Clear goal statement
3. **Requirements** - Specific, numbered list of deliverables
4. **Constraints** - Technical, business, or design constraints to respect
5. **Acceptance Criteria** - How to verify completeness
6. **Suggested Approach** _(optional)_ - Recommended implementation strategy

**Quality Standards:**

- Write in second person ("You are...", "Your task is...")
- Be explicit about file paths, function names, patterns when known
- Include code style or architectural patterns to follow
- Specify testing requirements
- Avoid ambiguity - prefer "must" over "should" for requirements
- Ensure another AI agent can execute without follow-up questions

**See [output_format.md](references/output_format.md) for complete specification and examples.**

## Output Format

Your response MUST follow this exact structure:

```
# Inferred Intent
[Single paragraph explaining WHY the user wants this]

# User Goal
- [Observable outcome 1]
- [Observable outcome 2]
...

# Relevant Project Context Used
- [Context point 1: tech stack, architecture, domain, etc.]
- [Context point 2]
...

# Assumptions Made
1. [Assumption 1 with rationale]
2. [Assumption 2 with rationale]
...

# Missing Information
- [HIGH/MEDIUM/LOW] [Question or unknown]
...
OR: No critical missing information. Sufficient context to proceed with reasonable defaults.

# Recommended AI Role
**[Role Title]:** [One-sentence description of responsibilities]

# Final AI Prompt

[Complete, structured prompt with Context, Objective, Requirements, Constraints, Acceptance Criteria, and optionally Suggested Approach sections]
```

## Examples

### Example 1: Feature Request

**Raw Request:**

```
"Add user authentication"
```

**Refined Output:**

```
# Inferred Intent
The user wants to secure the application by adding user authentication because there's currently no way to verify user identity or protect sensitive resources.

# User Goal
- Users can register with email/password
- Users can log in and receive an authentication token
- Protected API endpoints verify token before granting access
- Frontend redirects unauthenticated users to login page

# Relevant Project Context Used
- Tech stack: Rust Axum backend, React TypeScript frontend
- Architecture: RESTful API with JWT pattern used in similar services
- Database: PostgreSQL with Diesel ORM
- Frontend state: TanStack Query for API state management
- Project phase: MVP, prioritize speed over complex features

# Assumptions Made
1. JWT token-based auth is appropriate - matches existing API patterns and stateless requirement
2. Email/password is sufficient for MVP - no OAuth or SSO needed yet
3. Password reset out of scope - can be added post-MVP
4. Session management on frontend uses localStorage - following existing pattern

# Missing Information
No critical missing information. Sufficient context to proceed with reasonable defaults.

# Recommended AI Role
**Implementation Engineer:** Responsible for implementing authentication end-to-end, including backend API endpoints, database schema, JWT token generation/validation, and frontend login/register UI.

# Final AI Prompt

[See output_format.md for full example of structured prompt]
```

### Example 2: Performance Issue

**Raw Request:**

```
"Dashboard is slow"
```

**Refined Output:**

```
# Inferred Intent
The user wants to improve dashboard load time because current performance is degrading user experience, likely due to multiple sequential API calls on mount.

# User Goal
- Dashboard loads in under 2 seconds on typical connection
- No degradation in data freshness or accuracy
- Maintain backwards compatibility with existing API contracts

# Relevant Project Context Used
- Frontend: React with TanStack Query
- Current issue: Dashboard makes 5 sequential API calls on mount (observed in UserDashboard.tsx)
- Backend: Rust Axum with PostgreSQL
- No caching layer currently implemented
- Production environment with 10k active users

# Assumptions Made
1. Primary bottleneck is multiple sequential API calls - based on code inspection of UserDashboard component
2. Caching is acceptable for dashboard data - typical business metrics can tolerate 5-minute staleness
3. Backend aggregation endpoint is feasible - queries are from same database and can be combined

# Missing Information
- [MEDIUM] What is the acceptable data staleness for dashboard metrics?
- Default suggestion: 5-minute cache with stale-while-revalidate strategy

# Recommended AI Role
**Performance Engineer:** Responsible for diagnosing performance bottleneck, implementing optimizations (parallel fetching, caching, API aggregation), and measuring improvement.

# Final AI Prompt

[Complete structured prompt with specific optimization steps]
```

## Key Principles

1. **Do NOT solve the problem** - Only clarify and structure the request
2. **Do NOT generate code or final answers** - That's the job of the next AI agent
3. **Focus on clarity and alignment** - Ensure the refined prompt captures true intent
4. **Leverage project context** - Use actual tech stack, patterns, and constraints
5. **Be explicit** - Avoid ambiguity; another AI should execute without questions
6. **Make assumptions visible** - State what you assumed and why
7. **Quality over speed** - A great prompt saves time downstream

## Resources

### references/

- **[output_format.md](references/output_format.md)** - Complete specification of output structure with detailed examples
- **[context_extraction.md](references/context_extraction.md)** - Comprehensive guide on gathering and using project context
