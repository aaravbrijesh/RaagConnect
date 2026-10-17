import { test, expect } from 'bun:test';
import { requireTestKey, isSandboxEvent } from './stripe-mode';

test('only test API credentials may activate payments', () => {
  expect(requireTestKey('sk_test_fixture')).toBe('sk_test_fixture');
  expect(() => requireTestKey('sk_live_fixture')).toThrow();
  expect(() => requireTestKey(undefined)).toThrow();
});
test('live and unspecified webhook environments cannot fulfill bookings', () => {
  expect(isSandboxEvent({ livemode: false })).toBe(true);
  expect(isSandboxEvent({ livemode: true })).toBe(false);
  expect(isSandboxEvent({})).toBe(false);
});