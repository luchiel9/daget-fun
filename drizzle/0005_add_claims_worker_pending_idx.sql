-- Partial index for the worker's acquireJobs() query.
-- Only indexes rows that are actively being processed (created/failed_retryable/submitted),
-- which is a small fraction of the total claims table (most are confirmed/failed_permanent).
-- Uses CONCURRENTLY to avoid blocking writes during index creation.
CREATE INDEX CONCURRENTLY IF NOT EXISTS claims_worker_pending_idx
ON claims(status, locked_until, next_retry_at)
WHERE status IN ('created', 'failed_retryable', 'submitted');
