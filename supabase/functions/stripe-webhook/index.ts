import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, getStripe } from "../_shared/stripe.ts";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) return new Response("Webhook secret not configured", { status: 500 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const stripe = getStripe();
  const admin = adminClient();
  const raw = await req.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, signature, secret);
  } catch (err) {
    console.error("Signature verification failed", (err as Error).message);
    return new Response("Invalid signature", { status: 400 });
  }

  // Idempotency: record the event id first; duplicates exit immediately.
  const { error: dupError } = await admin
    .from("stripe_webhook_events")
    .insert({ id: event.id, type: event.type });
  if (dupError) {
    console.log("Duplicate or unrecordable event", event.id, dupError.message);
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Record<string, unknown>;
        if (session.payment_status === "paid") {
          await fulfill(admin, session);
        }
        break;
      }
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const session = event.data.object as Record<string, unknown>;
        await admin
          .from("payments")
          .update({ payment_status: "failed" })
          .eq("stripe_checkout_session_id", session.id as string)
          .neq("payment_status", "paid");
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Record<string, unknown>;
        const pi = charge.payment_intent as string;
        const { data: payment } = await admin
          .from("payments")
          .select("id, gross_amount")
          .eq("stripe_payment_intent_id", pi)
          .maybeSingle();
        if (payment) {
          const refunded = Number(charge.amount_refunded ?? 0);
          await admin
            .from("payments")
            .update({
              refunded_amount: refunded,
              refund_status: refunded >= payment.gross_amount ? "refunded" : "partially_refunded",
            })
            .eq("id", payment.id);
          await cancelFulfillment(admin, payment.id, refunded >= payment.gross_amount);
        }
        break;
      }
      case "charge.dispute.created": {
        const dispute = event.data.object as Record<string, unknown>;
        await admin
          .from("payments")
          .update({ refund_status: "disputed" })
          .eq("stripe_payment_intent_id", dispute.payment_intent as string);
        break;
      }
      case "account.updated": {
        const account = event.data.object as Record<string, unknown>;
        const requirements = (account.requirements ?? {}) as { currently_due?: string[]; past_due?: string[] };
        const due = (requirements.currently_due?.length ?? 0) > 0 || (requirements.past_due?.length ?? 0) > 0;
        const { data: row } = await admin
          .from("organizer_payment_accounts")
          .update({
            charges_enabled: !!account.charges_enabled,
            payouts_enabled: !!account.payouts_enabled,
            onboarding_complete: !!account.details_submitted,
            requirements_due: due,
          })
          .eq("stripe_account_id", account.id as string)
          .select("user_id")
          .maybeSingle();
        if (row?.user_id) {
          await admin.from("organizer_payments_public").upsert(
            { user_id: row.user_id, charges_enabled: !!account.charges_enabled, updated_at: new Date().toISOString() },
            { onConflict: "user_id" },
          );
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handling error", event.type, err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});

async function fulfill(admin: ReturnType<typeof adminClient>, session: Record<string, unknown>) {
  const sessionId = session.id as string;
  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (!payment) {
    console.error("No payment row for session", sessionId);
    return;
  }

  await admin
    .from("payments")
    .update({
      payment_status: "paid",
      stripe_payment_intent_id: (session.payment_intent as string) ?? payment.stripe_payment_intent_id,
    })
    .eq("id", payment.id);

  // Only fulfil once.
  if (payment.fulfilled_at) return;

  if (payment.event_id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", payment.user_id)
      .maybeSingle();

    const rows = Array.from({ length: payment.quantity }, () => ({
      event_id: payment.event_id,
      user_id: payment.user_id,
      attendee_name: profile?.full_name ?? payment.buyer_name ?? "Ticket holder",
      attendee_email: profile?.email ?? payment.buyer_email ?? "",
      amount: payment.gross_amount / payment.quantity / 100,
      payment_method: "stripe",
      status: "confirmed",
    }));
    await admin.from("bookings").insert(rows);
  }

  if (payment.class_id) {
    const ids = ((session.metadata as Record<string, string> | null)?.class_booking_ids ?? "")
      .split(",")
      .filter(Boolean);
    if (ids.length) {
      await admin.from("class_bookings").update({ status: "confirmed" }).in("id", ids);
    }
  }

  await admin.from("payments").update({ fulfilled_at: new Date().toISOString() }).eq("id", payment.id);
}

async function cancelFulfillment(
  admin: ReturnType<typeof adminClient>,
  paymentId: string,
  full: boolean,
) {
  if (!full) return;
  const { data: payment } = await admin.from("payments").select("*").eq("id", paymentId).maybeSingle();
  if (!payment) return;
  if (payment.event_id) {
    await admin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("event_id", payment.event_id)
      .eq("user_id", payment.user_id)
      .eq("payment_method", "stripe");
  }
  if (payment.class_id) {
    await admin
      .from("class_bookings")
      .update({ status: "cancelled" })
      .eq("class_id", payment.class_id)
      .eq("user_id", payment.user_id);
  }
}
