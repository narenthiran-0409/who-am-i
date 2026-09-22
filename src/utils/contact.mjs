export const contactLimits = { name: 120, email: 254, subject: 160, message: 5000 };

export function createRequestId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function validateContact(values, messages) {
  const errors = {};
  for (const [field, limit] of Object.entries(contactLimits)) {
    const value = typeof values[field] === "string" ? values[field].trim() : "";
    if (!value || value.length > limit) errors[field] = messages[field];
    if (field !== "message" && /[\u0000-\u001f\u007f]/.test(value)) errors[field] = messages[field];
    if (field === "email" && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)) errors.email = messages.email;
  }
  return errors;
}

export class ContactError extends Error {
  constructor(code, fields = {}) { super(code); this.code = code; this.fields = fields; }
}

export async function sendContact(values, requestId, { signal, fetcher = fetch } = {}) {
  let response;
  try {
    response = await fetcher(`${import.meta.env?.VITE_CONTACT_API_BASE_URL || ""}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
      body: JSON.stringify(values), signal, credentials: "omit",
    });
  } catch (error) {
    throw new ContactError(error.name === "AbortError" || error.name === "TimeoutError" ? "timeout" : "network");
  }
  const body = await response.json().catch(() => null);
  if (response.ok && body?.status === "accepted" && typeof body.reference === "string") return body;
  if (response.status === 400) throw new ContactError("validation", body?.errors || {});
  if (response.status === 429) throw new ContactError("rateLimited");
  if (response.status === 409) throw new ContactError("pending");
  if (body?.code === "delivery_uncertain") throw new ContactError("uncertain");
  throw new ContactError("unavailable");
}
