import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Image data is required' }),
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

    console.log('Analyzing flyer image with AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting event information from flyers and promotional images. 
Extract the following details from the event flyer image:
- Event title/name
- Date (in YYYY-MM-DD format if possible)
- Time (in HH:MM 24-hour format if possible)
- Location/venue name
- Price (just the number, no currency symbol)
- Any additional notes or details

If you cannot determine a field, leave it as null. Be accurate and only extract information that is clearly visible.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this event flyer and extract the event details. Return the information as a JSON object with these fields: title, date, time, location, price, notes'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_event_details',
              description: 'Extract event details from a flyer image',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'The event title or name' },
                  date: { type: 'string', description: 'The event date in YYYY-MM-DD format' },
                  time: { type: 'string', description: 'The event time in HH:MM 24-hour format' },
                  location: { type: 'string', description: 'The venue or location name' },
                  price: { type: 'string', description: 'The ticket price as a number' },
                  notes: { type: 'string', description: 'Any additional event details or notes' }
                },
                required: ['title']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_event_details' } }
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
        JSON.stringify({ success: false, error: 'Failed to analyze flyer' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.function?.arguments) {
      const eventDetails = JSON.parse(toolCall.function.arguments);
      console.log('Extracted event details:', eventDetails);
      
      return new Response(
        JSON.stringify({ success: true, data: eventDetails }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: try to parse from content if no tool call
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const eventDetails = JSON.parse(jsonMatch[0]);
          return new Response(
            JSON.stringify({ success: true, data: eventDetails }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (e) {
        console.error('Failed to parse content as JSON:', e);
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Could not extract event details from flyer' }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing flyer:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
