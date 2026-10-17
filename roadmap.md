# Payment verification
- [x] Separate sandbox and live webhook secrets without overwriting existing production credentials.
- [x] Enforce test-only Stripe operation and transactional booking fulfillment; test/live guard tests pass.
- [ ] Verify published page metadata.
- [ ] Confirm a class card booking exactly once; blocked because the previous organizer account is absent from the new sandbox, and signed webhook delivery is unverified.
- [x] Verify Stripe operates in test mode using Stripe's checkout and endpoint records, without reading secret values.
- [ ] Verify signed sandbox webhook HTTP 200; new secret saved, but no signed deliveries have reached the function. User must send a sandbox test event to the configured destination.