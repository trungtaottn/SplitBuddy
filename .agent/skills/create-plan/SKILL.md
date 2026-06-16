---
name: create-plan
description: Create a concise, actionable plan for coding-related tasks. Use when a user explicitly asks for a plan. This skill operates in read-only mode and outputs only the plan following OpenAI's recommended template format - no code, no implementation, no file modifications.
---

# Create Plan

## Purpose

Generate concise, actionable plans for coding tasks following OpenAI's recommended planning behavior. This skill produces ONLY a plan - it does not implement, modify, or write any code or files.

## Core Principles

1. **Read-only mode** - Never write, modify, or suggest writing files during planning
2. **Template-based output** - Always use the required template structure
3. **No code snippets** - Plans describe WHAT to do, not HOW to code it
4. **No meta-commentary** - Output only the plan, no explanations about the plan
5. **Minimal questions** - Ask only blocking questions (max 1-2), prefer assumptions

## When to Use This Skill

Activate when:

- User explicitly asks for a plan
- User requests "create a plan", "plan out", "what's the approach"
- Task involves coding, architecture, refactoring, bug fixes, or feature development
- User wants to understand steps before implementation

Do NOT use for:

- Direct implementation requests without planning
- Questions about existing code (use other skills)
- Non-coding tasks

## Workflow

### Step 1: Scan Context Quickly

Gather minimal necessary context efficiently:

**Core documentation (read first):**

- `README.md` - Project overview, tech stack, setup
- `ARCHITECTURE.md`, `CONTRIBUTING.md`, `docs/` - Architecture and conventions
- Package manifest - `package.json`, `Cargo.toml`, `requirements.txt`, etc.

**Affected code (skim relevant areas):**

- Files most likely to be modified for this task
- Similar existing features (precedents)
- Test files and testing patterns

**Identify constraints:**

- Programming language and framework
- Testing approach and commands
- CI/CD configuration
- Deployment environment
- Architectural patterns

**Time limit:** Spend minimal time gathering context. Don't read entire codebase.

**Focus:** Extract enough to create a responsible plan, not perfect understanding.

### Step 2: Ask Follow-up Questions (If Blocking)

**Default: Do NOT ask questions.** Prefer making reasonable assumptions.

**Ask ONLY if:**

- Question is genuinely blocking (cannot create responsible plan without answer)
- Answer significantly affects approach or scope
- Risk of wrong assumption is high

**Constraints:**

- Maximum 1-2 questions total
- Prefer multiple-choice format
- Suggest reasonable defaults
- If uncertain but not blocked, assume and proceed

**Examples:**

✅ **Good (blocking question):**

```
The request mentions "notifications" but it's unclear if this means:
A) Email notifications (requires email service integration)
B) In-app notifications (frontend only)
C) Both

This affects scope significantly. Which should be included?
```

❌ **Bad (non-blocking):**

```
Should we use Redux or Context API for state management?
```

(Check existing patterns and follow them - not blocking)

❌ **Bad (too many questions):**

```
1. What color should the button be?
2. Should we add logging?
3. What about error messages?
4. Should we write tests?
5. ...
```

(Only first question might be blocking, rest are implementation details)

### Step 3: Create the Plan

Generate a plan using the **required template structure**:

```markdown
# Plan

<1-3 sentences: what, why, how>

## Scope

- In:
  - <items included in this task>
- Out:
  - <items explicitly excluded>

## Action items

[ ] <Step 1>
[ ] <Step 2>
[ ] <Step 3>
...

## Open questions

- <Question 1>
  ...
```

**See [template_spec.md](references/template_spec.md) for complete specification, examples, and guidelines.**

#### Introduction (1-3 sentences)

Must cover:

- **What** will be done
- **Why** it's needed (motivation, business value)
- **How** it will be approached (high-level strategy)

#### Scope

Define clear boundaries:

- **In:** What WILL be done in this task
- **Out:** What will NOT be done (deferred, out of scope, future work)

Be explicit about commonly expected items that are out of scope.

#### Action Items

