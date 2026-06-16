# AI DTO Extraction

- Status: Complete
- Scope: move AI request/response DTOs from `backend/src/api/ai.rs` into `backend/src/api/ai_dto.rs`.
- Acceptance: `/ai/greeting` and `/ai/chat` request payloads, response payloads, feature-flag guard, fallback behavior, OpenAI calls, slogans, and route wiring unchanged; backend gates pass.
- Out of scope: prompt/model changes, frontend changes, feature flag behavior changes, API schema changes.

## Todo

- [x] Add `ai_dto` module.
- [x] Move greeting/chat request/response structs and update handler imports.
- [x] Update docs with new AI module boundary/counts.
- [x] Run format/build/test/clippy and money/foundation checks.
