import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  AlertCircle,
  BadgeCheck,
  Check,
  CreditCard,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  activateSubscription,
  beginCheckout,
  cancelSubscription,
  clearCancelError,
  closeCheckout,
  fetchStripeConfig,
  fetchSubscriptionStatus,
  waitForSubscription,
} from "../store/slices/subscriptionSlice";
import { fetchCurrentUser } from "../store/slices/authSlice";
import { CardCheckout } from "../components/premium/CheckoutForm";
import { PageHeader } from "../components/common/PageHeader";
import { Avatar } from "../components/ui/Avatar";
import { getStripePromise } from "../lib/stripe";

const PLAN_NAME = "Premium";

const BENEFITS = [
  "A blue check next to your name on your profile and on your posts.",
  "Shows that your account is a paid, subscribed account.",
  "Billing is handled by Stripe — card details are never sent to this app.",
];

// Subscription states reported by GET /stripe/status. `premium` is decided by
// the backend (active / trialing / past_due); this map only controls wording.
const STATE_LABELS = {
  none: "No subscription",
  active: "Premium active",
  trialing: "Premium trial",
  past_due: "Payment failed — retrying",
  incomplete: "Payment pending",
  unpaid: "Payment failed",
  paused: "Paused",
  canceled: "Cancelled",
  incomplete_expired: "Payment expired",
};

