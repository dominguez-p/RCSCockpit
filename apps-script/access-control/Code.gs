const RCS_SPREADSHEET_MIME_TYPE = "application/vnd.google-apps.spreadsheet";

/**
 * =========================================================
 * RCS COCKPIT · ACCESS CONTROL
 * =========================================================
 *
 * Este Web App:
 *
 * - NO devuelve datos del Cockpit.
 * - Comprueba únicamente si el usuario actual
 *   puede acceder a una Spreadsheet.
 * - Devuelve viewer / editor.
 * - Utiliza las capabilities reales de Drive.
 *
 * Debe desplegarse como:
 *
 * Execute as:
 *   User accessing the web app
 *
 * Who has access:
 *   Usuarios del dominio BBVA
 * =========================================================
 */

function doGet(e) {
  const parameters = e && e.parameter ? e.parameter : {};

  const spreadsheetId = String(parameters.spreadsheetId || "").trim();

  if (!spreadsheetId) {
    return createAccessResponse_(e, {
      ok: false,

      code: "INVALID_REQUEST",

      error: "No se ha informado la Spreadsheet que debe validarse.",

      access: {
        granted: false,
        role: "none",
        canEdit: false,
      },

      generatedAt: new Date().toISOString(),
    });
  }

  try {
    /*
     * =====================================================
     * DRIVE
     * =====================================================
     *
     * IMPORTANTE:
     *
     * Al ejecutarse el Web App como el usuario que accede,
     * estas capabilities corresponden a ESE usuario.
     *
     * Si no tiene acceso al fichero,
     * Drive.Files.get() fallará.
     * =====================================================
     */

    const file = Drive.Files.get(spreadsheetId, {
      fields: "id,mimeType,capabilities",
      supportsAllDrives: true,
    });

    if (!file) {
      throw new Error("No se ha podido resolver la Spreadsheet.");
    }

    if (String(file.mimeType || "") !== RCS_SPREADSHEET_MIME_TYPE) {
      return createAccessResponse_(e, {
        ok: false,

        code: "INVALID_SOURCE",

        error: "El origen configurado no es una Google Spreadsheet.",

        access: {
          granted: false,
          role: "none",
          canEdit: false,
        },

        generatedAt: new Date().toISOString(),
      });
    }

    const capabilities = file.capabilities || {};

    const canEdit = capabilities.canEdit === true;

    return createAccessResponse_(e, {
      ok: true,

      access: {
        granted: true,

        role: canEdit ? "editor" : "viewer",

        canEdit,
      },

      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(error);

    const code = classifyAccessError_(error);

    return createAccessResponse_(e, {
      ok: false,

      code,

      error:
        code === "ACCESS_DENIED"
          ? "El usuario no tiene acceso al Cockpit."
          : "No se ha podido validar el acceso al Cockpit.",

      access: {
        granted: false,
        role: "none",
        canEdit: false,
      },

      generatedAt: new Date().toISOString(),
    });
  }
}

/**
 * =========================================================
 * ERROR CLASSIFICATION
 * =========================================================
 */

function classifyAccessError_(error) {
  const message = String(
    error && error.message ? error.message : error || "",
  ).toLowerCase();

  if (
    message.includes("403") ||
    message.includes("404") ||
    message.includes("forbidden") ||
    message.includes("permission") ||
    message.includes("insufficient") ||
    message.includes("not found") ||
    message.includes("access denied")
  ) {
    return "ACCESS_DENIED";
  }

  return "ACCESS_CHECK_FAILED";
}

/**
 * =========================================================
 * JSONP
 * =========================================================
 */

function createAccessResponse_(event, payload) {
  const requestedCallback = String(
    event && event.parameter && event.parameter.callback
      ? event.parameter.callback
      : "callback",
  ).trim();

  const callback = /^[A-Za-z_$][A-Za-z0-9_$.\[\]]*$/.test(requestedCallback)
    ? requestedCallback
    : "callback";

  return ContentService.createTextOutput(
    `${callback}(${JSON.stringify(payload)});`,
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}
