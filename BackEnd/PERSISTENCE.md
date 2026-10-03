# Durable processing and account sync

Startup applies the additive, idempotent SQL in `prisma/migrations/durable_jobs_and_sync.sql` before accepting requests. Both new tables enable RLS and deny direct access to anonymous/authenticated Supabase clients. The server database role must be allowed to create/access these tables; Firebase authentication remains the API identity source.

Processing requests are stored before returning 202. A worker claims jobs using PostgreSQL `FOR UPDATE SKIP LOCKED`, renews a 180-second lease every 30 seconds, and checks its lease before publishing completed transcript/notes. Restarts reclaim expired leases and recover legacy in-flight lectures. Processing is **at least once**, not exactly once; successful transcript output is reused on retries. Three total attempts are allowed, with 30 seconds between failures. A user retry resets the attempt budget. Queue metadata never stores raw provider errors or credentials.

The worker runs in the API process, one job at a time per process. It is not an always-on external worker: a sleeping Render free instance resumes queued work only when the instance wakes. Speaker analysis/concept extraction remain optional secondary tasks rather than separately durable jobs.

`/api/user-sync` stores owner-scoped, revisioned JSON documents for preferences/appearance, timetable, recent Tutor topics and the last 100 messages per Tutor topic (95 KB client budget). Reads are paginated. Writes use compare-and-swap revisions; stale writes return 409. Lecture-specific histories require ownership. Clients merge independent edits; concurrent changes to the same field use the submitting device's value, and row deletion wins over edits to that deleted row.

Existing local data is backed up during migration. An existing cloud preference document wins over unversioned device preferences. Local edits survive offline operation; sync runs on login, after changes, on focus/online, and every 30 seconds. Active Tutor streaming protects its document from remote replacement until its completed messages can be merged. Account deletion pauses client sync and removes cloud documents through the existing authenticated profile-deletion flow. Exports include cloud documents.

Verification:

- `npm run test:persistence` — validation and authenticated route/CAS checks.
- PowerShell: `$env:RUN_PERSISTENCE_DB_TEST='true'; npm run test:persistence` — actual PostgreSQL queue checks in a rolled-back transaction with temporary shadow tables. No existing application rows are changed.
- Frontend: `npm run test:sync` — isolated device caches, offline edits, CAS conflicts and merge rules.
