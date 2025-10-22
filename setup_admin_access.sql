-- Admin PIN Access Setup
CREATE TABLE IF NOT EXISTS public.admin_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pin_hash TEXT NOT NULL,
    role_type admin_role NOT NULL,
    nickname TEXT NOT NULL,
    last_used TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_pin CHECK (LENGTH(pin_hash) = 64) -- SHA-256 hash length
);

-- Create admin role enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
        CREATE TYPE admin_role AS ENUM ('security_admin', 'report_admin', 'user_admin', 'audit_admin');
    END IF;
END $$;

-- Function to validate admin PIN
CREATE OR REPLACE FUNCTION public.validate_admin_pin(
    p_pin TEXT,
    p_nickname TEXT
) RETURNS TABLE (
    is_valid BOOLEAN,
    role_type admin_role,
    message TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_pin_hash TEXT;
BEGIN
    -- Hash the provided PIN
    v_pin_hash := encode(digest(p_pin, 'sha256'), 'hex');
    
    RETURN QUERY
    SELECT 
        TRUE as is_valid,
        ap.role_type,
        'Access granted' as message
    FROM admin_pins ap
    WHERE ap.pin_hash = v_pin_hash
    AND ap.nickname = p_nickname
    AND ap.is_active = true
    LIMIT 1;
    
    -- If no results, return invalid
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE,
            NULL::admin_role,
            'Invalid PIN or nickname'::TEXT;
        RETURN;
    END IF;
    
    -- Update last used timestamp
    UPDATE admin_pins 
    SET last_used = NOW()
    WHERE pin_hash = v_pin_hash
    AND nickname = p_nickname;
END;
$$;

-- Insert default admin PINs (hashed)
INSERT INTO public.admin_pins (pin_hash, role_type, nickname) VALUES
(encode(digest('12321', 'sha256'), 'hex'), 'security_admin', 'Security'),
(encode(digest('45654', 'sha256'), 'hex'), 'report_admin', 'Reports'),
(encode(digest('78987', 'sha256'), 'hex'), 'user_admin', 'Users'),
(encode(digest('13531', 'sha256'), 'hex'), 'audit_admin', 'Audit')
ON CONFLICT DO NOTHING;

-- Function to generate PDF reports with watermark
CREATE OR REPLACE FUNCTION public.generate_admin_report(
    p_report_type TEXT,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_format TEXT DEFAULT 'pdf'
) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_report_data JSONB;
    v_template_id TEXT;
    v_watermark TEXT;
BEGIN
    -- Verify user has report access
    IF NOT EXISTS (
        SELECT 1 FROM admin_pins 
        WHERE role_type IN ('security_admin', 'report_admin') 
        AND last_used > NOW() - INTERVAL '1 hour'
    ) THEN
        RAISE EXCEPTION 'Unauthorized access to report generation';
    END IF;

    -- Get report data based on type
    CASE p_report_type
        WHEN 'activity' THEN
            SELECT jsonb_build_object(
                'title', 'Activity Report',
                'generated_at', NOW(),
                'period', jsonb_build_object('start', p_start_date, 'end', p_end_date),
                'data', jsonb_agg(
                    jsonb_build_object(
                        'timestamp', created_at,
                        'action', action_type,
                        'user', user_id,
                        'details', new_data
                    )
                )
            ) INTO v_report_data
            FROM audit_logs
            WHERE created_at BETWEEN p_start_date AND p_end_date;

        WHEN 'qrggif' THEN
            SELECT jsonb_build_object(
                'title', 'QRGGIF Status Report',
                'generated_at', NOW(),
                'period', jsonb_build_object('start', p_start_date, 'end', p_end_date),
                'data', jsonb_agg(
                    jsonb_build_object(
                        'nickname', nickname,
                        'status', CASE 
                            WHEN expires_at > NOW() THEN 'Active'
                            ELSE 'Expired'
                        END,
                        'created_at', created_at,
                        'expires_at', expires_at
                    )
                )
            ) INTO v_report_data
            FROM qr_codes
            WHERE created_at BETWEEN p_start_date AND p_end_date;

        WHEN 'user' THEN
            SELECT jsonb_build_object(
                'title', 'User Activity Report',
                'generated_at', NOW(),
                'period', jsonb_build_object('start', p_start_date, 'end', p_end_date),
                'data', jsonb_agg(
                    jsonb_build_object(
                        'username', p.username,
                        'role', p.role,
                        'last_login', p.last_login,
                        'status', CASE WHEN p.active THEN 'Active' ELSE 'Inactive' END
                    )
                )
            ) INTO v_report_data
            FROM profiles p
            WHERE last_login BETWEEN p_start_date AND p_end_date;
            
        ELSE
            RAISE EXCEPTION 'Invalid report type: %', p_report_type;
    END CASE;

    -- Add watermark
    v_watermark := format('WSPA v2.18.0 - Generated by %s on %s', 
                         current_user, 
                         to_char(current_timestamp, 'YYYY-MM-DD HH24:MI:SS'));

    -- Store report in temporary storage with watermark
    INSERT INTO temp_reports (
        report_id,
        report_data,
        watermark,
        format,
        created_at
    ) VALUES (
        gen_random_uuid(),
        v_report_data,
        v_watermark,
        p_format,
        NOW()
    ) RETURNING report_id::TEXT INTO v_template_id;

    RETURN v_template_id;
END;
$$;