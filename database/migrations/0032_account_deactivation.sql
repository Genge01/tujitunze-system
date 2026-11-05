BEGIN;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS account_status VARCHAR(20)
NOT NULL DEFAULT 'Active';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_account_status_check'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT users_account_status_check
        CHECK (account_status IN ('Active', 'Deactivated'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sessions_active_member
ON sessions (member_id)
WHERE session_status = 'Active';

COMMENT ON COLUMN users.account_status IS
'Controls system access independently of member registration status.';

COMMIT;
