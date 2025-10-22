-- QRGGIF Role-Based Access Control

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'viewer');

-- Create profiles table for user management
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT username_length CHECK (CHAR_LENGTH(username) >= 3)
);

-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
    id INT PRIMARY KEY DEFAULT 1,
    default_expiration INTEGER NOT NULL DEFAULT 15,
    max_expiration INTEGER NOT NULL DEFAULT 1440, -- 24 hours
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1),
    CONSTRAINT valid_expiration CHECK (
        default_expiration >= 15 
        AND max_expiration >= default_expiration
    )
);

-- Insert default settings
INSERT INTO public.settings (id, default_expiration, max_expiration)
VALUES (1, 15, 1440)
ON CONFLICT (id) DO NOTHING;

-- Function to create a new user with role
CREATE OR REPLACE FUNCTION public.create_user_with_role(
    p_email TEXT,
    p_password TEXT,
    p_username TEXT,
    p_role user_role DEFAULT 'viewer'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Create auth user
    v_user_id := (
        SELECT id FROM auth.users 
        WHERE email = p_email
        LIMIT 1
    );
    
    IF v_user_id IS NULL THEN
        v_user_id := (
            WITH new_user AS (
                INSERT INTO auth.users (email, password)
                VALUES (p_email, p_password)
                RETURNING id
            )
            SELECT id FROM new_user
        );
    END IF;

    -- Create profile
    INSERT INTO public.profiles (id, username, role)
    VALUES (v_user_id, p_username, p_role);

    RETURN v_user_id;
END;
$$;

-- Function to update user role
CREATE OR REPLACE FUNCTION public.update_user_role(
    p_user_id UUID,
    p_new_role user_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only admins can change roles
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Insufficient permissions';
    END IF;

    -- Update role
    UPDATE profiles 
    SET 
        role = p_new_role,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN FOUND;
END;
$$;

-- Function to update QRGGIF expiration
CREATE OR REPLACE FUNCTION public.update_qrggif_expiration(
    p_id UUID,
    p_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_max_expiration INTEGER;
BEGIN
    -- Get maximum allowed expiration
    SELECT max_expiration INTO v_max_expiration 
    FROM settings 
    WHERE id = 1;

    -- Validate expiration time
    IF p_minutes < 15 OR p_minutes > v_max_expiration THEN
        RAISE EXCEPTION 'Invalid expiration time. Must be between 15 and % minutes', v_max_expiration;
    END IF;

    -- Update expiration
    UPDATE qr_codes
    SET 
        expiration_minutes = p_minutes,
        expires_at = 
            CASE 
                WHEN last_validated_at IS NOT NULL 
                THEN last_validated_at + (p_minutes || ' minutes')::INTERVAL
                ELSE NULL
            END,
        updated_at = NOW()
    WHERE id = p_id;

    RETURN FOUND;
END;
$$;

-- Row Level Security Policies

-- Profiles table policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything" ON public.profiles
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    ));

CREATE POLICY "Users can read other profiles" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- QR codes table policies
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read QR codes" ON public.qr_codes
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins and managers can create QR codes" ON public.qr_codes
    FOR INSERT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
    ));

CREATE POLICY "Admins and managers can update QR codes" ON public.qr_codes
    FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
    ));

CREATE POLICY "Only admins can delete QR codes" ON public.qr_codes
    FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    ));

-- Settings table policies
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read settings" ON public.settings
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can update settings" ON public.settings
    FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    ));

-- Create default admin user
SELECT create_user_with_role(
    'admin@example.com',
    crypt('admin123', gen_salt('bf')),
    'admin',
    'admin'
);