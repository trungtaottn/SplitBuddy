# Output Format Specification

When refining a user's raw request into a structured AI prompt, output MUST follow this exact structure:

## 1. Inferred Intent

**Purpose:** Capture WHY the user wants this, not just WHAT they asked for.

**Format:**

```
The user wants to [root goal] because [underlying need/constraint].
```

**Guidelines:**

- Focus on business value or outcome
- Identify the underlying problem, not just surface request
- Connect to project context when relevant

**Example:**

```
The user wants to add a payment settlement feature because users need a clear way to track and resolve debts within expense-sharing sessions.
```

---

## 2. User Goal

**Purpose:** Describe the concrete outcome the user expects after the task is complete.

**Format:**
Bullet list of observable outcomes or deliverables.

**Guidelines:**

- Be specific and measurable
- Focus on "done" criteria
- Include both functional and non-functional requirements if applicable

**Example:**

```
- A settlement API endpoint that allows users to mark debts as paid
- Frontend UI component for recording settlements with timestamp
- Updated database schema to track settlement status
- Validation to prevent double-settling the same debt
```

---

## 3. Relevant Project Context Used

**Purpose:** Show which project-specific information was considered in the refinement.

**Format:**
Bullet list referencing specific aspects of the project.

**Guidelines:**

- Reference actual tech stack, architecture patterns, or domain rules
- Include file paths or module names when relevant
- Mention constraints or conventions from the project

**Example:**

```
- Current tech stack: Rust backend (Axum framework), React TypeScript frontend
- Existing debt tracking system in `backend/src/routes/debts.rs`
- Database uses PostgreSQL with Diesel ORM
- Frontend uses TanStack Query for API state management
- Project follows dark luxury mobile-first design system
```

---

## 4. Assumptions Made

**Purpose:** Make explicit any assumptions used to fill gaps in the user's request.

**Format:**
Numbered list of assumptions with rationale.

**Guidelines:**

- State each assumption clearly
- Explain why the assumption was reasonable given context
- Flag assumptions that may need validation

**Example:**

```
1. Settlement should be one-directional (debtor pays creditor) - based on typical expense-sharing workflow
2. Settlement doesn't require amount verification upfront - user can dispute later if needed
3. Only the debtor or creditor can record a settlement - privacy and permission constraint
4. Settlement creates an immutable record - audit trail requirement
```

---

## 5. Missing Information

**Purpose:** Identify critical gaps that could affect the solution approach.

**Format:**
Bullet list of questions or uncertainties, marked by priority if needed.

**Guidelines:**

- Only list genuinely blocking or high-impact unknowns
- Group related questions together
- Suggest reasonable defaults when possible

**Example:**

```
- [HIGH] Should settlements support partial payments, or only full debt resolution?
- [MEDIUM] What happens if a user tries to settle an already-settled debt?
- [LOW] Do we need settlement notifications (email/push)?
- Default suggestion: Start with full-payment-only, add partial later if needed
```

**Note:** If there is no critical missing information, state:

```
No critical missing information. Sufficient context to proceed with reasonable defaults.
```

---

## 6. Recommended AI Role

**Purpose:** Define the persona and focus area for the AI agent that will execute this prompt.

**Format:**
Single role title + 1-sentence description of responsibilities.

**Common Roles:**

- **Technical Architect:** Design system structure, choose patterns, define interfaces
- **Implementation Engineer:** Write code, implement features, handle edge cases
- **Debugger/Troubleshooter:** Diagnose issues, trace bugs, propose fixes
- **Code Reviewer:** Evaluate code quality, suggest improvements, check standards
- **Project Planner:** Break down work, estimate effort, identify dependencies
- **Documentation Writer:** Create or update docs, explain complex systems
- **Refactoring Specialist:** Improve code structure without changing behavior

**Example:**

```
**Implementation Engineer:** Responsible for implementing the settlement feature end-to-end, including backend API, database migrations, frontend components, and integration tests.
```

---

## 7. Final AI Prompt

**Purpose:** The primary output - a complete, ready-to-execute prompt for another AI agent.

**Format:**
Structured prompt with clear sections, using the recommended role's voice.

**Required Elements:**

1. **Context:** Brief project overview and current state
2. **Objective:** Clear goal statement
3. **Requirements:** Specific, numbered list of what must be delivered
4. **Constraints:** Technical, business, or design constraints to respect
5. **Acceptance Criteria:** How to verify the work is complete
6. **Suggested Approach:** (Optional) Recommended implementation strategy

