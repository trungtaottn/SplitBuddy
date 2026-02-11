# Plan Template Specification

This document defines the exact template format and guidelines for creating plans with the create-plan skill.

## Required Template Structure

Every plan MUST follow this exact structure:

```markdown
# Plan

<1–3 sentences describing what will be done, why it is needed, and the high-level approach.>

## Scope

- In:
  - <Item 1>
  - <Item 2>
  - ...
- Out:
  - <Item 1>
  - <Item 2>
  - ...

## Action items

[ ] <Step 1>
[ ] <Step 2>
[ ] <Step 3>
[ ] <Step 4>
[ ] <Step 5>
[ ] <Step 6>
[ ] ...

## Open questions

- <Question 1>
- <Question 2>
- <Question 3>
```

---

## Section Guidelines

### 1. Introduction (1–3 sentences)

**Purpose:** Provide context and high-level approach.

**Must include:**

- **What** will be done
- **Why** it is needed (motivation, business value, or problem being solved)
- **How** it will be approached (high-level strategy)

**Format:** Plain paragraph, 1–3 sentences maximum.

**Examples:**

✅ **Good:**

```
We will add JWT-based authentication to secure API endpoints. This is needed because
the application currently has no access control, exposing sensitive user data. The
approach is to implement token generation on login, middleware for validation, and
frontend token storage.
```

❌ **Bad:**

```
This plan is about authentication. We need to add it.
```

(Too vague, missing why and how)

---

### 2. Scope

**Purpose:** Clearly define boundaries - what IS and ISN'T part of this task.

**Format:**

- **In:** Bulleted list of what WILL be done
- **Out:** Bulleted list of what will NOT be done (deferred, out of scope, or future work)

**Guidelines:**

- Be explicit about boundaries to prevent scope creep
- Include OUT items that might be expected but aren't included
- Reference specific features, files, or systems when helpful

**Examples:**

✅ **Good:**

```
## Scope
- In:
  - JWT token generation and validation
  - Login/logout API endpoints
  - Frontend authentication state management
  - Protected route middleware
  - Basic email/password authentication
- Out:
  - OAuth/social login (deferred to phase 2)
  - Password reset functionality
  - Two-factor authentication
  - Session management across devices
```

❌ **Bad:**

```
## Scope
- In:
  - Add auth
- Out:
  - Other stuff
```

(Too vague, uninformative)

---

### 3. Action Items

**Purpose:** Provide an ordered, atomic checklist of concrete steps to execute.

**Format:** Checkbox list with `[ ]` prefix.

**Guidelines:**

**Quantity:**

- Default: 6–10 items
- Adjust based on task complexity
- Avoid excessive micro-steps or overly broad steps

**Ordering:**

- Follow logical flow: **discovery → changes → validation → rollout**
- Common pattern:
  1. Research/understand existing code
  2. Design/plan changes
  3. Implement core changes
  4. Add tests
  5. Handle edge cases
  6. Validate/verify
  7. Deploy/rollout (if applicable)

**Quality Characteristics:**

✅ **Atomic:** Each item is a single, well-defined action
✅ **Verb-first:** Start with action verb (Add, Create, Update, Test, Verify, Deploy)
✅ **Specific:** Reference likely files, modules, functions, or commands
✅ **Includes validation:** At least one testing/verification step
✅ **Includes edge cases:** At least one risk or edge case consideration

**Good Action Items:**

```
[ ] Review existing authentication patterns in `backend/src/routes/users.rs`
[ ] Create migration to add `users.password_hash` and `users.email` columns
[ ] Implement JWT token generation in `backend/src/auth/jwt.rs` using `jsonwebtoken` crate
[ ] Add POST `/api/auth/login` and `/api/auth/logout` endpoints
[ ] Create authentication middleware in `backend/src/middleware/auth.rs`
[ ] Add frontend login form component in `frontend/src/components/auth/LoginForm.tsx`
[ ] Implement token storage using localStorage and axios interceptor
[ ] Write integration tests for login/logout flow
[ ] Test edge cases: expired tokens, invalid credentials, concurrent sessions
[ ] Update API documentation with authentication requirements
```

**Bad Action Items:**

```
[ ] Do the backend
[ ] Handle frontend
[ ] Add tests
[ ] Deploy
```

(Too vague, not atomic, no file references)

**Required Elements:**

Every plan MUST include at least:

- ✅ **One validation/testing step** (e.g., "Run integration tests", "Verify edge cases")
- ✅ **One edge case or risk-related step** (e.g., "Handle concurrent requests", "Test error scenarios")

---

### 4. Open Questions

**Purpose:** Document remaining uncertainties that could affect implementation.

**Format:** Bulleted list, maximum 3 items.

**Guidelines:**

- Only include genuinely blocking or high-impact unknowns
- Ask specific, answerable questions
- Prefer multiple-choice format when possible
- Suggest reasonable defaults if available

**When to include:**

- Critical technical decision points
- Ambiguous requirements
- Dependencies on external factors
- Performance or scalability considerations

**When to omit:**

- If there are no significant unknowns, omit this section entirely
- Don't ask questions just for completeness

**Examples:**

✅ **Good:**

```
## Open questions
- Should tokens expire after 15 minutes or 1 hour? (Production standard is 15 min)
- Do we need refresh tokens, or re-authenticate on expiry? (Suggest refresh tokens for UX)
- Should we rate-limit login attempts? (Recommend yes, 5 attempts per 15 min)
```

