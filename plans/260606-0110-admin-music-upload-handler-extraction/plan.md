# Admin Music Upload Handler Extraction

- Status: Complete
- Scope: move multipart upload/storage handling from `backend/src/api/admin_music.rs` into `backend/src/api/admin_music_upload.rs`.
- Acceptance: `/admin/music` GET/POST, `/admin/music/url`, and `/admin/music/:id` behavior, admin auth, file validation, 50MB limit behavior, generated filenames, DB inserts/deletes, URL response shape, pagination response, and status envelopes unchanged; backend gates pass.
- Out of scope: DTO changes, schema changes, route path changes, upload size changes, storage path changes, frontend changes.

## Todo

- [x] Add `admin_music_upload` module.
- [x] Move upload handler and filename sanitizer.
- [x] Update docs with new admin music module boundary/counts.
- [x] Run format/build/test/clippy and money/foundation checks.