**Guidelines:**

- Write in second person ("You are...", "Your task is...")
- Be explicit about file paths, function names, patterns when known
- Include code style or architectural patterns to follow
- Specify testing requirements
- Avoid ambiguity - prefer "must" over "should" for requirements

**Example:**

```markdown
# Prompt: Implement Settlement Feature for Expense Sharing

## Context

You are working on **SplitBuddy**, an expense-sharing application built with:

- **Backend:** Rust (Axum framework) with PostgreSQL (Diesel ORM)
- **Frontend:** React TypeScript with TanStack Query
- **Architecture:** RESTful API with JWT authentication

The application currently tracks debts between users within expense-sharing sessions. Users can view who owes whom, but there's no way to mark debts as settled.

## Objective

Implement a settlement system that allows users (debtor or creditor) to record when a debt has been paid, creating an immutable audit trail.

## Requirements

1. **Backend API Endpoint**

   - Create `POST /api/debts/{debt_id}/settle` endpoint in `backend/src/routes/debts.rs`
   - Accept authenticated requests from either debtor or creditor
   - Record settlement timestamp and initiating user
   - Return updated debt object with settlement status

2. **Database Schema**

   - Add migration to extend `debts` table with:
     - `settled_at` (timestamp, nullable)
     - `settled_by_user_id` (foreign key, nullable)
   - Ensure settlement records are immutable once created

3. **Business Logic**

   - Prevent settling an already-settled debt (return 409 Conflict)
   - Only allow debtor or creditor to settle (return 403 Forbidden for others)
   - Settlement must record full debt amount (partial payments out of scope)

4. **Frontend Component**

   - Create `<SettleDebtButton>` component in `frontend/src/components/debts/`
   - Show settlement button only for unsettled debts
   - Display settlement confirmation dialog before API call
   - Update UI optimistically after successful settlement
   - Follow dark luxury design system (glassmorphism, vibrant accents)

5. **Error Handling**

   - Handle all error cases gracefully (network, permissions, already settled)
   - Show user-friendly error messages in Vietnamese
   - Log errors for debugging

6. **Testing**
   - Write unit tests for settlement business logic
   - Write integration test for API endpoint
   - Test frontend component with mock API responses

## Constraints

- **No partial payments:** Settlement must always be for the full debt amount
- **Immutable records:** Once settled, cannot be un-settled or modified
- **Permission model:** Only debtor or creditor can settle, no third parties
- **Audit requirement:** Must record who settled and when
- **Existing patterns:** Follow the code style and patterns in `backend/src/routes/debts.rs` and `frontend/src/components/debts/DebtList.tsx`

## Acceptance Criteria

- [ ] User can click "Settle" button on an unsettled debt from debt list page
- [ ] API prevents double-settlement with clear error message
- [ ] API prevents unauthorized users from settling others' debts
- [ ] Settlement timestamp and user ID are recorded in database
- [ ] Frontend shows settled debts with different visual styling
- [ ] All tests pass and code follows existing project conventions

## Suggested Approach

1. **Start with database migration** - Extend schema first to establish data model
2. **Implement backend API** - Build endpoint with full validation and error handling
3. **Test backend thoroughly** - Verify all error cases and happy path
4. **Build frontend component** - Create UI with proper state management
5. **Integration testing** - Test end-to-end flow manually and with automated tests
6. **Polish UI** - Ensure settlement status is clearly visible and accessible

Begin with the database migration. Create the migration file and show the SQL schema changes.
```

---

## Template Structure

Use this template for consistency:

```
# Inferred Intent
[Single paragraph explaining WHY]

# User Goal
- [Observable outcome 1]
- [Observable outcome 2]
...

# Relevant Project Context Used
- [Context point 1]
- [Context point 2]
...

# Assumptions Made
1. [Assumption 1 with rationale]
2. [Assumption 2 with rationale]
...

# Missing Information
- [Question or unknown 1]
- [Question or unknown 2]
...
OR: No critical missing information. Sufficient context to proceed with reasonable defaults.

# Recommended AI Role
**[Role Title]:** [One-sentence description of responsibilities]

# Final AI Prompt
[Complete, structured prompt following the format above]
```
