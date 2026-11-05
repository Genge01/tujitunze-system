-- Migration 0032
-- Deactivate the platform's former fallback insurer.
-- Preserve provider and plan records for referential integrity and audit history.

BEGIN;

UPDATE insurance_plans
SET status = 'Inactive'
WHERE provider_id IN (
    SELECT provider_id
    FROM insurance_providers
    WHERE LOWER(provider_name) = LOWER('Tujitunze Insurance')
);

UPDATE insurance_providers
SET status = 'Inactive'
WHERE LOWER(provider_name) = LOWER('Tujitunze Insurance');

COMMIT;
