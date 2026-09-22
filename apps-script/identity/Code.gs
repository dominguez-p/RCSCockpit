const RCS_IDENTITY_SECRET_PROPERTY = "RCS_ACCESS_TOKEN_SECRET";

const RCS_IDENTITY_TOKEN_TTL_SECONDS = 60 * 60;

/*
 * =========================================================
 * RCS COCKPIT · IDENTITY
 * =========================================================
 *
 * Responsabilidad única:
 *
 * - identificar al usuario BBVA;
 * - emitir una prueba firmada de identidad.
 *
 * NO accede a:
 *
 * - Spreadsheet;
 * - Drive;
 * - JIRA;
 * - Staffing;
 * - SDA.
 * =========================================================
 */

function doGet(e) {
  const parameters = e && e.parameter ? e.parameter : {};

  const requestedCallback = String(parameters.callback || "callback").trim();

  const callback = /^[A-Za-z_$][A-Za-z0-9_$.\[\]]*$/.test(requestedCallback)
    ? requestedCallback
    : "callback";

  try {
    const email = String(Session.getActiveUser().getEmail() || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return createIdentityResponse_(callback, {
        ok: false,

        code: "IDENTITY_NOT_AVAILABLE",

        error: "No se ha podido identificar al usuario conectado.",
      });
    }

    if (!email.endsWith("@bbva.com")) {
      return createIdentityResponse_(callback, {
        ok: false,

        code: "INVALID_DOMAIN",

        error: "El usuario no pertenece al dominio autorizado.",
      });
    }

    const token = createIdentityToken_(email);

    return createIdentityResponse_(callback, {
      ok: true,

      user: {
        email,
      },

      token: token.value,

      expiresAt: token.expiresAt,

      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return createIdentityResponse_(callback, {
      ok: false,

      code: "IDENTITY_ERROR",

      error: String(error?.message || error),

      generatedAt: new Date().toISOString(),
    });
  }
}

/*
 * =========================================================
 * TOKEN
 * =========================================================
 */

function createIdentityToken_(email) {
  const now = Math.floor(Date.now() / 1000);

  const expiresAt = now + RCS_IDENTITY_TOKEN_TTL_SECONDS;

  const payload = {
    email: String(email || "")
      .trim()
      .toLowerCase(),

    iat: now,

    exp: expiresAt,
  };

  const encodedPayload = base64UrlEncode_(JSON.stringify(payload));

  const signature = signIdentityPayload_(encodedPayload);

  return {
    value: `${encodedPayload}.${signature}`,

    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}

function signIdentityPayload_(payload) {
  const secret = getIdentitySecret_();

  const signature = Utilities.computeHmacSha256Signature(payload, secret);

  return Utilities.base64EncodeWebSafe(signature).replace(/=+$/g, "");
}

function getIdentitySecret_() {
  const secret = String(
    PropertiesService.getScriptProperties().getProperty(
      RCS_IDENTITY_SECRET_PROPERTY,
    ) || "",
  ).trim();

  if (!secret) {
    throw new Error(
      `Falta la Script Property ${RCS_IDENTITY_SECRET_PROPERTY}.`,
    );
  }

  return secret;
}

function base64UrlEncode_(value) {
  return Utilities.base64EncodeWebSafe(
    Utilities.newBlob(String(value)).getBytes(),
  ).replace(/=+$/g, "");
}

/*
 * =========================================================
 * RESPONSE
 * =========================================================
 */

function createIdentityResponse_(callback, payload) {
  return ContentService.createTextOutput(
    `${callback}(${JSON.stringify(payload)});`,
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}
