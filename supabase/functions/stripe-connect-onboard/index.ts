import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, corsHeaders, getStripe, getUser, json, syncAccountState } from "../_shared/stripe.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await getUser(req);
    if (!user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const origin = typeof body.origin === "string" && body.origin.startsWith("http")
      ? body.origin
      : req.headers.get("origin") ?? "";

    const stripe = getStripe();
    const admin = adminClient();

    const { data: existing } = await admin
      .from("organizer_payment_accounts")
      .select("stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let accountId = existing?.stripe_account_id as string | undefined;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: user.email ?? undefined,
        business_type: undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { supabase_user_id: user.id },
      });
      accountId = account.id;
      await syncAccountState(admin, user.id, account);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/settings?payments=refresh`,
      return_url: `${origin}/settings?payments=return`,
      type: "account_onboarding",
    });

    return json({ url: link.url });
  } catch (error) {
    console.error("stripe-connect-onboard error", error);
    return json({ error: (error as Error).message }, 500);
  }
});
