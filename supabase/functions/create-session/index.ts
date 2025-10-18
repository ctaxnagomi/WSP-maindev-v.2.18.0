import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('PROJECT_URL') ?? ''
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { login_type, guest_pin } = await req.json()
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const referrer = req.headers.get('referer') || null

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

    // Call RPC
    const { data: sessionData, error } = await supabaseClient.rpc('create_session', {
      p_login_type: login_type,
      p_guest_pin: guest_pin,
      p_access_data: accessData
    })

    if (error) throw error

    return new Response(JSON.stringify({ session_id: sessionData, success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})