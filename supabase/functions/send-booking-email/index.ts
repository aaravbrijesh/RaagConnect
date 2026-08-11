import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    // 2. Validate input — only a booking id is accepted; all content comes from the database
    const body = await req.json().catch(() => null);
    const bookingId = body?.bookingId;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof bookingId !== "string" || !uuidRegex.test(bookingId)) {
      return json({ error: "A valid bookingId is required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("id, user_id, event_id, attendee_email, attendee_name, status")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError) {
      console.error("Failed to load booking", bookingError);
      return json({ error: "Failed to load booking" }, 500);
    }
    if (!booking) {
      return json({ error: "Booking not found" }, 404);
    }

    const { data: event, error: eventError } = await admin
      .from("events")
      .select("id, user_id, title, date, time, location_name")
      .eq("id", booking.event_id)
      .maybeSingle();

    if (eventError || !event) {
      console.error("Failed to load event", eventError);
      return json({ error: "Failed to load event" }, 500);
    }

    // 3. Authorize: attendee, event organizer, or admin only
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: userId });
    const isAttendee = booking.user_id === userId;
    const isOrganizer = event.user_id === userId;
    if (!isAdmin && !isAttendee && !isOrganizer) {
      return json({ error: "Forbidden" }, 403);
    }

    // 4. Only notify about the booking's actual, persisted status
    const status = booking.status;
    if (status !== "confirmed" && status !== "rejected") {
      return json({ error: "Booking has no notifiable status" }, 400);
    }

    const safeAttendeeName = escapeHtml(booking.attendee_name || "there");
    const safeEventTitle = escapeHtml(event.title || "Event");
    const safeEventDate = escapeHtml(
      event.date
        ? new Date(event.date).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : "TBA"
    );
    const safeEventTime = escapeHtml(event.time || "TBA");
    const safeEventLocation = escapeHtml(event.location_name || "TBA");

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

    console.log(`Sending ${status} email for booking ${bookingId}`);

    const { data, error: resendError } = await resend.emails.send({
      from: "Raag Connect <noreply@raagconnect.com>",
      to: [booking.attendee_email],
      subject,
      html,
    });

    if (resendError) {
      console.error("Resend error:", resendError);
      return json({ error: "Failed to send email" }, 500);
    }

    console.log("Email sent successfully");
    return json({ data }, 200);
  } catch (error) {
    console.error("Error in send-booking-email function:", error);
    return json({ error: "Unexpected error" }, 500);
  }
};

serve(handler);
