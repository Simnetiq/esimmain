-- RPC: verify_contact — atomically verify a contact code and update account
-- Date: 2026-03-03

CREATE OR REPLACE FUNCTION verify_contact(p_account_id text, p_code text)
RETURNS jsonb AS $$
DECLARE
  v_record record;
  v_result jsonb;
BEGIN
  -- Find the most recent matching, unexpired, unverified code with attempts < 5
  SELECT *
  INTO v_record
  FROM verification_codes
  WHERE account_id = p_account_id
    AND code = p_code
    AND verified_at IS NULL
    AND expires_at > now()
    AND attempts < 5
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no matching code found, check if there's an unverified code to increment attempts
  IF v_record IS NULL THEN
    -- Increment attempts on the most recent unverified code for this account
    UPDATE verification_codes
    SET attempts = attempts + 1
    WHERE id = (
      SELECT id
      FROM verification_codes
      WHERE account_id = p_account_id
        AND verified_at IS NULL
        AND expires_at > now()
      ORDER BY created_at DESC
      LIMIT 1
    );

    -- Determine the specific error
    IF EXISTS (
      SELECT 1 FROM verification_codes
      WHERE account_id = p_account_id
        AND verified_at IS NULL
        AND expires_at > now()
        AND attempts >= 5
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'max_attempts_exceeded');
    ELSIF EXISTS (
      SELECT 1 FROM verification_codes
      WHERE account_id = p_account_id
        AND code = p_code
        AND verified_at IS NULL
        AND expires_at <= now()
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'code_expired');
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
    END IF;
  END IF;

  -- Mark code as verified
  UPDATE verification_codes
  SET verified_at = now()
  WHERE id = v_record.id;

  -- Update account with verified contact info
  UPDATE accounts
  SET contact_verified = true,
      contact_method = v_record.method,
      contact_value = v_record.contact_value
  WHERE account_id = p_account_id;

  RETURN jsonb_build_object(
    'success', true,
    'account_id', p_account_id,
    'method', v_record.method,
    'contact_value', v_record.contact_value
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
