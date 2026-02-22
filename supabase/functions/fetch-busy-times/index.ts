import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function parseICalDate(dateStr: string): Date | null {
  // Handle DTSTART;VALUE=DATE:20260101 and DTSTART:20260101T120000Z formats
  const cleaned = dateStr.replace(/^(DTSTART|DTEND)[^:]*:/, '');
  if (cleaned.length === 8) {
    // Date only: YYYYMMDD
    const y = parseInt(cleaned.slice(0, 4));
    const m = parseInt(cleaned.slice(4, 6)) - 1;
    const d = parseInt(cleaned.slice(6, 8));
    return new Date(y, m, d);
  }
  if (cleaned.length >= 15) {
    // DateTime: YYYYMMDDTHHmmss or YYYYMMDDTHHmmssZ
    const y = parseInt(cleaned.slice(0, 4));
    const m = parseInt(cleaned.slice(4, 6)) - 1;
    const d = parseInt(cleaned.slice(6, 8));
    const h = parseInt(cleaned.slice(9, 11));
    const min = parseInt(cleaned.slice(11, 13));
    const s = parseInt(cleaned.slice(13, 15));
    if (cleaned.endsWith('Z')) {
      return new Date(Date.UTC(y, m, d, h, min, s));
    }
    return new Date(y, m, d, h, min, s);
  }
  return null;
}

function extractBusyTimes(icalText: string, rangeStart: Date, rangeEnd: Date): Array<{ start: string; end: string }> {
  const busyTimes: Array<{ start: string; end: string }> = [];
  
  // Unfold lines (lines starting with space/tab are continuations)
  const unfolded = icalText.replace(/\r\n[ \t]/g, '').replace(/\r/g, '');
  const lines = unfolded.split('\n');
  
  let inEvent = false;
  let dtstart: Date | null = null;
  let dtend: Date | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      dtstart = null;
      dtend = null;
    } else if (trimmed === 'END:VEVENT') {
      if (inEvent && dtstart && dtend) {
        // Only include events that overlap with our range
        if (dtstart < rangeEnd && dtend > rangeStart) {
          busyTimes.push({
            start: dtstart.toISOString(),
            end: dtend.toISOString(),
          });
        }
      }
      inEvent = false;
    } else if (inEvent) {
      if (trimmed.startsWith('DTSTART')) {
        dtstart = parseICalDate(trimmed);
      } else if (trimmed.startsWith('DTEND')) {
        dtend = parseICalDate(trimmed);
      }
    }
  }

  return busyTimes;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { class_id } = await req.json();
    if (!class_id) {
      return new Response(JSON.stringify({ error: 'class_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );

    const { data: cls, error } = await supabase
      .from('classes')
      .select('ical_url')
      .eq('id', class_id)
      .single();

    if (error || !cls?.ical_url) {
      return new Response(JSON.stringify({ busy_times: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch iCal feed
    const icalResponse = await fetch(cls.ical_url);
    if (!icalResponse.ok) {
      console.error('Failed to fetch iCal:', icalResponse.status);
      return new Response(JSON.stringify({ busy_times: [], error: 'Failed to fetch calendar' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const icalText = await icalResponse.text();
    
    // Only return busy times for the next 14 days
    const now = new Date();
    const rangeEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const busyTimes = extractBusyTimes(icalText, now, rangeEnd);

    // Return ONLY start/end times — no event names, descriptions, or any details
    return new Response(JSON.stringify({ busy_times: busyTimes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
