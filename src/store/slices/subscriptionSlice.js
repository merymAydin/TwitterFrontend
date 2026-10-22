import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { formatApiError } from "../../lib/utils";

/*
 * Premium (blue check) subscription.
 *
 * Real backend contract — Spring Boot `StripeController` (verified against the
 * running API, no guessed paths):
 *
 *   POST /stripe/customer                                    -> "cus_..."   (idempotent)
 *   POST /stripe/setup-intent/{userId}                       -> "seti_..._secret_..."
 *   POST /stripe/payment-method/{userId}?paymentMethodId=    -> 204  (attach + set default)
 *   POST /stripe/subscription/{userId}                       -> "sub_..."
 *   GET  /stripe/status                                      -> SubscriptionStatusResponse
 *   POST /stripe/subscription/{userId}/cancel?immediately=   -> SubscriptionResponse
 *   GET  /stripe/subscriptions/{userId}                      -> SubscriptionResponse[]
 *
 * Card data never touches this app: the SetupIntent client secret goes to
 * Stripe.js, which confirms the card in the browser (including 3DS/SCA) and
 * returns only a payment method id. The secret key never leaves the backend.
 *
 * Premium access is always read back from GET /stripe/status. Nothing here
 * grants premium locally — the UI only renders what the backend reports.
 * If the first invoice needs 3DS/SCA, that same status response contains
 * requiresAction, a short-lived clientSecret, and the public payment method id.
 */

function describeSubscriptionError(error, fallback) {
  if (typeof error === "string") return error;

  const status = error?.response?.status;
  if (status === 401) return "Your session has expired. Sign in again and retry.";
  // 409 now covers explicit, user-safe backend states: an active/pending
  // subscription, a customer ownership conflict, or a missing payment method.
  // The backend deliberately does not include Stripe ids or secrets in these
  // messages, so the safest and most useful action is to show the server text.
  if (status === 409) {
    return (
      error?.response?.data?.message ||
      "This account already has an active or pending subscription. Refresh the status below to see it."
    );
  }
  if (status === 502) {
    return "Stripe could not complete the request. Nothing was charged — please try again.";
  }
  return formatApiError(error, fallback);
}

/* ------------------------------------------------------------------ status */

export const fetchSubscriptionStatus = createAsyncThunk(
  "subscription/fetchStatus",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get(ENDPOINTS.STRIPE.STATUS);
      return data;
    } catch (error) {
      return rejectWithValue(
        describeSubscriptionError(error, "Could not load your subscription status")
      );
    }
  }
);

/* ------------------------------------------------------------ stripe config */

// The publishable key comes from the backend (GET /stripe/config). The secret
// key stays there; a missing server-side key is reported instead of guessed.
export const fetchStripeConfig = createAsyncThunk(
  "subscription/fetchStripeConfig",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get(ENDPOINTS.STRIPE.CONFIG);
      if (!data?.publishableKey) {
        throw new Error("The backend returned no publishable key");
      }
      return data;
    } catch (error) {
      const status = error?.response?.status;
      if (status === 503 || status === 500) {
        const backendMessage = error?.response?.data?.message;
        return rejectWithValue(
          backendMessage
            ? `Stripe is not configured correctly: ${backendMessage}`
            : `The backend could not provide a Stripe publishable key (HTTP ${status}). ` +
                "Set STRIPE_PUBLISHABLE_KEY for the backend and restart it."
        );
      }
      return rejectWithValue(
        describeSubscriptionError(error, "Could not load the Stripe configuration")
      );
    }
  }
);

/* ---------------------------------------------------------------- checkout */

// Step 1: make sure a Stripe customer exists and prepare a SetupIntent.
// The client secret is handed to Stripe Elements, never to the backend again.
export const beginCheckout = createAsyncThunk(
  "subscription/beginCheckout",
  async (_, { getState, rejectWithValue }) => {
    const userId = getState().auth.user?.userId;
    if (userId == null) return rejectWithValue("You need to be signed in to subscribe.");

    try {
      // Idempotent: reuses the customer stored on the user, so a retry cannot
      // create a duplicate Stripe customer.
      await api.post(ENDPOINTS.STRIPE.CUSTOMER);
      const { data } = await api.post(ENDPOINTS.STRIPE.SETUP_INTENT(userId));
      if (typeof data !== "string" || !data.trim()) {
        throw new Error("The backend returned an empty setup intent");
      }
      return data.trim();
    } catch (error) {
      return rejectWithValue(
        describeSubscriptionError(error, "Could not prepare the card form")
      );
    }
  },
  {
    // Blocks duplicate Stripe work from double clicks while anything is in flight,
    // and refuses to start without a backend-provided publishable key.
    condition: (_, { getState }) => {
      const { checkout, stripeConfig } = getState().subscription;
      if (!stripeConfig?.publishableKey) return false;
      return checkout.phase === "idle" || checkout.phase === "error";
    },
  }
);

