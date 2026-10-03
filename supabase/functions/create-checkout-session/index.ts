import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { adminClient, corsHeaders, getPlatformSettings, getStripe, getUser, json, safeOrigin } from "../_shared/stripe.ts";

const BodySchema = z.object({
  kind: z.enum(["event", "class"]),
  id: z.string().uuid(),
  quantity: z.number().int().min(1).max(20).default(1),
  tier_id: z.string().max(100).optional(),
  class_booking_ids: z.array(z.string().uuid()).max(12).optional(),
  origin: z.string().url().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await getUser(req);
    if (!user) return json({ error: "Please sign in to pay" }, 401);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { kind, id, quantity, class_booking_ids } = parsed.data;

    const origin = safeOrigin(parsed.data.origin, req.headers.get("origin"));
    const admin = adminClient();
    const stripe = getStripe();
    const settings = await getPlatformSettings(admin);

    // Authoritative values come from the database, never from the browser.
    let organizerId: string | null = null;
    let title = "";
    let unitAmount = 0;
    let currency = settings.default_currency;

    if (kind === "event") {
      const { data: ev } = await admin
        .from("events")
        .select("id, user_id, title, price, price_cents, currency, price_tiers")
        .eq("id", id)
        .maybeSingle();
      if (!ev) return json({ error: "Event not found" }, 404);
      organizerId = ev.user_id;
      title = ev.title;
      unitAmount = ev.price_cents ?? Math.round(Number(ev.price ?? 0) * 100);
      currency = ev.currency ?? currency;

      // Honor the ticket tier the buyer picked — validated server-side.
      if (parsed.data.tier_id && Array.isArray(ev.price_tiers)) {
        const tier = (ev.price_tiers as { id?: string; name?: string; price?: string; endDate?: string }[])
          .find((t) => t.id === parsed.data.tier_id);
        if (!tier) return json({ error: "Ticket type not found" }, 400);
        if (tier.endDate && new Date(tier.endDate) < new Date()) {
          return json({ error: "This ticket type is no longer available" }, 400);
        }
        const tierCents = Math.round(parseFloat(tier.price ?? "0") * 100);
        if (Number.isFinite(tierCents)) {
          unitAmount = tierCents;
          title = `${ev.title} — ${tier.name ?? "ticket"}`;
        }
      }
    } else {
      const { data: cls } = await admin
        .from("classes")
        .select("id, user_id, title, price, price_cents, currency")
        .eq("id", id)
        .maybeSingle();
      if (!cls) return json({ error: "Class not found" }, 404);
      organizerId = cls.user_id;
      title = cls.title;
      unitAmount = cls.price_cents ?? Math.round(Number(cls.price ?? 0) * 100);
      currency = cls.currency ?? currency;
    }

    if (!organizerId) return json({ error: "This listing has no organizer account" }, 400);
    if (!unitAmount || unitAmount < 50) return json({ error: "This listing is not set up for paid checkout" }, 400);

    const { data: acct } = await admin
      .from("organizer_payment_accounts")
      .select("stripe_account_id, charges_enabled")
      .eq("user_id", organizerId)
      .maybeSingle();

    if (!acct?.stripe_account_id || !acct.charges_enabled) {
      return json({ error: "The organizer has not finished setting up card payments" }, 400);
    }

    // Validate any class bookings actually belong to this buyer and class.
    let bookingIds: string[] = [];
    if (kind === "class" && class_booking_ids?.length) {
      const { data: rows } = await admin
        .from("class_bookings")
        .select("id")
        .in("id", class_booking_ids)
        .eq("class_id", id)
        .eq("user_id", user.id);
      bookingIds = (rows ?? []).map((r: { id: string }) => r.id);
    }

    const effectiveQuantity = kind === "class" && bookingIds.length ? bookingIds.length : quantity;
    const gross = unitAmount * effectiveQuantity;
    const platformFee = Math.round((gross * settings.platform_fee_percent) / 100);

    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .insert({
        user_id: user.id,
        buyer_email: user.email,
        organizer_id: organizerId,
        event_id: kind === "event" ? id : null,
        class_id: kind === "class" ? id : null,
        quantity: effectiveQuantity,
        stripe_connected_account_id: acct.stripe_account_id,
        gross_amount: gross,
        platform_fee: platformFee,
        platform_fee_percent: settings.platform_fee_percent,
        currency,
        payment_status: "pending",
      })
      .select("id")
      .single();
    if (paymentError) throw paymentError;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email ?? undefined,
      line_items: [
        {
          quantity: effectiveQuantity,
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: { name: title },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: { destination: acct.stripe_account_id },
        metadata: { payment_id: payment.id },
      },
      metadata: {
        payment_id: payment.id,
        kind,
        listing_id: id,
        user_id: user.id,
        class_booking_ids: bookingIds.join(","),
      },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-cancelled`,
    });

    await admin
      .from("payments")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", payment.id);

    return json({ url: session.url, payment_id: payment.id });
  } catch (error) {
    console.error("create-checkout-session error", error);
    return json({ error: (error as Error).message }, 500);
  }
});
