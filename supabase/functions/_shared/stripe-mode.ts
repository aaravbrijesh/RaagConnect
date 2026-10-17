/** No fallback to credentials from another environment. */
export function requireTestKey(key: string | undefined): string {
  if (!key || !key.startsWith('sk_test_')) {
    throw new Error('Sandbox Stripe credentials are not configured; payments are disabled');
  }
  return key;
}

export function isSandboxEvent(event: { livemode?: boolean }): boolean {
  return event.livemode === false;
}