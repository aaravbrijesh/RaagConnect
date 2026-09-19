import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const STRIPE_API_VERSION = "2025-08-27.basil";

export function getStripe() {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: STRIPE_API_VERSION, httpClient: Stripe.createFetchHttpClient() });
}

export function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

/** Returns the authenticated user or null. */
export async function getUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const anon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data, error } = await anon.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error) return null;
  return data.user ?? null;
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Central place for the platform fee. Never hard-code the percentage elsewhere. */
export async function getPlatformSettings(admin: ReturnType<typeof adminClient>) {
  const { data } = await admin
    .from("platform_settings")
    .select("platform_fee_percent, default_currency")
    .eq("id", true)
    .maybeSingle();
  return {
    platform_fee_percent: Number(data?.platform_fee_percent ?? 5),
    default_currency: (data?.default_currency ?? "usd") as string,
  };
}

/** Mirror the connected-account state into both the private and the public table. */
export async function syncAccountState(
  admin: ReturnType<typeof adminClient>,
  userId: string,
  account: { id: string; charges_enabled?: boolean; payouts_enabled?: boolean; details_submitted?: boolean; requirements?: { currently_due?: string[]; past_due?: string[] } },
) {
  const requirementsDue =
    (account.requirements?.currently_due?.length ?? 0) > 0 ||
    (account.requirements?.past_due?.length ?? 0) > 0;

  await admin.from("organizer_payment_accounts").upsert(
    {
      user_id: userId,
      stripe_account_id: account.id,
      onboarding_complete: !!account.details_submitted,
      charges_enabled: !!account.charges_enabled,
      payouts_enabled: !!account.payouts_enabled,
      requirements_due: requirementsDue,
    },
    { onConflict: "user_id" },
  );

  await admin.from("organizer_payments_public").upsert(
    { user_id: userId, charges_enabled: !!account.charges_enabled, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );

  return {
    stripe_account_id: account.id,
    onboarding_complete: !!account.details_submitted,
    charges_enabled: !!account.charges_enabled,
    payouts_enabled: !!account.payouts_enabled,
    requirements_due: requirementsDue,
  };
}