const STATE_STYLES = {
  active: "border-cobalt/20 bg-cobalt/10 text-cobalt",
  trialing: "border-cobalt/20 bg-cobalt/10 text-cobalt",
  past_due: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
  incomplete: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
  paused: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
  unpaid: "border-[#FCA5A5] bg-[#FEF2F2] text-[#DC2626]",
  incomplete_expired: "border-[#FCA5A5] bg-[#FEF2F2] text-[#DC2626]",
  canceled: "border-border bg-surface text-foreground-muted",
  none: "border-border bg-surface text-foreground-muted",
};

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function StatusChip({ state }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.75rem] font-medium ${
        STATE_STYLES[state] ?? STATE_STYLES.none
      }`}
    >
      {STATE_LABELS[state] ?? state}
    </span>
  );
}

function Alert({ children }) {
  return (
    <div
      role="alert"
      className="mt-3 flex items-start gap-2 rounded-md border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-sm text-[#DC2626]"
    >
      <AlertCircle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function StatusRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <dt className="text-small text-foreground-muted">{label}</dt>
      <dd className="min-w-0 text-right text-small text-foreground">{children}</dd>
    </div>
  );
}

export function Verified() {
  const dispatch = useDispatch();
  const me = useSelector((state) => state.auth.user);
  const usersById = useSelector((state) => state.users.byId);
  const {
    status,
    statusLoaded,
    statusLoading,
    statusError,
    checkout,
    canceling,
    cancelError,
    stripeConfig,
    stripeConfigLoading,
    stripeConfigError,
  } = useSelector((state) => state.subscription);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [paymentActionLoading, setPaymentActionLoading] = useState(false);
  const [paymentActionError, setPaymentActionError] = useState(null);

  // Stripe.js is initialised from the backend-provided publishable key.
  const publishableKey = stripeConfig?.publishableKey ?? null;
  const stripePromise = useMemo(() => getStripePromise(publishableKey), [publishableKey]);

  // Subscription state is always re-read from the backend on mount, so a page
  // refresh can never surface a premium state that the backend does not report.
  useEffect(() => {
    dispatch(fetchSubscriptionStatus());
    dispatch(fetchStripeConfig());
    // UserResponse now carries the same backend-derived premium flag, so
    // refresh it here instead of trusting a value cached before checkout.
    dispatch(fetchCurrentUser());
    // Closing the page drops the card form and its client secret.
    return () => dispatch(closeCheckout());
  }, [dispatch]);

  const account = (me?.userId != null && usersById[me.userId]) || me;

  const premium = status?.premium === true;
  const state = status?.status ?? "none";
  const blocked = status?.creationBlocked === true;
  const cancelAtPeriodEnd = status?.cancelAtPeriodEnd === true;
  const periodEnd = formatDate(status?.endDate);

  const phase = checkout.phase;
  const preparing = phase === "preparing";
  const creating = phase === "creating";
  const polling = phase === "polling";
  const cardOpen = phase === "awaiting-card" || phase === "confirming";
  const busy =
    preparing || creating || polling || phase === "confirming" || paymentActionLoading;

  const canSubscribe =
    Boolean(stripePromise) && !premium && !blocked && (phase === "idle" || phase === "error");

  // The backend returns requiresAction for an incomplete invoice. When Stripe
  // can prepare the action it also returns a short-lived client secret; the
  // payment method id is public metadata, not card data, and lets a page reload
  // finish 3DS without re-entering a card.
  const paymentActionRequired = status?.requiresAction === true;
  const actionPaymentMethodId = checkout.paymentMethodId || status?.paymentMethodId || null;

  const startCheckout = () => {
    setPaymentActionError(null);
    dispatch(beginCheckout());
  };

  const handleCardConfirmed = async (paymentMethodId) => {
    setPaymentActionError(null);
    try {
      const result = await dispatch(activateSubscription(paymentMethodId)).unwrap();
      if (result?.status?.requiresAction && result?.status?.clientSecret) {
        return;
      }
      await dispatch(waitForSubscription()).unwrap();
      dispatch(fetchCurrentUser());
    } catch {
      // activateSubscription.rejected already stores a user-facing message.
    }
  };

  const handlePaymentAction = async () => {
    if (!stripePromise || !status?.clientSecret) {
      setPaymentActionError("The payment confirmation is no longer available. Refresh the status.");
      return;
    }
    if (!actionPaymentMethodId) {
      setPaymentActionError(
        "The saved payment method could not be identified. Refresh the status and try again."
      );
      return;
    }

    setPaymentActionLoading(true);
    setPaymentActionError(null);

    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe.js could not be loaded.");

      // The saved payment method is already attached to the customer. Stripe.js
      // handles the bank's 3DS/SCA challenge; card details never reach this app.
      // `redirect: "if_required"` keeps a completed confirmation on this page so
      // the status poll below can pick the new state up, and only redirects when
      // the bank actually sends the customer to its own page.
      const { error } = await stripe.confirmCardPayment(status.clientSecret, {
        payment_method: actionPaymentMethodId,
        return_url: `${window.location.origin}/verified`,
        redirect: "if_required",
      });

      if (error) {
        setPaymentActionError(error.message || "The bank could not confirm this payment.");
        return;
      }

      await dispatch(waitForSubscription()).unwrap();
      dispatch(fetchCurrentUser());
    } catch (unexpected) {
      setPaymentActionError(
        unexpected?.message || "The payment could not be confirmed. Please try again."
      );
    } finally {
      setPaymentActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setConfirmCancel(false);
    await dispatch(cancelSubscription({ immediately: false }));
  };

  return (
    <div className="mx-auto w-full max-w-2xl pb-16">
      <PageHeader title="Verified" description="Blue check subscription" />

      {/* Signed-in account and its backend-reported state */}
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
        <Avatar src={account?.photo} username={account?.username ?? "You"} size={40} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-small font-medium text-foreground">
            <span className="truncate">{account?.username ?? "You"}</span>
            {premium && <BadgeCheck size={16} className="fill-cobalt/10 text-cobalt" />}
          </p>
          <p className="text-[0.8rem] text-foreground-muted">
            {statusLoading && !statusLoaded
              ? "Checking your subscription…"
              : premium
                ? "Verified — subscription active"
                : blocked
                  ? "Payment not completed"
                  : "Not verified"}
          </p>
        </div>
        <StatusChip state={state} />
      </div>

      {/* Plan */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cobalt/10 text-cobalt">
            <BadgeCheck size={26} strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-heading text-foreground">{PLAN_NAME}</h2>
            <p className="mt-1 text-body text-foreground-muted">
              Subscribe to get the blue check next to your name.
            </p>
          </div>
        </div>

        <ul className="mt-5 space-y-2.5" role="list">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2.5">
              <Check size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-cobalt" />
              <span className="text-small leading-relaxed text-foreground">{benefit}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-xl border border-border bg-surface px-4 py-3">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-small font-medium text-foreground">{PLAN_NAME} subscription</p>
            <span className="shrink-0 text-small font-semibold text-foreground-muted">—</span>
          </div>
          <p className="mt-1 text-[0.8rem] leading-relaxed text-foreground-muted">
            The amount lives in the backend&apos;s Stripe price and the API does not return it yet,
            so it is not invented here.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {premium ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground-muted">
              <BadgeCheck size={16} strokeWidth={2} className="text-cobalt" />
              Already subscribed
            </span>
          ) : blocked ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground-muted">
              Payment pending
            </span>
          ) : (
            <button
              type="button"
              onClick={startCheckout}
              disabled={!canSubscribe || busy}
              className="inline-flex items-center gap-2 rounded-full bg-cobalt px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-cobalt-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {(preparing || phase === "confirming") && (
                <Loader2 size={16} className="animate-spin" />
              )}
              {preparing ? "Preparing card form…" : "Subscribe"}
            </button>
          )}
          <span className="inline-flex items-center gap-1.5 text-[0.8rem] text-foreground-muted">
            <ShieldCheck size={15} strokeWidth={1.8} />
            Payments are processed by Stripe
          </span>
        </div>

        {preparing && (
          <p className="mt-3 text-small text-foreground-muted">
            Creating your billing profile and a card setup intent…
          </p>
        )}

        {creating && (
          <p className="mt-3 flex items-center gap-2 text-small text-foreground-muted">
            <Loader2 size={15} className="animate-spin" />
            Card confirmed. Creating your subscription — please keep this page open.
          </p>
        )}

        {polling && (
          <p className="mt-3 flex items-center gap-2 text-small text-foreground-muted">
            <Loader2 size={15} className="animate-spin" />
            Waiting for Stripe to confirm the first payment…
          </p>
        )}

        {/* Card form (Stripe Elements). Unmounting clears the SetupIntent state. */}
        {cardOpen && (
          <div className="mt-4 rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-small font-medium text-foreground">Card details</p>
              <button
                type="button"
                onClick={() => dispatch(closeCheckout())}
                disabled={phase === "confirming"}
                className="rounded-full px-3 py-1 text-[0.8rem] font-medium text-foreground-muted transition-colors hover:bg-white hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                Close
              </button>
            </div>
            <div className="rounded-lg border border-border bg-white p-4">
              <CardCheckout
                stripePromise={stripePromise}
                clientSecret={checkout.clientSecret}
                onConfirmed={handleCardConfirmed}
                onCancel={() => dispatch(closeCheckout())}
              />
            </div>
          </div>
        )}

        {/* 3DS/SCA for the subscription invoice. This survives a page reload
            because the status endpoint returns the client secret and PM id.
            The backend only reports requiresAction when Stripe's PaymentIntent
            really is waiting for a customer authentication step, so a card that
            needs no 3D Secure never lands here. */}
        {paymentActionRequired && !cardOpen && (
          <div className="mt-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <p className="flex items-center gap-2 text-small font-medium text-foreground">
              <CreditCard size={16} strokeWidth={1.8} className="shrink-0 text-[#B45309]" />
              Your bank needs to confirm this payment
            </p>
            <p className="mt-1.5 text-small leading-relaxed text-foreground-muted">
              Stripe created the subscription, but the first invoice is still incomplete. Complete
              the bank&apos;s 3D Secure check to activate Premium. Premium is not granted until Stripe
              reports an active subscription.
            </p>

            {paymentActionError && <Alert>{paymentActionError}</Alert>}

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handlePaymentAction}
                disabled={paymentActionLoading || !actionPaymentMethodId || !status?.clientSecret}
                className="inline-flex items-center gap-2 rounded-full bg-cobalt px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-cobalt-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {paymentActionLoading && <Loader2 size={16} className="animate-spin" />}
                {paymentActionLoading ? "Confirming payment…" : "Confirm payment"}
              </button>

              {status?.hostedInvoiceUrl && (
                <a
                  href={status.hostedInvoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-border bg-white px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-cobalt hover:text-cobalt"
                >
                  Open Stripe invoice
                </a>
              )}
            </div>

            {!actionPaymentMethodId && (
              <p className="mt-2 text-[0.8rem] leading-relaxed text-foreground-muted">
                The saved payment method is missing. Refresh the status, or contact support if this
                continues after a completed card setup.
              </p>
            )}

            {!status?.clientSecret && (
              <p className="mt-2 text-[0.8rem] leading-relaxed text-foreground-muted">
                Stripe has not returned a payment confirmation secret yet. Refresh the status in a
                moment. If this persists, contact support so the pending invoice can be reconciled.
              </p>
            )}
          </div>
        )}

        {/* The first payment is unresolved but no bank authentication is pending:
            the invoice can be paid directly on Stripe, so the hosted invoice link
            must stay reachable even though there is nothing to confirm here. */}
        {blocked && !premium && !paymentActionRequired && !cardOpen && (
          <div className="mt-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <p className="flex items-center gap-2 text-small font-medium text-foreground">
              <CreditCard size={16} strokeWidth={1.8} className="shrink-0 text-[#B45309]" />
              The first payment is still open
            </p>
            <p className="mt-1.5 text-small leading-relaxed text-foreground-muted">
              Stripe created the subscription, but the first invoice has not been paid yet. Your
              card does not need a 3D Secure check for this payment — you can complete it on the
              Stripe invoice page. Premium is granted as soon as Stripe reports an active
              subscription.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {status?.hostedInvoiceUrl ? (
                <a
                  href={status.hostedInvoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-cobalt px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-cobalt-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2"
                >
                  Open Stripe invoice
                </a>
              ) : (
                <p className="text-[0.8rem] leading-relaxed text-foreground-muted">
                  Stripe has not returned an invoice link yet. Refresh the status in a moment, or
                  contact support so the pending invoice can be reconciled.
                </p>
              )}

              <button
                type="button"
                onClick={() => dispatch(fetchSubscriptionStatus())}
                disabled={statusLoading}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-cobalt hover:text-cobalt disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={13} strokeWidth={2} className={statusLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* Backend-side failure (attach / subscription). */}
        {phase === "error" && checkout.error && (
          <>
            <Alert>{checkout.error}</Alert>
            <button
              type="button"
              onClick={() => dispatch(closeCheckout())}
              className="mt-3 rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-cobalt hover:text-cobalt"
            >
              Try again
            </button>
          </>
        )}

        {/* Outcome is described from the backend status, not from the request. */}
        {phase === "done" && (
          <div className="mt-4 rounded-xl border border-border bg-surface p-4">
            <p className="flex items-center gap-2 text-small font-medium text-foreground">
              <Check size={16} strokeWidth={2} className="shrink-0 text-cobalt" />
              {premium
                ? "Subscription active"
                : blocked
                  ? "Subscription created — payment still pending"
                  : "Subscription created"}
            </p>
            <p className="mt-1.5 text-small leading-relaxed text-foreground-muted">
              {premium
                ? "The backend reports an active subscription, so the blue check is shown from now on."
                : blocked
                  ? "Stripe created the subscription but the first payment is not confirmed yet. Premium is not granted until Stripe reports an active status."
                  : "Stripe created the subscription. Refresh the status below to see the latest state."}
            </p>
            <button
              type="button"
              onClick={() => dispatch(closeCheckout())}
              className="mt-3 rounded-full border border-border bg-white px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-cobalt hover:text-cobalt"
            >
              Done
            </button>
          </div>
        )}

        {!stripePromise && !stripeConfigLoading && (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-surface p-4">
            <p className="flex items-center gap-2 text-small font-medium text-foreground">
              <CreditCard size={16} strokeWidth={1.8} className="shrink-0 text-cobalt" />
              Card payments need a Stripe publishable key
            </p>
            <p className="mt-1.5 text-[0.8rem] leading-relaxed text-foreground-muted">
              The frontend reads it from <code className="rounded bg-white px-1">GET /stripe/config</code>.
              {stripeConfigError ? (
                <> {stripeConfigError}</>
              ) : (
                <>
                  {" "}
                  Set <code className="rounded bg-white px-1">STRIPE_PUBLISHABLE_KEY</code> (a{" "}
                  <code className="rounded bg-white px-1">pk_test_…</code> key matching the secret
                  key) for the backend and restart it. The secret key never reaches the browser.
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Subscription management */}
      <div className="mt-4 rounded-2xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 basis-[12rem]">
            <h2 className="text-base font-medium text-foreground">Subscription</h2>
            <p className="mt-1 text-[0.8rem] leading-relaxed text-foreground-muted">
              Read from the backend (GET /stripe/status), never from this page&apos;s own state.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dispatch(fetchSubscriptionStatus())}
            disabled={statusLoading}
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[0.8rem] font-medium text-foreground transition-colors hover:border-cobalt hover:text-cobalt disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={13} strokeWidth={2} className={statusLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {statusLoading && !statusLoaded ? (
          <p className="mt-4 text-small text-foreground-muted">Loading subscription…</p>
        ) : (
          <dl className="mt-4">
            <StatusRow label="Status">
              <StatusChip state={state} />
            </StatusRow>
            {status?.priceId && (
              <StatusRow label="Stripe price">
                <code className="break-all rounded bg-surface px-1.5 py-0.5 text-[0.75rem]">
                  {status.priceId}
                </code>
              </StatusRow>
            )}
            {premium && periodEnd && (
              <StatusRow label={cancelAtPeriodEnd ? "Premium until" : "Current period ends"}>
                {periodEnd}
              </StatusRow>
            )}
            {cancelAtPeriodEnd && (
              <StatusRow label="Cancellation">
                Scheduled at the end of the period
              </StatusRow>
            )}
          </dl>
        )}

        {statusError && <Alert>{statusError}</Alert>}
        {cancelError && <Alert>{cancelError}</Alert>}

        {premium && cancelAtPeriodEnd && (
          <p className="mt-3 text-small leading-relaxed text-foreground-muted">
            Your subscription stays active until {periodEnd ?? "the end of the current period"}, then
            it ends and the blue check is removed automatically.
          </p>
        )}

        {premium && !cancelAtPeriodEnd && (
          <div className="mt-4 border-t border-border pt-4">
            {confirmCancel ? (
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-small font-medium text-foreground">Cancel {PLAN_NAME}?</p>
                <p className="mt-1 text-[0.8rem] leading-relaxed text-foreground-muted">
                  You keep the blue check until the end of the current period
                  {periodEnd ? ` (${periodEnd})` : ""}. It will not renew.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={canceling}
                    className="inline-flex items-center gap-2 rounded-full bg-[#DC2626] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {canceling && <Loader2 size={15} className="animate-spin" />}
                    {canceling ? "Cancelling…" : "Confirm cancellation"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmCancel(false);
                      dispatch(clearCancelError());
                    }}
                    disabled={canceling}
                    className="rounded-full px-4 py-1.5 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground disabled:opacity-50"
                  >
                    Keep {PLAN_NAME}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  dispatch(clearCancelError());
                  setConfirmCancel(true);
                }}
                className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground-muted transition-colors hover:border-[#DC2626] hover:text-[#DC2626]"
              >
                Cancel subscription
              </button>
            )}
          </div>
        )}

        {blocked && !premium && !status?.requiresAction && (
          <p className="mt-3 text-small leading-relaxed text-foreground-muted">
            Stripe is waiting for this subscription&apos;s payment to be resolved, so a new
            subscription cannot be started. No blue check is granted in this state.
          </p>
        )}

        {(state === "canceled" || state === "incomplete_expired") && (
          <p className="mt-3 text-small leading-relaxed text-foreground-muted">
            This subscription has ended. You can subscribe again at any time.
          </p>
        )}

        {!statusLoaded && !statusLoading && !statusError && (
          <p className="mt-3 flex items-center gap-2 text-small text-foreground-muted">
            <Lock size={14} strokeWidth={1.8} />
            No subscription information has been loaded yet.
          </p>
        )}
      </div>
    </div>
  );
}

