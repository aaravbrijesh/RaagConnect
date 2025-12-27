import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingEmailRequest {
  to: string;
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  status: "confirmed" | "rejected";
}

// Escape HTML special characters to prevent XSS in email clients
const escapeHtml = (str: string): string => {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (c) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return entities[c] || c;
  });
};

// Validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { to, attendeeName, eventTitle, eventDate, eventTime, eventLocation, status } = body as BookingEmailRequest;

    // Validate required fields
    if (!to || !attendeeName || !eventTitle || !eventDate || !status) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    if (!isValidEmail(to)) {
      console.error("Invalid email format:", to);
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate input lengths to prevent abuse
    if (attendeeName.length > 100) {
      return new Response(
        JSON.stringify({ error: "Attendee name too long (max 100 characters)" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (eventTitle.length > 200) {
      return new Response(
        JSON.stringify({ error: "Event title too long (max 200 characters)" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    if (eventLocation && eventLocation.length > 500) {
      return new Response(
        JSON.stringify({ error: "Event location too long (max 500 characters)" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate status
    if (status !== "confirmed" && status !== "rejected") {
      return new Response(
        JSON.stringify({ error: "Invalid status" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Escape all user-provided content for safe HTML embedding
    const safeAttendeeName = escapeHtml(attendeeName);
    const safeEventTitle = escapeHtml(eventTitle);
    const safeEventDate = escapeHtml(eventDate);
    const safeEventTime = escapeHtml(eventTime || '');
    const safeEventLocation = escapeHtml(eventLocation || 'TBA');

    console.log(`Sending ${status} email to ${to} for event: ${eventTitle}`);

    const isConfirmed = status === "confirmed";
    const subject = isConfirmed 
      ? `🎵 Your booking for "${safeEventTitle}" is confirmed!`
      : `Booking update for "${safeEventTitle}"`;

    const html = isConfirmed
      ? `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a; margin-bottom: 20px;">Booking Confirmed! 🎉</h1>
          <p style="color: #333; font-size: 16px;">Dear ${safeAttendeeName},</p>
          <p style="color: #333; font-size: 16px;">Great news! Your booking has been confirmed for:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1a1a1a; margin: 0 0 12px 0;">${safeEventTitle}</h2>
            <p style="margin: 8px 0; color: #666;"><strong>Date:</strong> ${safeEventDate}</p>
            <p style="margin: 8px 0; color: #666;"><strong>Time:</strong> ${safeEventTime}</p>
            <p style="margin: 8px 0; color: #666;"><strong>Location:</strong> ${safeEventLocation}</p>
          </div>
          <p style="color: #333; font-size: 16px;">We look forward to seeing you at the event!</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">Best regards,<br>Raag Connect</p>
        </div>
      `
      : `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a; margin-bottom: 20px;">Booking Update</h1>
          <p style="color: #333; font-size: 16px;">Dear ${safeAttendeeName},</p>
          <p style="color: #333; font-size: 16px;">Unfortunately, your booking for the following event could not be confirmed:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1a1a1a; margin: 0 0 12px 0;">${safeEventTitle}</h2>
            <p style="margin: 8px 0; color: #666;"><strong>Date:</strong> ${safeEventDate}</p>
          </div>
          <p style="color: #333; font-size: 16px;">This may be due to payment verification issues or event capacity. Please contact the organizer for more details.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">Best regards,<br>Raag Connect</p>
        </div>
      `;

    const { data, error: resendError } = await resend.emails.send({
      from: "Raag Connect <noreply@raagconnect.com>",
      to: [to],
      subject,
      html,
    });

    if (resendError) {
      console.error("Resend error:", resendError);
      return new Response(
        JSON.stringify({
          error: resendError.message ?? "Failed to send email",
          resend: resendError,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-booking-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
