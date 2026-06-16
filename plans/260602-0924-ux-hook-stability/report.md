# UX Hook Stability Report

## Completed

- `FloatingChat` initial greeting effect now declares chat history, greeting source, and message dispatcher dependencies.
- `KingsCup` deck generation/shuffle is stable outside render state; mount initialization no longer depends on a component-local function.
- `AnimatedNumber` starts animations from the latest displayed value via ref and cancels pending frames on cleanup.
- Frontend lint warnings reduced from 28 to 25.

## Verification

```bash
cd frontend && npm run type-check
cd frontend && npm run lint
cd frontend && npm test
cd frontend && npm run build
make check-money
```

Result: pass.

Unresolved questions: none.
