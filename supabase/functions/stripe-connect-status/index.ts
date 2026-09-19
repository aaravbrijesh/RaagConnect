import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, corsHeaders, getStripe, getUser, json, syncAccountState } from "../_shared/stripe.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await getUser(req);
    if (!user) return json({ error: "Not authenticated" }, 401);

    const admin = adminClient();
    const { data: existing } = await admin
      .from("organizer_payment_accounts")
      .select("stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing?.stripe_account_id) {
      return json({ status: "not_configured", account: null });
    }

    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(existing.stripe_account_id);
    const state = await syncAccountState(admin, user.id, account as never);

    let status = "incomplete";
    if (state.charges_enabled && state.payouts_enabled && !state.requirements_due) status = "enabled";
    else if (state.requirements_due && state.onboarding_complete) status = "action_required";
    else if (state.charges_enabled) status = "enabled";

    return json({ status, account: state });
  } catch (error) {
    console.error("stripe-connect-status error", error);
    return json({ error: (error as Error).message }, 500);
  }
});