// Step 2: the card is confirmed by Stripe.js. Persist the resulting payment
// method on the customer, create the subscription, then re-read the status.
export const activateSubscription = createAsyncThunk(
  "subscription/activate",
  async (paymentMethodId, { getState, dispatch, rejectWithValue }) => {
    const userId = getState().auth.user?.userId;
    if (userId == null) return rejectWithValue("You need to be signed in to subscribe.");
    if (!paymentMethodId) {
      return rejectWithValue("Stripe did not return a payment method. Nothing was charged.");
    }

    try {
      await api.post(ENDPOINTS.STRIPE.PAYMENT_METHOD(userId), null, {
        params: { paymentMethodId },
      });
      const { data } = await api.post(ENDPOINTS.STRIPE.SUBSCRIPTION(userId));

      // The backend is the source of truth for premium access; a failure to
      // re-read it must not turn a successful subscription into an error.
      // The status response also says whether the first invoice needs a 3DS/SCA
      // confirmation step and carries the short-lived client secret for it.
      let status = null;
      try {
        status = await dispatch(fetchSubscriptionStatus()).unwrap();
      } catch {
        /* the page shows the status error and a Refresh action */
      }

      return {
        subscriptionId: typeof data === "string" ? data : null,
        status,
        paymentMethodId,
      };
    } catch (error) {
      return rejectWithValue(
        describeSubscriptionError(error, "The subscription could not be created")
      );
    }
  },
  {
    condition: (paymentMethodId, { getState }) => {
      const { checkout } = getState().subscription;
      if (!paymentMethodId) return false;
      return checkout.phase !== "creating" && checkout.phase !== "done";
    },
  }
);

// After Stripe creates a subscription, the authoritative status may change one
// more time when the invoice is paid and the webhook is delivered. Poll the
// backend instead of assuming premium from the request that was just sent.
export const waitForSubscription = createAsyncThunk(
  "subscription/wait",
  async (_, { dispatch }) => {
    let lastStatus = null;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        lastStatus = await dispatch(fetchSubscriptionStatus()).unwrap();
      } catch {
        /* transient status failure: keep polling */
      }

      if (lastStatus?.premium) return lastStatus;
      if (lastStatus?.requiresAction && lastStatus?.clientSecret) return lastStatus;

      if (attempt < 5) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    return lastStatus;
  }
);

/* ------------------------------------------------------------ cancellation */

export const cancelSubscription = createAsyncThunk(
  "subscription/cancel",
  async ({ immediately = false } = {}, { getState, dispatch, rejectWithValue }) => {
    const userId = getState().auth.user?.userId;
    if (userId == null) return rejectWithValue("You need to be signed in.");

    try {
      const { data } = await api.post(ENDPOINTS.STRIPE.CANCEL(userId), null, {
        params: { immediately },
      });
      try {
        await dispatch(fetchSubscriptionStatus()).unwrap();
      } catch {
        /* handled by the status card */
      }
      return data;
    } catch (error) {
      return rejectWithValue(
        describeSubscriptionError(error, "The subscription could not be cancelled")
      );
    }
  },
  {
    condition: (_, { getState }) => !getState().subscription.canceling,
  }
);

/* ------------------------------------------------------------------ slice */

const initialState = {
  // GET /stripe/config -> { publishableKey, mode } (null until loaded).
  stripeConfig: null,
  stripeConfigLoading: false,
  stripeConfigError: null,

  // SubscriptionStatusResponse from GET /stripe/status (null until loaded).
  status: null,
  statusLoaded: false,
  statusLoading: false,
  statusError: null,

  checkout: {
    // idle -> preparing -> awaiting-card -> confirming -> creating ->
    // polling/requires-action -> done
    // (any step can move to "error"; the card form keeps its own inline errors)
    phase: "idle",
    clientSecret: null,
    paymentMethodId: null,
    error: null,
    subscriptionId: null,
  },

  canceling: false,
  cancelError: null,
};

