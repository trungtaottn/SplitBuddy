# Cache Invalidation Strategy

This document outlines the caching strategy for SplitBuddy v2, designed to ensure high performance while maintaining data consistency.

## 1. Caching Layers

We employ a **Hybrid Caching** strategy:

- **L1: Local In-Memory Cache (Moka)**
  - **Scope**: Per application instance.
  - **Speed**: Microsecond latency.
  - **Use Case**: Extremely hot data (e.g., Feature Flags, Session Details during active use).
  - **Persistence**: None (cleared on restart).

- **L2: Distributed Cache (Redis)**
  - **Scope**: Shared across all instances.
  - **Speed**: Millisecond latency.
  - **Use Case**: Shared session state, User profiles, Rate limiting.
  - **Persistence**: Configurable (volatile-lru).

## 2. Cache Keys & TTLs

| Entity            | Key Pattern      | TTL (Redis) | TTL (Local) |
| :---------------- | :--------------- | :---------- | :---------- |
| **Session**       | `session:{uuid}` | 1 Hour      | 5 Minutes   |
| **User Profile**  | `user:{uuid}`    | 1 Hour      | 5 Minutes   |
| **Feature Flags** | `features:all`   | 1 Hour      | 5 Minutes   |
| **WS Ticket**     | `ticket:{uuid}`  | N/A         | 30 Seconds  |

## 3. Invalidation Strategy

We use a **Write-Through / Invalidate-on-Write** approach. When data is modified, the corresponding cache entries are immediately invalidated or updated.

### User Entity

- **Triggers**: `update_me`, `change_password`.
- **Action**: `invalidate_user(user_id)` (Clears L1 & L2).
- **Next Read**: Fetches from DB -> Populates L2 -> Populates L1.

### Session Entity

- **Triggers**:
  - `update_session`, `close_session`, `reopen_session`
  - `add_participant`, `update_participant`, `delete_participant`
  - `create_bill`, `update_bill`, `delete_bill`
- **Action**: `invalidate_session(session_id)` (Clears L1 & L2).
- **Next Read**: Fetches from DB -> Populates L2 -> Populates L1.

### Feature Flags

- **Triggers**: Admin updates via API/Console.
- **Action**: `invalidate_feature_flags()` (Clears L1 & L2).

## 4. Frontend Cache Invalidation

The frontend uses `React Query` and relies on **WebSocket Events** to invalidate its local state.

| Event                        | Action in Frontend                                     |
| :--------------------------- | :----------------------------------------------------- |
| `BillUpdated`, `BillDeleted` | `queryClient.invalidateQueries(['session-bills', id])` |
| `DebtsRecalculated`          | `queryClient.invalidateQueries(['session-debts', id])` |
| `SessionStatusChanged`       | `queryClient.invalidateQueries(['session', id])`       |
| `ParticipantUpdated`         | `queryClient.invalidateQueries(['session', id])`       |

## 5. Best Practices

1.  **Always Invalidate**: Never assume a change is "small enough" to skip invalidation. Stale data erodes trust.
2.  **Hybrid Fallback**: Always implement `get` to check L1 -> L2 -> DB.
3.  **Atomic Integrity**: When possible, use transactions for DB updates before invalidating cache to ensure subsequent reads see committed data.
