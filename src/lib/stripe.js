import { loadStripe } from "@stripe/stripe-js";

/*
 * Stripe.js bootstrap.
 *
 * Only the PUBLISHABLE key may reach the browser (it is public by design); the
 * secret key never leaves the backend.
 *
 * The key is read from the backend: GET /stripe/config returns
 * { publishableKey, mode } and fails with 503 when STRIPE_PUBLISHABLE_KEY is not
 * configured server-side — so there is no duplicated frontend configuration.
 */

// loadStripe must be called once per key per page load; repeated calls
// re-inject Stripe.js. The cache keeps the promise across remounts.
const stripePromises = new Map();

export function getStripePromise(publishableKey) {
  const key = (publishableKey || "").trim();
  if (!/^pk_(test|live)_/.test(key)) return null;
  if (!stripePromises.has(key)) stripePromises.set(key, loadStripe(key));
  return stripePromises.get(key);
}

// Visual tokens of the app (src/index.css) so Stripe Elements matches the UI.
// Buttons/inputs inside Stripe's iframe add ~1px of their own spacing, so the
// paddings are kept consistent with the app's own inputs.
export const stripeAppearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#1D4ED8",
    colorBackground: "#FFFFFF",
    colorText: "#1A1A1A",
    colorTextSecondary: "#57534E",
    colorDanger: "#DC2626",
    borderRadius: "8px",
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontSizeBase: "14px",
    spacingUnit: "4px",
  },
};
