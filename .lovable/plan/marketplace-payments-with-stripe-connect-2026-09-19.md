# Marketplace payments with Stripe Connect

Goal: organizers and teachers connect their own Stripe account, customers pay by card on Stripe's hosted checkout, RaagConnect keeps a configurable platform fee (5% to start), and the rest goes straight to the organizer. Test mode only — no live money.

The existing free registration and the manual Venmo/CashApp flow keep working exactly as they do today. Card payment appears only when an organizer has finished Stripe setup.

## What organizers see

A new **Payments** section in Settings:
- Not connected: heading "Accept Payments" and a "Set Up Payments" button that sends them to Stripe's own onboarding (identity, bank details, all handled by Stripe).
- After returning: a clear status — Payments not configured / Setup incomplete / Action required / Payments enabled.
- Once enabled: totals for sales, RaagConnect fees, their proceeds, plus a recent transactions list with payment and refund status. Each organizer only ever sees their own.

## What customers see

On a paid event or class whose organizer has payments enabled:
- Price, quantity where relevant, and total.
- A "Buy Tickets" (events) / "Register & Pay" (classes) button that opens Stripe's hosted checkout.
- A success page saying "Payment successful" with their registration details, and a cancelled page that returns them to the listing.

Registration or tickets are only created once Stripe confirms the payment, not when the browser returns.

## Database changes

- `organizer_payment_accounts`: one row per organizer — Stripe account id, onboarding complete, charges enabled, payouts enabled. Owner-and-admin read; writes only from the server.
- `platform_settings`: single configurable row holding the platform fee percent (5) and default currency (USD). No hard-coded fee anywhere in the app.
- `payments`: id, user_id, organizer_id, event_id / class_id, Stripe session / payment intent / connected account ids, gross amount, platform fee, currency, payment status, refund status, timestamps. All money stored as integer cents.
- `webhook_events`: processed Stripe event ids, so a repeated delivery never double-creates a booking.
- Paid offerings gain `currency` and a stored price in cents; existing price fields stay untouched for display.
- Row Level Security on all of it: buyers see their own payments, organizers see payments for their own events/classes, admins see all.

## Server functions (Stripe secret key never leaves the server)

- `stripe-connect-onboard` — creates or reuses the signed-in organizer's connected account and returns a Stripe onboarding link.
- `stripe-connect-status` — refreshes charges/payouts status from Stripe.
- `create-checkout-session` — looks up price, organizer and fee from the database (never from the browser), creates the Stripe Checkout session with the application fee routed to RaagConnect.
- `stripe-webhook` — signature-verified, idempotent; handles completed checkout, async payment success/failure, refunds, disputes, and connected-account updates. This is what marks a payment paid and creates the booking or class registration.

## What I need from you

- Confirm the Stripe key already stored in this project is your **platform account's test secret key** (Connect enabled). If not I'll ask for a new one.
- After I deploy, I'll give you the webhook URL to paste into Stripe and you'll give me back the webhook signing secret.

## Wrap-up

When it's done I'll give you: every database change, every new page and function, the secrets to provide, the exact Stripe dashboard steps, the webhook URL, test walkthroughs (onboarding, a $100 purchase, failed payment, refund), the exact $100 split between Stripe, RaagConnect and the organizer, and what remains before going live.
