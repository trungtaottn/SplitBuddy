# Context Extraction Guide

This guide explains how to extract and leverage project context when refining user requests into structured prompts.

## Why Project Context Matters

A vague request like "Add user authentication" means vastly different things for:

- A new greenfield Go project (choose auth library, design session management)
- An existing Django app (extend built-in auth, add OAuth provider)
- A microservices architecture (integrate with auth service, add JWT validation)

Context transforms generic requests into project-specific, actionable prompts.

---

## Types of Context to Extract

### 1. Technology Stack

**What to Look For:**

- Programming languages and versions
- Frameworks and libraries
- Database systems
- Build tools and package managers
- Deployment platforms

**How to Find It:**

```
- Check package.json, requirements.txt, Cargo.toml, go.mod, etc.
- Look at imports/dependencies in existing code
- Review build configuration files
- Check deployment scripts or Dockerfiles
```

**Why It Matters:**
Determines implementation patterns, available libraries, and technical constraints.

**Example:**

```
Raw: "Add caching"
With Stack Context: "Implement Redis caching with TTL for dashboard queries in the Rust Axum backend"
```

---

### 2. Architecture Patterns

**What to Look For:**

- Monolith vs. microservices vs. serverless
- MVC, MVVM, Clean Architecture, layered architecture
- API design patterns (REST, GraphQL, RPC)
- State management approach (Redux, Context, MobX)
- Data flow patterns

**How to Find It:**

```
- Examine directory structure
- Look at existing API endpoints
- Check frontend component organization
- Review database access patterns
```

**Why It Matters:**
New code should follow established patterns to maintain consistency.

**Example:**

```
Raw: "Add analytics tracking"
With Architecture Context: "Add analytics event tracking following the existing event-sourcing pattern, emit events from domain services, consume in separate analytics worker"
```

---

### 3. Domain Knowledge

**What to Look For:**

- Business domain (e-commerce, fintech, healthcare, etc.)
- Domain entities and relationships
- Business rules and constraints
- User roles and permissions
- Workflow/process flows

**How to Find It:**

```
- Review database schema and table names
- Study existing domain models/entities
- Check business logic in service layer
- Look at validation rules
- Review user stories or documentation
```

**Why It Matters:**
Ensures technical solutions align with business requirements and terminology.

**Example:**

```
Raw: "Add payment feature"
With Domain Context: "Implement settlement tracking for shared expenses, allowing debtors to mark debts as paid with timestamp audit trail, following the group expense-splitting domain model"
```

---

### 4. Code Conventions & Style

**What to Look For:**

- Naming conventions (camelCase, snake_case, PascalCase)
- File organization patterns
- Comment style and documentation approach
- Error handling patterns
- Testing conventions

**How to Find It:**

```
- Review 2-3 similar files in the codebase
- Check for linting configuration (.eslintrc, rustfmt.toml)
- Look at existing tests for patterns
- Review code comments for style
```

**Why It Matters:**
Maintains code consistency and reduces friction in code review.

**Example:**

```
Raw: "Add validation"
With Convention Context: "Add Zod validation schemas in frontend/src/validators/, use camelCase for field names, return i18n-compatible error codes, follow pattern from UserValidator.ts"
```

---

### 5. Current Constraints & Known Issues

**What to Look For:**

- Performance bottlenecks
- Technical debt areas
- Known bugs or limitations
- Deprecated patterns to avoid
- Migration in progress (e.g., moving from REST to GraphQL)

**How to Find It:**

```
- Check recent commit messages and PR comments
- Review TODO/FIXME comments in code
- Look at issue tracker or bug reports
- Check recent conversation history with user
```

**Why It Matters:**
Prevents introducing work that conflicts with upcoming changes or known problems.

**Example:**

```
Raw: "Optimize database queries"
With Constraints Context: "Optimize dashboard queries using read replicas; avoid ORM query builder in performance-critical paths due to known N+1 issues, use raw SQL with prepared statements instead"
```

---

### 6. Project Phase & Maturity

**What to Look For:**

