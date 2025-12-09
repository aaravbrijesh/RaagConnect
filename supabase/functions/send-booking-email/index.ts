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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, attendeeName, eventTitle, eventDate, eventTime, eventLocation, status }: BookingEmailRequest = await req.json();

    console.log(`Sending ${status} email to ${to} for event: ${eventTitle}`);

    const isConfirmed = status === "confirmed";
    const subject = isConfirmed 
      ? `🎵 Your booking for "${eventTitle}" is confirmed!`
      : `Booking update for "${eventTitle}"`;

    const html = isConfirmed
      ? `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a; margin-bottom: 20px;">Booking Confirmed! 🎉</h1>
          <p style="color: #333; font-size: 16px;">Dear ${attendeeName},</p>
          <p style="color: #333; font-size: 16px;">Great news! Your booking has been confirmed for:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1a1a1a; margin: 0 0 12px 0;">${eventTitle}</h2>
            <p style="margin: 8px 0; color: #666;"><strong>Date:</strong> ${eventDate}</p>
            <p style="margin: 8px 0; color: #666;"><strong>Time:</strong> ${eventTime}</p>
            <p style="margin: 8px 0; color: #666;"><strong>Location:</strong> ${eventLocation || "TBA"}</p>
          </div>
          <p style="color: #333; font-size: 16px;">We look forward to seeing you at the event!</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">Best regards,<br>Raag Connect</p>
        </div>
      `
      : `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a; margin-bottom: 20px;">Booking Update</h1>
          <p style="color: #333; font-size: 16px;">Dear ${attendeeName},</p>
          <p style="color: #333; font-size: 16px;">Unfortunately, your booking for the following event could not be confirmed:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1a1a1a; margin: 0 0 12px 0;">${eventTitle}</h2>
            <p style="margin: 8px 0; color: #666;"><strong>Date:</strong> ${eventDate}</p>
          </div>
          <p style="color: #333; font-size: 16px;">This may be due to payment verification issues or event capacity. Please contact the organizer for more details.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">Best regards,<br>Raag Connect</p>
        </div>
      `;

    const emailResponse = await resend.emails.send({
      from: "Raag Connect <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
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
