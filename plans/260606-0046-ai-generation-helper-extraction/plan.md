# AI Generation Helper Extraction

- Status: Complete
- Scope: move AI slogan, fallback greeting/chat, and OpenAI request/response helper logic from `backend/src/api/ai.rs` into focused AI generation helper modules.
- Acceptance: `/ai/greeting` and `/ai/chat` route paths, auth, `ai_assistant` feature gate, `OPENAI_API_KEY` behavior, fallback text/actions, OpenAI payload shape, response DTOs, and error mapping unchanged; backend gates pass.
- Out of scope: prompt copy changes, model/provider changes, frontend changes, DTO changes, env/config changes.

## Todo

- [x] Add AI generation helper modules.
- [x] Move generation helpers and update route imports.
- [x] Update docs with new AI module boundary/counts.
- [x] Run format/build/test/clippy and money/foundation checks.