✅ **Also acceptable (if no unknowns):**

```
(Section omitted - sufficient context to proceed)
```

❌ **Bad:**

```
## Open questions
- How should auth work?
- What about the database?
- Should we add tests?
```

(Too vague, should have been clarified during planning)

---

## Common Patterns

### Pattern 1: New Feature Implementation

```markdown
# Plan

We will implement a user profile editing feature to allow users to update their personal information.
This is needed to meet MVP requirements for user account management. The approach is to add backend
API endpoints, extend the database schema, and create a frontend form component.

## Scope

- In:
  - Profile update API endpoint
  - Database migration for profile fields
  - Frontend profile edit form
  - Field validation (email, phone)
  - Profile picture upload
- Out:
  - Account deletion
  - Privacy settings
  - Email verification
  - Notification preferences

## Action items

[ ] Review existing user model in `backend/src/models/user.rs`
[ ] Create migration to add `bio`, `phone`, `avatar_url` fields
[ ] Implement PATCH `/api/users/:id/profile` endpoint with validation
[ ] Add S3/storage integration for avatar uploads
[ ] Create `ProfileEditForm` component in `frontend/src/components/profile/`
[ ] Add form validation using Zod schema
[ ] Write unit tests for validation logic
[ ] Test edge cases: image size limits, invalid phone formats, XSS in bio
[ ] Add optimistic UI updates for profile changes
[ ] Update API documentation

## Open questions

- Maximum file size for avatar uploads? (Suggest 5MB limit)
- Allow users to delete their avatar? (Suggest yes, revert to default)
```

### Pattern 2: Bug Fix

```markdown
# Plan

Fix the dashboard loading issue where users see stale data after updating a session. Root cause
is that TanStack Query cache isn't being invalidated after mutations. Approach is to add proper
cache invalidation to session update mutations.

## Scope

- In:
  - Add cache invalidation to session mutation hooks
  - Fix dashboard data freshness
  - Test cache behavior after updates
- Out:
  - Refactoring entire cache architecture
  - Global cache configuration changes
  - Other pages with similar issues (track separately)

## Action items

[ ] Identify all session mutation hooks in `frontend/src/hooks/useSessions.ts`
[ ] Add `queryClient.invalidateQueries(['sessions'])` after successful mutations
[ ] Add `queryClient.invalidateQueries(['dashboard'])` to update dashboard
[ ] Test cache invalidation on session create, update, close operations
[ ] Verify dashboard updates without manual page reload
[ ] Check for race conditions with concurrent mutations
[ ] Add loading states during cache revalidation
[ ] Verify behavior across different network conditions (slow 3G)

## Open questions

- Should we invalidate immediately or wait for mutation success? (Suggest wait for success)
```

### Pattern 3: Refactoring

```markdown
# Plan

Refactor the debt calculation logic to improve maintainability and testability. Current implementation
has complex nested conditions in a single 200-line function. Approach is to extract smaller, pure functions
and add comprehensive unit tests.

## Scope

- In:
  - Extract pure calculation functions
  - Add unit test coverage
  - Preserve exact behavior (no functional changes)
  - Update related documentation
- Out:
  - Changing debt calculation algorithm
  - Modifying API contracts
  - Database schema changes

## Action items

[ ] Review current debt calculation in `backend/src/services/debts.rs::calculate_debts()`
[ ] Extract sub-functions: `split_by_participants()`, `apply_weights()`, `simplify_debts()`
[ ] Make extracted functions pure (no side effects, deterministic)
[ ] Write unit tests for each extracted function with edge cases
[ ] Refactor main function to compose extracted functions
[ ] Run existing integration tests to verify behavior unchanged
[ ] Add property-based tests for debt calculation invariants
[ ] Update inline documentation with clearer examples
[ ] Verify performance hasn't regressed (benchmark if needed)

## Open questions

- Should we extract to separate module or keep in same file? (Suggest same file for now)
```

---

## Anti-Patterns to Avoid

❌ **Including code snippets:**

```
[ ] Add this code: `async fn login() { ... }`
```

Plans describe WHAT to do, not HOW to implement.

❌ **Meta-commentary:**

```
This plan will help us implement authentication. Following this plan,
we should be able to complete the feature in 3 days.
```

Output ONLY the plan template, no additional commentary.

❌ **Vague steps:**

```
[ ] Handle the backend
[ ] Do frontend work
[ ] Fix bugs
```

Be specific about files, modules, and actions.

❌ **Excessive micro-steps:**

```
[ ] Import jsonwebtoken crate
[ ] Add use statement
[ ] Define struct
[ ] Add field 1
[ ] Add field 2
[ ] ...
```

Keep steps atomic but not trivially small.

❌ **Missing validation:**

```
[ ] Implement feature
[ ] Deploy to production
```

Always include testing and edge case handling.

---

## Template Checklist

Before outputting a plan, verify:

- [ ] Introduction is 1–3 sentences covering what, why, and how
- [ ] Scope clearly defines In and Out boundaries
- [ ] Action items are 6–10 atomic, ordered steps
- [ ] Action items start with verbs and reference specific files/modules
- [ ] At least one validation/testing step is included
- [ ] At least one edge case or risk step is included
- [ ] Open questions section is included only if there are genuine unknowns (max 3)
- [ ] No code snippets are included
- [ ] No meta-commentary outside the template
- [ ] Template sections are in correct order
