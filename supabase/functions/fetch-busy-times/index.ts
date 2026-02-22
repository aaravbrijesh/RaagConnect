import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function parseICalDate(dateStr: string): Date | null {
  const cleaned = dateStr.replace(/^(DTSTART|DTEND)[^:]*:/, '');
  if (cleaned.length === 8) {
    const y = parseInt(cleaned.slice(0, 4));
    const m = parseInt(cleaned.slice(4, 6)) - 1;
    const d = parseInt(cleaned.slice(6, 8));
    return new Date(Date.UTC(y, m, d));
  }
  if (cleaned.length >= 15) {
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

interface CalendarEvent {
  start: string;
  end: string;
  summary: string;
}

function extractEvents(icalText: string, rangeStart: Date, rangeEnd: Date): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  
  const unfolded = icalText.replace(/\r\n[ \t]/g, '').replace(/\r/g, '');
  const lines = unfolded.split('\n');
  
  let inEvent = false;
  let dtstart: Date | null = null;
  let dtend: Date | null = null;
  let summary = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      dtstart = null;
      dtend = null;
      summary = '';
    } else if (trimmed === 'END:VEVENT') {
      if (inEvent && dtstart && dtend) {
        if (dtstart < rangeEnd && dtend > rangeStart) {
          events.push({
            start: dtstart.toISOString(),
            end: dtend.toISOString(),
            summary,
          });
        }
      }
      inEvent = false;
    } else if (inEvent) {
      if (trimmed.startsWith('DTSTART')) {
        dtstart = parseICalDate(trimmed);
      } else if (trimmed.startsWith('DTEND')) {
        dtend = parseICalDate(trimmed);
      } else if (trimmed.startsWith('SUMMARY:')) {
        summary = trimmed.slice(8);
      }
    }
  }

  return events;
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
      return new Response(JSON.stringify({ slots: [], busy_times: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert Google Calendar sharing links to iCal feed URLs
    let icalUrl = cls.ical_url;
    const cidMatch = icalUrl.match(/[?&]cid=([A-Za-z0-9+/=]+)/);
    if (cidMatch) {
      try {
        // Decode base64 email from cid parameter
        const decoded = atob(cidMatch[1]);
        if (decoded.includes('@')) {
          icalUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(decoded)}/public/basic.ics`;
          console.log('Converted sharing link to iCal URL for:', decoded);
        }
      } catch (e) {
        console.error('Failed to decode cid:', e);
      }
    }

    // Fetch iCal feed
    const icalResponse = await fetch(icalUrl);
    if (!icalResponse.ok) {
      console.error('Failed to fetch iCal:', icalResponse.status, 'URL:', icalUrl);
      return new Response(JSON.stringify({ slots: [], busy_times: [], error: 'Failed to fetch calendar' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const icalText = await icalResponse.text();
    
    // Check if it's valid iCal
    if (!icalText.includes('BEGIN:VCALENDAR')) {
      console.error('Not a valid iCal feed. Content starts with:', icalText.slice(0, 200));
      return new Response(JSON.stringify({ slots: [], busy_times: [], error: 'Invalid iCal feed. Please use the "Secret address in iCal format" from Google Calendar settings.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const rangeEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const events = extractEvents(icalText, now, rangeEnd);

    // Return events as available slots (start/end/summary only — no private details)
    const slots = events.map(e => ({
      start: e.start,
      end: e.end,
    }));

    return new Response(JSON.stringify({ slots, busy_times: [] }), {
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
