-- RPC function for safe user account deletion
-- This function deletes all user data from related tables in the correct order

CREATE OR REPLACE FUNCTION delete_user_account_data(user_id_to_delete UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deletion_count INTEGER := 0;
BEGIN
    -- Check if user exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_id_to_delete) THEN
        RAISE EXCEPTION 'User with ID % does not exist', user_id_to_delete;
    END IF;

    -- Log the deletion attempt (you might want to create an audit log table)
    RAISE NOTICE 'Starting deletion of user account: %', user_id_to_delete;

    -- Delete from user_learning_progress table
    DELETE FROM user_learning_progress WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % records from user_learning_progress', deletion_count;

    -- Delete from family_profiles table (both parent and child relationships)
    DELETE FROM family_profiles WHERE parent_id = user_id_to_delete;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % child family profiles', deletion_count;

    DELETE FROM family_profiles WHERE id IN (
        SELECT id FROM profiles WHERE id = user_id_to_delete
    );
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % main family profiles', deletion_count;

    -- Delete from daily_usage table
    DELETE FROM daily_usage WHERE user_id = user_id_to_delete;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % records from daily_usage', deletion_count;

    -- Delete from otp_codes table
    DELETE FROM otp_codes WHERE phone IN (
        SELECT phone FROM profiles WHERE id = user_id_to_delete
    );
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % records from otp_codes', deletion_count;

    -- Finally, delete the main profile
    DELETE FROM profiles WHERE id = user_id_to_delete;
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % records from profiles', deletion_count;

    RAISE NOTICE 'Successfully completed deletion of user account: %', user_id_to_delete;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account_data(UUID) TO service_role;

-- Create a safer version with additional confirmation
CREATE OR REPLACE FUNCTION delete_user_account_data_safe(
    user_id_to_delete UUID,
    confirmation_phone TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_phone TEXT;
BEGIN
    -- Get the user's phone number for verification
    SELECT phone INTO user_phone FROM profiles WHERE id = user_id_to_delete;
    
    -- Verify the phone number matches
    IF user_phone IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    IF user_phone != confirmation_phone THEN
        RAISE EXCEPTION 'Phone number confirmation does not match';
    END IF;

    -- Call the main deletion function
    PERFORM delete_user_account_data(user_id_to_delete);
END;
$$;

-- Grant execute permission for the safe version
GRANT EXECUTE ON FUNCTION delete_user_account_data_safe(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account_data_safe(UUID, TEXT) TO service_role;

-- Create a function to get user summary before deletion (for admin review)
CREATE OR REPLACE FUNCTION get_user_deletion_summary(user_id_to_delete UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'user_id', p.id,
        'phone', p.phone,
        'created_at', p.created_at,
        'family_profile', (
            SELECT jsonb_build_object(
                'full_name', fp.full_name,
                'total_xp', fp.total_xp,
                'total_coins', fp.total_coins,
                'is_premium', fp.is_premium,
                'current_streak', fp.current_streak
            )
            FROM family_profiles fp WHERE fp.id = p.id
        ),
        'learning_progress_count', (SELECT COUNT(*) FROM user_learning_progress WHERE user_id = p.id),
        'daily_usage_count', (SELECT COUNT(*) FROM daily_usage WHERE user_id = p.id),
        'otp_codes_count', (SELECT COUNT(*) FROM otp_codes WHERE phone = p.phone),
        'child_profiles_count', (SELECT COUNT(*) FROM family_profiles WHERE parent_id = p.id)
    ) INTO result
    FROM profiles p WHERE p.id = user_id_to_delete;
    
    IF result IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    RETURN result;
END;
$$;

-- Grant execute permission for the summary function
GRANT EXECUTE ON FUNCTION get_user_deletion_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_deletion_summary(UUID) TO service_role;

COMMENT ON FUNCTION delete_user_account_data(UUID) IS 'Deletes all user data from all related tables';
COMMENT ON FUNCTION delete_user_account_data_safe(UUID, TEXT) IS 'Safe deletion with phone confirmation';
COMMENT ON FUNCTION get_user_deletion_summary(UUID) IS 'Returns user data summary before deletion';
