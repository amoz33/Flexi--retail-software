// Paystack Payment Integration
import { apiFetch } from "./api";

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";
const PAYSTACK_API_URL = "https://api.paystack.co";

// Initialize Paystack
export function initializePaystack() {
  if (typeof window !== "undefined" && window.PaystackPop) {
    return window.PaystackPop;
  }
  return null;
}

// Create payment reference
export function createPaymentReference(prefix = "PAY") {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${random.toUpperCase()}`;
}

// Initialize payment on frontend
export async function initiatePayment({
  email,
  amount,
  reference,
  metadata = {},
  onSuccess,
  onClose,
  currency = "NGN",
  channels = ["card", "bank", "ussd", "qr", "mobile_money"]
}) {
  if (typeof window === "undefined") {
    throw new Error("Paystack can only be initialized in browser");
  }

  if (!PAYSTACK_PUBLIC_KEY) {
    throw new Error("Paystack public key is not configured");
  }

  // Load Paystack script if not already loaded
  if (!window.PaystackPop) {
    await loadPaystackScript();
  }

  const handler = window.PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email,
    amount: amount * 100, // Convert to kobo
    ref: reference,
    metadata: {
      ...metadata,
      custom_fields: Object.entries(metadata).map(([key, value]) => ({
        display_name: key,
        variable_name: key,
        value: String(value)
      }))
    },
    currency,
    channels,
    callback: async function(response) {
      // Payment successful, verify on backend
      try {
        const verification = await verifyPayment(reference);
        if (verification.status === "success") {
          onSuccess?.(verification);
        } else {
          throw new Error("Payment verification failed");
        }
      } catch (error) {
        console.error("Payment verification error:", error);
        alert("Payment successful but verification failed. Please contact support with your reference: " + reference);
      }
    },
    onClose: function() {
      onClose?.();
    }
  });

  handler.openIframe();
}

// Load Paystack script dynamically
async function loadPaystackScript() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    
    script.onload = () => {
      if (window.PaystackPop) {
        resolve();
      } else {
        reject(new Error("Failed to load Paystack script"));
      }
    };
    
    script.onerror = () => {
      reject(new Error("Failed to load Paystack script"));
    };
    
    document.head.appendChild(script);
  });
}

// Verify payment with backend
export async function verifyPayment(reference) {
  try {
    const response = await apiFetch(`/payments/verify/${reference}`);
    return response;
  } catch (error) {
    console.error("Payment verification error:", error);
    throw new Error("Failed to verify payment");
  }
}

// Initialize payment through backend (for server-side tracking)
export async function initializePaymentBackend(paymentData) {
  try {
    const response = await apiFetch("/payments/initialize", {
      method: "POST",
      body: paymentData
    });
    return response;
  } catch (error) {
    console.error("Payment initialization error:", error);
    throw new Error("Failed to initialize payment");
  }
}

// Create payment intent (for order preparation)
export async function createPaymentIntent(orderData) {
  try {
    const response = await apiFetch("/payments/initialize", {
      method: "POST",
      body: orderData
    });
    return response;
  } catch (error) {
    console.error("Payment intent creation error:", error);
    throw new Error("Failed to create payment intent");
  }
}

// Format amount for display
export function formatAmount(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN"
  }).format(amount);
}

// Check if Paystack is configured
export function isPaystackConfigured() {
  return !!PAYSTACK_PUBLIC_KEY;
}