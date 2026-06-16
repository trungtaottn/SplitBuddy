# Frontend Core Type UX Cleanup Report

Date: 2026-06-02

## Completed

- `DashboardPage`: typed retry handlers, archive error message helper, Decimal settled-session comparison.
- `ImportExportModal`: CSV preview/import/export errors now use `unknown` + shared error extraction.
- `FeatureFlagsContext` and `NotificationBell`: retry 429 detection uses typed helper.
- `NotificationDropdown`: notification deep links validate `session_id` before navigation.
- `useFeed`: optimistic like cache update typed as `GetFeedResponse`.
- `AppLayout`: nav icons typed as `LucideIcon` and rendered in desktop nav.
- `errorHandler`: added typed `getErrorStatus` and `isRateLimitError`.
- `Makefile` and CI money/type guard now include the newly cleaned visible-flow files.

## Verification

- `npm run type-check`: pass.
- `npm run lint`: pass, 40 warnings remaining.
- `npm test`: pass, 5 money tests.
- `npm run build`: pass.
- `make check-money`: pass.

## Remaining

- `PersonaEditor`, `MusicContext`, `WebSocketContext`, `types/api.ts`, `utils/sounds.ts` still have explicit `any` warnings.
- Hook dependency and fast-refresh warnings remain.
- Next best slice: clean `MusicContext` and `WebSocketContext` type/runtime edges or split `SessionDetailPage`.

## Unresolved Questions

- None.
