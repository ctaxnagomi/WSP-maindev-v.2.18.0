import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (request: Request) => {
  // Initialize request data
  let requestData = {
    login_type: '',
    guest_pin: '',
    qrggif_data: null
  };
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { login_type, guest_pin, qrggif_data } = await req.json()
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const referrer = req.headers.get('referer') || null

    // Rate limiting for QRGGIF auth
    if (login_type === 'qrggif') {
      const { data: rateLimit } = await supabaseClient
        .from('rate_limits')
        .select('count, last_request')
        .eq('ip_address', ip)
        .single();

      const now = new Date();
      if (rateLimit) {
        const timeDiff = now.getTime() - new Date(rateLimit.last_request).getTime();
        if (timeDiff < 3600000 && rateLimit.count > 100) {
          throw new Error('QRGGIF authentication rate limit exceeded');
        }
      }

      // Update rate limit
      await supabaseClient.from('rate_limits').upsert({
        ip_address: ip,
        count: (rateLimit?.count || 0) + 1,
        last_request: now.toISOString()
      });

      // Validate QRGGIF data
      const { data: qrValidation, error: qrError } = await supabaseClient.rpc(
        'validate_qrggif',
        { p_qrggif_data: qrggif_data }
      );
      if (qrError || !qrValidation) {
        throw new Error('Invalid QRGGIF authentication');
      }
    }

    // Device type detection from user_agent
    let deviceType = 'desktop'
    if (/android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
      deviceType = /ipad|ipod/i.test(userAgent) ? 'tablet' : 'mobile'
    }

    // Async geolocation lookup via ipapi.co (free tier, no key needed)
    let geoData = {}
    if (ip !== 'unknown' && ip !== '127.0.0.1' && ip !== '::1') {
      try {
        const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`)
        if (geoResponse.ok) {
          const geo = await geoResponse.json()
          geoData = {
            country: geo.country_name,
            region: geo.region,
            city: geo.city,
            latitude: geo.latitude,
            longitude: geo.longitude,
            timezone: geo.timezone
          }
        }
      } catch (geoError) {
        console.log('Geolocation lookup failed:', geoError)
      }
    }

    const accessData = {
      ip_address: ip,
      user_agent: userAgent,
      referrer,
      device_type: deviceType,
      geolocation: geoData
    }

    // Get current user from token (works for anon/guest sessions)
    const authHeader = req.headers.get('Authorization')!
    if (!authHeader) {
      throw new Error('No authorization header')
    }
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError) throw authError

    // Create session with enhanced metadata
    const { data: sessionData, error } = await supabaseClient.rpc('create_session', {
      p_login_type: login_type,
      p_guest_pin: guest_pin,
      p_qrggif_data: qrggif_data || null,
      p_access_data: {
        ...accessData,
        auth_method: login_type,
        session_created: new Date().toISOString()
      }
    });

    if (error) throw error;

    // Log successful authentication
    await supabaseClient.from('auth_logs').insert({
      user_id: user?.id,
      login_type,
      access_data: accessData,
      qrggif_used: login_type === 'qrggif',
      success: true,
      created_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ 
      session_id: sessionData, 
      success: true,
      auth_type: login_type
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error: any) {
    console.error('Edge Function error:', error);
    
    // Log failed authentication attempt if we have client access
    if (typeof supabaseClient !== 'undefined') {
      try {
        const failedLogin = {
          login_type: login_type || 'unknown',
          access_data: { error: error.message },
          success: false,
          created_at: new Date().toISOString()
        };
        await supabaseClient.from('auth_logs').insert([failedLogin]);
      } catch (logError) {
        console.error('Failed to log auth failure:', logError);
      }
    }

    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})