**Quantity:** Default 6-10 items (adjust for complexity)

**Characteristics:**

- **Atomic** - Single, well-defined action per item
- **Verb-first** - Start with action verb (Add, Create, Update, Test, Verify)
- **Specific** - Reference files, modules, functions, commands
- **Ordered** - Logical flow: discovery → changes → validation → rollout

**Required elements:**

- ✅ At least ONE validation/testing step
- ✅ At least ONE edge case or risk consideration

**Common flow pattern:**

1. Review existing code/patterns
2. Design/plan changes
3. Implement core functionality
4. Add tests
5. Handle edge cases/errors
6. Validate/verify behavior
7. Update documentation
8. Deploy/rollout (if applicable)

**Good action items:**

```
[ ] Review existing auth patterns in `backend/src/routes/users.rs`
[ ] Create migration to add `users.password_hash` column
[ ] Implement JWT generation in `backend/src/auth/jwt.rs` using `jsonwebtoken` crate
[ ] Add POST `/api/auth/login` endpoint with email/password validation
[ ] Write integration tests for login success and failure cases
[ ] Test edge cases: expired tokens, invalid credentials, SQL injection
[ ] Update API documentation with authentication requirements
```

**Bad action items:**

```
[ ] Do backend
[ ] Handle frontend
[ ] Add tests
```

#### Open Questions

**Default: Omit this section if there are no significant unknowns.**

**Include only if:**

- Genuinely blocking or high-impact uncertainties remain
- Answer could significantly change approach
- Decision requires user input or clarification

**Constraints:**

- Maximum 3 questions
- Be specific and answerable
- Prefer multiple-choice format
- Suggest reasonable defaults when possible

### Step 4: Output the Plan

**Critical rules:**

- ✅ Output ONLY the plan using the template
- ❌ NO meta-commentary (e.g., "Here's a plan that will...")
- ❌ NO explanations about the plan
- ❌ NO code snippets
- ❌ NO content outside the template structure

The final assistant message should contain nothing except the plan in the exact template format.

## Examples

### Example 1: Feature Implementation

**User request:**

```
Add user authentication to the API
```

**Output:**

```markdown
# Plan

We will implement JWT-based authentication to secure API endpoints. This is needed because the application currently has no access control, exposing sensitive user data. The approach is to add email/password login, token generation, validation middleware, and frontend token management.

## Scope

- In:
  - Email/password authentication
  - JWT token generation and validation
  - Login/logout API endpoints
  - Authentication middleware for protected routes
  - Frontend login form and token storage
  - Basic integration tests
- Out:
  - OAuth/social login (phase 2)
  - Password reset functionality
  - Two-factor authentication
  - Session management across multiple devices
  - Role-based access control (separate task)

## Action items

[ ] Review existing user model in `backend/src/models/user.rs`
[ ] Create migration to add `password_hash` and `email` columns to `users` table
[ ] Implement JWT token generation and validation in `backend/src/auth/jwt.rs` using `jsonwebtoken` crate
[ ] Add POST `/api/auth/login` endpoint with email/password validation
[ ] Add POST `/api/auth/logout` endpoint to invalidate tokens
[ ] Create authentication middleware in `backend/src/middleware/auth.rs` to verify JWT on protected routes
[ ] Build `LoginForm` component in `frontend/src/components/auth/LoginForm.tsx`
[ ] Implement token storage using localStorage and axios request interceptor
[ ] Write integration tests for login success, login failure, and protected route access
[ ] Test edge cases: expired tokens, malformed tokens, invalid credentials, concurrent login sessions
[ ] Update API documentation with authentication requirements and examples

## Open questions

- Should tokens expire after 15 minutes or 1 hour? (Security standard is 15 min, suggest refresh tokens for UX)
```

### Example 2: Bug Fix

**User request:**

```
Dashboard shows stale data after updating a session
```

**Output:**