- MVP vs. production vs. legacy
- Active development vs. maintenance mode
- Prototype vs. long-term solution

**How to Find It:**

```
- Check project age (git log, first commit date)
- Review recent commit frequency
- Look at code coverage and test maturity
- Check documentation completeness
```

**Why It Matters:**
Influences solution sophistication - MVP needs quick iteration, production needs robustness.

**Example:**

```
Raw: "Add logging"
MVP Context: "Add basic console.log statements with request IDs for debugging, defer structured logging until post-MVP"
Production Context: "Implement structured JSON logging with Winston, integrate with Datadog, add log levels, include trace IDs, follow security logging policy for PII redaction"
```

---

## Context Extraction Workflow

### Step 1: Scan for Explicit Context

Look for files that declare project setup:

- `package.json`, `Cargo.toml`, `requirements.txt`, `go.mod`, `pom.xml`
- `README.md`, `ARCHITECTURE.md`, project documentation
- Configuration files (`.eslintrc`, `tsconfig.json`, database config)

### Step 2: Infer from Code Structure

Examine 2-3 representative files that are similar to what the user is requesting:

- If request involves API: look at existing API route handlers
- If request involves UI: look at existing components
- If request involves data: look at existing models/schemas

### Step 3: Extract Domain Patterns

Identify domain-specific terminology and relationships:

- Entity names (User, Session, Debt, Transaction)
- Relationships (one-to-many, many-to-many)
- Business rules (permissions, validation, workflows)

### Step 4: Synthesize Relevance

Filter context down to what's actually relevant:

- **Include:** Direct precedents, constraints that apply, patterns to follow
- **Exclude:** Unrelated subsystems, deprecated code, irrelevant history

---

## Examples: Before and After Context

### Example 1: Authentication Request

**Raw Request:**

```
"Add user login"
```

**With Extracted Context:**

```
Project: Django REST API for healthcare records
Stack: Python 3.11, Django 4.2, PostgreSQL, JWT
Architecture: Token-based auth with refresh tokens
Domain: HIPAA-compliant patient data system
Constraints: Must use 2FA for all users, audit all logins

Refined Prompt:
"Implement JWT-based authentication endpoint following the existing token refresh pattern in auth/views.py, add 2FA verification step using TOTP (django-otp library already in stack), log all authentication events to audit_logs table for HIPAA compliance, ensure tokens expire after 15 minutes per security policy"
```

---

### Example 2: Performance Request

**Raw Request:**

```
"Make the dashboard faster"
```

**With Extracted Context:**

```
Project: React expense-sharing app
Stack: React 18, TypeScript, TanStack Query, Rust Axum backend
Architecture: RESTful API, frontend uses React Query for caching
Current Issue: Dashboard fetches 5 API endpoints sequentially on mount
Phase: Production with 10k active users

Refined Prompt:
"Optimize dashboard load time by:
1. Implementing parallel fetching for the 5 dashboard API calls using Promise.all() in useDashboardData hook
2. Add 5-minute stale-while-revalidate cache in TanStack Query config
3. Implement backend API aggregation endpoint GET /api/dashboard/summary to reduce round-trips from 5 to 1
4. Keep backwards compatibility with existing individual endpoints for other pages
5. Add performance monitoring to track improvement"
```

---

## Context Sources Priority

When extracting context, prioritize sources in this order:

1. **User's current workspace** - Files they have open, recent edits
2. **Direct dependencies** - Code that will be modified or extended
3. **Similar existing features** - Precedents for the requested work
4. **Project documentation** - README, architecture docs, API specs
5. **Configuration files** - Package manifests, build configs
6. **Recent conversation history** - What user has been working on

---

## Red Flags: When Context is Insufficient

Recognize when you need to ask for more context:

- **Multiple possible interpretations** exist and no clear precedent
- **Critical architectural decision** is needed (e.g., choose auth provider)
- **Domain knowledge gap** prevents understanding business rules
- **Conflicting patterns** exist in codebase with no clear preferred approach
- **User intent is ambiguous** between multiple distinct features

In these cases, list specific clarifying questions in the "Missing Information" section rather than guessing.
