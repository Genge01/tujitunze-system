BEGIN;

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_account_status_check;

ALTER TABLE users
ADD CONSTRAINT users_account_status_check
CHECK (
    account_status IN ('Active', 'Deactivated', 'Deleted')
);

COMMENT ON COLUMN users.account_status IS
'Account lifecycle: Active, Deactivated, or Deleted. Deleted accounts are anonymized and retained for historical integrity.';

COMMIT;