```markdown
# Plan

Fix dashboard cache invalidation issue where users see outdated session data after updates. Root cause is TanStack Query cache not being invalidated after session mutations. Solution is to add proper cache invalidation hooks to session mutation handlers.

## Scope

- In:
  - Add cache invalidation to session update mutations
  - Fix dashboard data staleness
  - Test cache behavior after various session operations
  - Verify across create/update/close session flows
- Out:
  - Refactoring global cache configuration (separate task)
  - Fixing similar issues on other pages (track separately)
  - Implementing optimistic updates (future enhancement)

## Action items

[ ] Identify all session mutation hooks in `frontend/src/hooks/useSessions.ts`
[ ] Add `queryClient.invalidateQueries(['sessions'])` to `onSuccess` callback of mutations
[ ] Add `queryClient.invalidateQueries(['dashboard'])` to ensure dashboard refresh
[ ] Test cache invalidation after session create operation
[ ] Test cache invalidation after session update operation
[ ] Test cache invalidation after session close operation
[ ] Verify dashboard updates without manual page reload in all scenarios
[ ] Test edge cases: concurrent mutations, failed mutations, slow network conditions
[ ] Add loading states during cache revalidation if not present

## Open questions

- Should we invalidate optimistically or wait for server confirmation? (Suggest wait for success to avoid showing incorrect state on failure)
```

### Example 3: Refactoring

**User request:**

```
The debt calculation function is too complex and hard to test
```

**Output:**

```markdown
# Plan

Refactor debt calculation logic to improve maintainability and testability. Current implementation has a 200-line function with deeply nested conditions. Approach is to extract smaller pure functions, add comprehensive tests, and preserve exact existing behavior.

## Scope

- In:
  - Extract calculation sub-functions
  - Add unit test coverage for all logic paths
  - Preserve exact behavior (no algorithm changes)
  - Update code documentation
- Out:
  - Changing debt calculation algorithm
  - Modifying API contracts or response format
  - Database schema changes
  - Performance optimizations (separate task if needed)

## Action items

[ ] Review current implementation in `backend/src/services/debts.rs::calculate_debts()`
[ ] Document current behavior with examples for regression testing
[ ] Extract pure functions: `split_by_participants()`, `apply_weights()`, `simplify_debts()`
[ ] Ensure extracted functions are pure (no side effects, deterministic outputs)
[ ] Write unit tests for each extracted function covering edge cases
[ ] Refactor main `calculate_debts()` to compose extracted functions
[ ] Run full integration test suite to verify behavior unchanged
[ ] Add property-based tests for debt calculation invariants (sum of debts = 0, etc.)
[ ] Update function documentation with clearer examples
[ ] Verify performance hasn't regressed (benchmark if noticeable change)

## Open questions

- Should extracted functions go in separate module or stay in debts.rs? (Suggest keep same file for now, can extract later if reused)
```

## Anti-Patterns to Avoid

❌ **Including code:**

```
[ ] Add this function: async fn login() { ... }
```

❌ **Meta-commentary:**

```
Here's a comprehensive plan for implementing authentication.
This plan should take about 3 days to complete.
```

❌ **Vague steps:**

```
[ ] Fix the backend
[ ] Update frontend
```

❌ **Asking non-blocking questions:**

```
1. What should we name the function?
2. Should we add comments?
3. What color should the button be?
4. Should we use tabs or spaces?
```

❌ **Missing validation:**

```
[ ] Implement feature
[ ] Deploy to production
```

## Quality Checklist

Before outputting, verify:

- [ ] Introduction covers what, why, and how in 1-3 sentences
- [ ] Scope defines clear In/Out boundaries
- [ ] 6-10 action items (adjust for complexity)
- [ ] Action items are atomic, verb-first, and specific
- [ ] At least one testing/validation step included
- [ ] At least one edge case or risk step included
- [ ] Open questions section only present if genuinely needed (max 3)
- [ ] No code snippets anywhere
- [ ] No meta-commentary outside template
- [ ] Output is ONLY the plan in template format

## Resources

### references/

- **[template_spec.md](references/template_spec.md)** - Complete template specification with detailed section guidelines, examples, common patterns, and anti-patterns
