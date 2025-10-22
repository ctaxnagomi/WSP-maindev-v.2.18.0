-- QRGGIF Audit Logging System

-- Create audit log table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users,
    action_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action 
ON public.audit_logs(user_id, action_type);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_old_data = row_to_json(OLD)::JSONB;
        v_new_data = NULL;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_old_data = row_to_json(OLD)::JSONB;
        v_new_data = row_to_json(NEW)::JSONB;
    ELSE
        v_old_data = NULL;
        v_new_data = row_to_json(NEW)::JSONB;
    END IF;

    INSERT INTO public.audit_logs (
        user_id,
        action_type,
        table_name,
        record_id,
        old_data,
        new_data,
        ip_address,
        user_agent
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id 
            ELSE NEW.id 
        END,
        v_old_data,
        v_new_data,
        current_setting('request.headers')::json->>'x-forwarded-for',
        current_setting('request.headers')::json->>'user-agent'
    );

    RETURN NULL;
END;
$$;

-- Add audit triggers to tables
CREATE TRIGGER audit_qr_codes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.qr_codes
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_profiles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_settings_trigger
    AFTER UPDATE ON public.settings
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Add more granular roles
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'security_admin' BEFORE 'admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'auditor' BEFORE 'viewer';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'generator' BEFORE 'viewer';

-- Update ROLES permissions function
CREATE OR REPLACE FUNCTION public.get_role_permissions(p_role user_role)
RETURNS TEXT[]
LANGUAGE sql
STABLE
AS $$
    SELECT CASE p_role
        WHEN 'security_admin' THEN 
            ARRAY[
                'read', 'write', 'delete', 
                'manage_users', 'manage_settings', 
                'manage_security', 'view_audit_logs',
                'manage_roles'
            ]
        WHEN 'admin' THEN 
            ARRAY[
                'read', 'write', 'delete', 
                'manage_users', 'manage_settings', 
                'view_audit_logs'
            ]
        WHEN 'auditor' THEN 
            ARRAY[
                'read', 'view_audit_logs', 
                'export_logs', 'generate_reports'
            ]
        WHEN 'manager' THEN 
            ARRAY[
                'read', 'write', 'manage_qrggifs', 
                'validate_qrggifs'
            ]
        WHEN 'generator' THEN 
            ARRAY[
                'read', 'generate_qrggifs', 
                'view_own_qrggifs'
            ]
        WHEN 'viewer' THEN 
            ARRAY['read']
        ELSE 
            ARRAY['read']
    END;
$$;