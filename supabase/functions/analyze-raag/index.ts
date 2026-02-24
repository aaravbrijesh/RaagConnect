import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { audioBase64, mimeType } = await req.json();

    if (!audioBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Audio data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing audio for Hindustani raag...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `You are an expert in Hindustani classical music (Indian raga system). You have deep knowledge of all raags including their:
- Aroh (ascending scale) and Avroh (descending scale)
- Vadi (most important note) and Samvadi (second most important note)
- Pakad (characteristic phrases)
- Thaat (parent scale)
- Time of performance (prahar)
- Mood/rasa

Listen carefully to the audio provided. Identify the notes (swaras) being used, their patterns, characteristic phrases, and the overall melodic movement. Based on this analysis, determine which Hindustani raag the music is in.

Be thorough in your analysis. If you're uncertain between multiple raags, explain why and rank them by likelihood.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please listen to this audio and identify the Hindustani raag. Provide a detailed analysis of why you believe it is that raag, including the notes used, characteristic phrases you detected, and any other relevant musical details.'
              },
              {
                type: 'input_audio',
                input_audio: {
                  data: audioBase64,
                  format: mimeType === 'audio/wav' ? 'wav' : 'mp3'
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'identify_raag',
              description: 'Identify the Hindustani raag from audio analysis',
              parameters: {
                type: 'object',
                properties: {
                  raag_name: { type: 'string', description: 'The primary identified raag name (e.g., Yaman, Bhairavi, Malkauns)' },
                  confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Confidence level of the identification' },
                  thaat: { type: 'string', description: 'The parent thaat/scale (e.g., Kalyan, Bhairavi, Marwa)' },
                  aroh: { type: 'string', description: 'Ascending scale pattern using sargam notation (Sa Re Ga Ma Pa Dha Ni)' },
                  avroh: { type: 'string', description: 'Descending scale pattern using sargam notation' },
                  vadi: { type: 'string', description: 'The most prominent/important note (vadi swara)' },
                  samvadi: { type: 'string', description: 'The second most important note (samvadi swara)' },
                  pakad: { type: 'string', description: 'Characteristic phrase(s) of the raag' },
                  time_of_day: { type: 'string', description: 'Traditional time of performance' },
                  mood: { type: 'string', description: 'The rasa/mood associated with this raag' },
                  notes_detected: { type: 'string', description: 'The specific swaras/notes detected in the audio' },
                  analysis: { type: 'string', description: 'Detailed explanation of why this raag was identified, including musical evidence' },
                  alternative_raags: { type: 'string', description: 'Other possible raags it could be, if uncertain' }
                },
                required: ['raag_name', 'confidence', 'analysis']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'identify_raag' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI usage limit reached. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Failed to analyze audio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response received');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.function?.arguments) {
      const raagResult = JSON.parse(toolCall.function.arguments);
      console.log('Identified raag:', raagResult.raag_name);

      return new Response(
        JSON.stringify({ success: true, data: raagResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: try content
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      return new Response(
        JSON.stringify({ success: true, data: { raag_name: 'Unknown', analysis: content, confidence: 'low' } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Could not identify raag from the audio' }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing raag:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
