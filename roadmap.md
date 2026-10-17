# Payment verification
- [ ] Separate sandbox and live webhook secrets without overwriting existing production credentials.
- [ ] Enforce test-only Stripe operation and reliable exactly-once booking fulfillment.
- [ ] Verify published page metadata.
- [ ] Confirm a class card booking through payment and booking confirmation; blocked until webhook delivery is verified.
- [x] Verify Stripe operates in test mode using Stripe's checkout and endpoint records, without reading secret values.
- [ ] Verify webhook signing configuration; blocked because no signed deliveries have reached the function and the replacement secret form was cancelled.