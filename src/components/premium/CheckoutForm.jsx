import { useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useDispatch } from "react-redux";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { stripeAppearance } from "../../lib/stripe";
import { cardConfirmationFailed, setCardConfirming } from "../../store/slices/subscriptionSlice";

const RETURN_URL = `${window.location.origin}/verified`;

/*
 * Card form.
 *
 * The card number, expiry and CVC are collected by Stripe's Payment Element in
 * a Stripe-hosted iframe — they never reach this app or the backend. Only the
 * resulting payment method id leaves the browser (sent to the backend, which
 * attaches it to the customer and creates the subscription).
 */
function CardForm({ onConfirmed, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const dispatch = useDispatch();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || !stripe || !elements) return;

    setError(null);
    setSubmitting(true);
    dispatch(setCardConfirming());

    try {
      // Validates the element and collects data required by wallets.
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "Please check your card details.");
        dispatch(cardConfirmationFailed());
        return;
      }

      // Confirms the SetupIntent. 3D Secure / SCA is handled by Stripe.js here
      // (redirect: "if_required" keeps it in the page for cards).
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: RETURN_URL },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message || "Your card could not be confirmed.");
        dispatch(cardConfirmationFailed());
        return;
      }

      const paymentMethodId =
        typeof setupIntent?.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent?.payment_method?.id;

      if (setupIntent?.status !== "succeeded" || !paymentMethodId) {
        setError("Stripe did not complete the card setup. Nothing was charged.");
        dispatch(cardConfirmationFailed());
        return;
      }

      // Card confirmed with Stripe — the backend now creates the subscription.
      // Await it so the submit button stays disabled while the backend and any
      // invoice authentication step are still in progress.
      await onConfirmed(paymentMethodId);
    } catch (unexpected) {
      setError(unexpected?.message || "Your card could not be confirmed.");
      dispatch(cardConfirmationFailed());
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = submitting || !ready || !stripe || !elements;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{ layout: "tabs" }}
        onReady={() => setReady(true)}
        onChange={() => error && setError(null)}
      />

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-sm text-[#DC2626]"
        >
          <AlertCircle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-full bg-cobalt px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-cobalt-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? "Confirming card…" : "Start subscription"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-full px-4 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      <p className="flex items-center gap-1.5 text-[0.8rem] text-foreground-muted">
        <Lock size={13} strokeWidth={1.8} />
        Card details are sent directly to Stripe, never to this app.
      </p>
    </form>
  );
}

/**
 * Wraps the card form in a Stripe Elements provider for one SetupIntent.
 * The Stripe.js promise comes from the backend-provided publishable key.
 * Unmounting (closing the panel) tears down the Stripe iframes, so no card
 * state survives a cancel.
 */
export function CardCheckout({ stripePromise, clientSecret, onConfirmed, onCancel }) {
  const options = useMemo(
    () => ({ clientSecret, appearance: stripeAppearance }),
    [clientSecret]
  );

  if (!stripePromise || !clientSecret) return null;

  return (
    <Elements key={clientSecret} stripe={stripePromise} options={options}>
      <CardForm onConfirmed={onConfirmed} onCancel={onCancel} />
    </Elements>
  );
}

