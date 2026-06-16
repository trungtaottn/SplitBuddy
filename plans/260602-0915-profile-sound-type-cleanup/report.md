# Profile Sound Type Cleanup Report

Date: 2026-06-02

## Completed

- `PersonaEditor` mutation payload now uses `UpdatePersonaRequest`.
- `UpdatePersonaRequest.current_title` accepts `null`, matching the existing save behavior.
- `FeedActivity.meta_data` now uses `Record<string, unknown>`.
- `ActivityItem` renders feed metadata through typed string/number accessors.
- `sounds.ts` uses typed `webkitAudioContext` fallback without `window as any`.
- CI/make guard now covers persona, activity item, API metadata, and sounds.

## Verification

- Target scan: no `any` in target files.
- `npm run type-check`: pass.
- `npm run lint`: pass, 33 warnings remaining and no explicit-any warnings.
- `npm test`: pass, 5 money tests.
- `npm run build`: pass.
- `make check-money`: pass.

## Remaining

- Remaining warnings are hook dependency, fast-refresh structure, lexical declaration, and unused var warnings.
- Next best slice: fix `WrappedModal` lexical declaration and unused profile `e` variables, then tackle hook dependency warnings.

## Unresolved Questions

- None.
