export function createPaymentReference(prefix = "PAY") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

export function isPaystackConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY);
}

export async function initiatePayment({ email, amount, reference, metadata, onSuccess, onClose }) {
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  if (!publicKey || typeof window === "undefined") {
    throw new Error("Paystack is not configured for this environment.");
  }

  const scriptId = "paystack-inline-script";
  let script = document.getElementById(scriptId);
  if (!script) {
    script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
  }

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Paystack script failed to load.")), 15000);
    script.addEventListener("load", () => { clearTimeout(timeout); resolve(); }, { once: true });
    script.addEventListener("error", () => { clearTimeout(timeout); reject(new Error("Paystack script could not be loaded.")); }, { once: true });
    if (window.PaystackPop) { clearTimeout(timeout); resolve(); }
  });

  const handler = window.PaystackPop.setup({
    key: publicKey, email, amount: Math.round(amount), ref: reference, metadata, currency: "NGN",
    onClose: () => { if (typeof onClose === "function") onClose(); },
    callback: (response) => { if (typeof onSuccess === "function") onSuccess(response); }
  });
  handler.openIframe();
}
