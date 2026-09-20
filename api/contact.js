/* Contact form endpoint — POST /api/contact
 *
 * Receives { name, email, phone?, message } as JSON and sends the enquiry
 * email via Resend (https://resend.com). The API key exists ONLY as a Vercel
 * environment variable — it is never shipped to the browser.
 *
 * Environment variables (Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY  (required)  — API key from your Resend dashboard
 *   CONTACT_TO      (optional)  — recipient inbox, default hello@meshonlabs.in
 *   CONTACT_FROM    (optional)  — verified sender, default "Meshon Labs Website <form@meshonlabs.in>"
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function respond(res, status, payload) {
  res.status(status).json(payload);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return respond(res, 405, { ok: false, error: "Method not allowed" });
  }

  /* Same-origin guard: reject cross-site posts, allow tools without Origin (curl). */
  if (req.headers.origin) {
    try {
      if (new URL(req.headers.origin).host !== req.headers.host) {
        return respond(res, 403, { ok: false, error: "Forbidden" });
      }
    } catch {
      return respond(res, 403, { ok: false, error: "Forbidden" });
    }
  }

  const b = req.body || {};
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim();
  const phone = String(b.phone || "").trim();
  const message = String(b.message || "").trim();

  /* Honeypot: bots fill every field — drop silently and pretend success. */
  if (String(b._gotcha || "")) {
    return respond(res, 200, { ok: true });
  }

  if (!name || name.length > 120) return respond(res, 400, { ok: false, error: "Please tell us your name." });
  if (!EMAIL_RE.test(email) || email.length > 200) return respond(res, 400, { ok: false, error: "Please use a valid email address." });
  if (!message) return respond(res, 400, { ok: false, error: "Please add a short message." });
  if (message.length > 5000) return respond(res, 400, { ok: false, error: "Message is too long (max 5000 characters)." });
  if (phone.length > 40) return respond(res, 400, { ok: false, error: "Phone number looks too long." });

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return respond(res, 500, { ok: false, error: "Email is not configured yet — please email hello@meshonlabs.in." });
  }

  const to = process.env.CONTACT_TO || "hello@meshonlabs.in";
  const from = process.env.CONTACT_FROM || "Meshon Labs Website <form@meshonlabs.in>";

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: from,
        to: [to],
        reply_to: email,
        subject: "New project enquiry from " + name,
        text:
          "Name: " + name + "\n" +
          "Email: " + email + "\n" +
          "Phone: " + (phone || "-") + "\n" +
          "\n" + message + "\n\n" +
          "— sent from the meshonlabs.in contact form",
      }),
    });

    if (!r.ok) {
      console.error("Resend error", r.status, await r.text().catch(() => ""));
      return respond(res, 502, { ok: false, error: "Could not send right now — please email hello@meshonlabs.in." });
    }
    return respond(res, 200, { ok: true });
  } catch (err) {
    console.error("Contact send failed", err);
    return respond(res, 502, { ok: false, error: "Network error — please email hello@meshonlabs.in." });
  }
};