const subscriptionSlice = createSlice({
  name: "subscription",
  initialState,
  reducers: {
    // Called by the card form right before Stripe.js confirms the SetupIntent.
    setCardConfirming: (state) => {
      if (state.checkout.phase === "awaiting-card") {
        state.checkout.phase = "confirming";
        state.checkout.error = null;
      }
    },
    // Stripe.js rejected the card: keep the form open for another attempt.
    // Card-level messages are shown inside the form itself.
    cardConfirmationFailed: (state) => {
      if (state.checkout.phase === "confirming") {
        state.checkout.phase = "awaiting-card";
      }
    },
    // Close/unmount the card form and drop the client secret with it.
    closeCheckout: (state) => {
      state.checkout = initialState.checkout;
    },
    clearCancelError: (state) => {
      state.cancelError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStripeConfig.pending, (state) => {
        state.stripeConfigLoading = true;
        state.stripeConfigError = null;
      })
      .addCase(fetchStripeConfig.fulfilled, (state, action) => {
        state.stripeConfigLoading = false;
        state.stripeConfig = action.payload;
      })
      .addCase(fetchStripeConfig.rejected, (state, action) => {
        state.stripeConfigLoading = false;
        state.stripeConfigError =
          action.payload ?? "Could not load the Stripe configuration";
      })

      .addCase(fetchSubscriptionStatus.pending, (state) => {
        state.statusLoading = true;
        state.statusError = null;
      })
      .addCase(fetchSubscriptionStatus.fulfilled, (state, action) => {
        state.statusLoading = false;
        state.statusLoaded = true;
        state.status = action.payload;
      })
      .addCase(fetchSubscriptionStatus.rejected, (state, action) => {
        state.statusLoading = false;
        state.statusError = action.payload ?? "Could not load your subscription status";
      })

      .addCase(beginCheckout.pending, (state) => {
        state.checkout.phase = "preparing";
        state.checkout.error = null;
        state.checkout.subscriptionId = null;
        state.checkout.paymentMethodId = null;
      })
      .addCase(beginCheckout.fulfilled, (state, action) => {
        state.checkout.phase = "awaiting-card";
        state.checkout.clientSecret = action.payload;
      })
      .addCase(beginCheckout.rejected, (state, action) => {
        state.checkout.phase = "error";
        state.checkout.clientSecret = null;
        state.checkout.error = action.payload ?? "Could not prepare the card form";
      })

      .addCase(activateSubscription.pending, (state) => {
        state.checkout.phase = "creating";
        state.checkout.error = null;
      })
      .addCase(activateSubscription.fulfilled, (state, action) => {
        const status = action.payload?.status;
        state.checkout.phase =
          status?.requiresAction && status?.clientSecret ? "requires-action" : "done";
        state.checkout.clientSecret = null;
        state.checkout.paymentMethodId = action.payload?.paymentMethodId ?? null;
        state.checkout.subscriptionId = action.payload?.subscriptionId ?? null;
      })
      .addCase(activateSubscription.rejected, (state, action) => {
        state.checkout.phase = "error";
        state.checkout.clientSecret = null;
        state.checkout.paymentMethodId = null;
        state.checkout.error = action.payload ?? "The subscription could not be created";
      })

      .addCase(waitForSubscription.pending, (state) => {
        if (state.checkout.phase === "done") {
          state.checkout.phase = "polling";
        }
      })
      .addCase(waitForSubscription.fulfilled, (state, action) => {
        const status = action.payload;
        state.checkout.phase =
          status?.requiresAction && status?.clientSecret ? "requires-action" : "done";
      })

      .addCase(cancelSubscription.pending, (state) => {
        state.canceling = true;
        state.cancelError = null;
      })
      .addCase(cancelSubscription.fulfilled, (state) => {
        state.canceling = false;
      })
      .addCase(cancelSubscription.rejected, (state, action) => {
        state.canceling = false;
        state.cancelError = action.payload ?? "The subscription could not be cancelled";
      });
  },
});

export const { setCardConfirming, cardConfirmationFailed, closeCheckout, clearCancelError } =
  subscriptionSlice.actions;
export default subscriptionSlice.reducer;
