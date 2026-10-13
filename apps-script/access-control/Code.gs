const RCS_SPREADSHEET_MIME_TYPE = "application/vnd.google-apps.spreadsheet";

/**
 * =========================================================
 * RCS COCKPIT · ACCESS CONTROL
 * =========================================================
 *
 * Modos:
 *
 * - JSONP:
 *     validación normal desde el Cockpit.
 *
 * - mode=authorize:
 *     flujo interactivo para que Google pueda solicitar
 *     autorización al usuario la primera vez.
 * =========================================================
 */

function doGet(e) {
  const parameters = e && e.parameter ? e.parameter : {};

  const spreadsheetId = String(parameters.spreadsheetId || "").trim();

  const mode = String(parameters.mode || "")
    .trim()
    .toLowerCase();

  const includeLanding = ["1", "true", "yes"].includes(
    String(parameters.includeLanding || "")
      .trim()
      .toLowerCase(),
  );

  const refreshLanding = ["1", "true", "yes"].includes(
    String(parameters.refreshLanding || "")
      .trim()
      .toLowerCase(),
  );

  /*
   * ===============================================
   * AUTORIZACIÓN INTERACTIVA
   * ===============================================
   */

  if (mode === "authorize") {
    return renderCockpitAuthorizationPage_(spreadsheetId);
  }

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
     * =============================================
     * ACCESS
     * =============================================
     */

    const access = resolveSpreadsheetAccess_(spreadsheetId);

    const payload = {
      ok: true,

      access,

      generatedAt: new Date().toISOString(),
    };

    /*
     * =============================================
     * LANDING LIGERA
     * =============================================
     */

    if (includeLanding) {
      payload.landing = getCockpitLandingData_(spreadsheetId, refreshLanding);
    }

    return createAccessResponse_(e, payload);
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
 * RESOLUCIÓN DEL PERMISO
 * =========================================================
 */

function resolveSpreadsheetAccess_(spreadsheetId) {
  const normalizedSpreadsheetId = String(spreadsheetId || "").trim();

  if (!normalizedSpreadsheetId) {
    throw new Error("INVALID_REQUEST: Spreadsheet no informada.");
  }

  const file = Drive.Files.get(normalizedSpreadsheetId, {
    fields: "id,mimeType,capabilities",

    supportsAllDrives: true,
  });

  if (!file) {
    throw new Error("ACCESS_DENIED: No se puede acceder al fichero.");
  }

  if (String(file.mimeType || "") !== RCS_SPREADSHEET_MIME_TYPE) {
    throw new Error("INVALID_SOURCE: El origen no es una Google Spreadsheet.");
  }

  const capabilities = file.capabilities || {};

  const canEdit = capabilities.canEdit === true;

  const user = getRcsCurrentUser_();

  return {
    granted: true,

    role: canEdit ? "editor" : "viewer",

    canEdit,

    user,
  };
}
function validateRcsSheetsReadAccess_(spreadsheetId) {
  const normalizedSpreadsheetId = String(spreadsheetId || "").trim();

  if (!normalizedSpreadsheetId) {
    throw new Error("INVALID_REQUEST: Spreadsheet no informada.");
  }

  /*
   * No necesitamos recuperar datos.
   *
   * Esta llamada tiene dos objetivos:
   *
   * - comprobar que el usuario puede leer la Spreadsheet;
   * - forzar la validación del scope spreadsheets.readonly.
   */

  Sheets.Spreadsheets.get(normalizedSpreadsheetId, {
    fields: "spreadsheetId",
  });
}
/**
 * =========================================================
 * PANTALLA DE AUTORIZACIÓN
 * =========================================================
 */

function renderCockpitAuthorizationPage_(spreadsheetId) {
  const normalizedSpreadsheetId = String(spreadsheetId || "").trim();

  if (!normalizedSpreadsheetId) {
    return HtmlService.createHtmlOutput(
      buildAuthorizationHtml_({
        success: false,

        title: "No se puede validar el acceso",

        message: "No se ha informado el origen que debe validarse.",

        autoClose: false,
      }),
    );
  }

  try {
    const access = resolveSpreadsheetAccess_(normalizedSpreadsheetId);

    /*
     * =====================================================
     * GOOGLE SHEETS API
     * =====================================================
     *
     * Drive puede estar autorizado mientras que Sheets
     * todavía necesita consentimiento OAuth.
     *
     * La validación interactiva debe comprobar ambos
     * permisos antes de considerar completado el acceso.
     * =====================================================
     */

    validateRcsSheetsReadAccess_(normalizedSpreadsheetId);

    const roleLabel = access.role === "editor" ? "Editor" : "Lector";

    return HtmlService.createHtmlOutput(
      buildAuthorizationHtml_({
        success: true,

        title: "Acceso validado",

        message: `Tu acceso al RCS Cockpit se ha validado como ${roleLabel}.`,

        autoClose: true,
      }),
    );
  } catch (error) {
    console.error(error);

    const code = classifyAccessError_(error);

    const denied = code === "ACCESS_DENIED";

    return HtmlService.createHtmlOutput(
      buildAuthorizationHtml_({
        success: false,

        title: denied
          ? "Acceso no autorizado"
          : "No se puede validar el acceso",

        message: denied
          ? "Tu cuenta no tiene acceso a la Spreadsheet asociada al RCS Cockpit."
          : "No se ha podido completar la validación de tu cuenta.",

        autoClose: false,
      }),
    );
  }
}

/**
 * =========================================================
 * HTML AUTORIZACIÓN
 * =========================================================
 */

function buildAuthorizationHtml_(options) {
  const success = options && options.success === true;

  const title = escapeAuthorizationHtml_(options?.title || "");

  const message = escapeAuthorizationHtml_(options?.message || "");

  const autoClose = options && options.autoClose === true;

  return `
    <!doctype html>

    <html lang="es">

      <head>

        <meta charset="utf-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        >

        <title>
          RCS Cockpit
        </title>

        <style>

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            padding: 32px;
            background:
              linear-gradient(
                135deg,
                #041e42 0%,
                #072f78 55%,
                #004481 100%
              );
            font-family:
              Arial,
              Helvetica,
              sans-serif;
          }

          .card {
            width: min(520px, 100%);
            padding: 42px;
            border-radius: 24px;
            background: #ffffff;
            text-align: center;
            box-shadow:
              0 28px 70px
              rgba(0, 0, 0, 0.28);
          }

          .brand {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 82px;
            height: 36px;
            margin-bottom: 26px;
            padding: 0 18px;
            border-radius: 6px;
            background: #072f78;
            color: #ffffff;
            font-size: 18px;
            font-weight: 900;
            letter-spacing: 0.08em;
          }

          h1 {
            margin: 0;
            color: #072f78;
            font-family: Georgia, serif;
            font-size: 32px;
          }

          p {
            margin: 18px auto 0;
            color: #526b8d;
            font-size: 15px;
            line-height: 1.55;
          }

          .status {
            display: inline-flex;
            margin-top: 24px;
            padding: 7px 14px;
            border-radius: 999px;
            background:
              ${success ? "#edf9f2" : "#fff3f1"};
            color:
              ${success ? "#157a47" : "#b42318"};
            font-size: 12px;
            font-weight: 900;
          }

        </style>

      </head>

      <body>

        <main class="card">

          <span class="brand">
            BBVA
          </span>

          <h1>
            ${title}
          </h1>

          <p>
            ${message}
          </p>

          <span class="status">
            ${success ? "Validación completada" : "Validación pendiente"}
          </span>

          ${
            autoClose
              ? `
                <p>
                  Esta ventana se cerrará automáticamente.
                </p>

                <script>
                  window.setTimeout(
                    function () {
                      window.close();
                    },
                    900
                  );
                </script>
              `
              : ""
          }

        </main>

      </body>

    </html>
  `;
}

function escapeAuthorizationHtml_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * =========================================================
 * ERROR CLASSIFICATION
 * =========================================================
 */
function isRcsSheetsAuthorizationError_(error) {
  const message = String(error && error.message ? error.message : error || "")
    .trim()
    .toLowerCase();

  if (!message) {
    return false;
  }

  return (
    message.includes("sheets.spreadsheets.values.batchget") ||
    message.includes("sheets.spreadsheets.get") ||
    message.includes("https://www.googleapis.com/auth/spreadsheets.readonly") ||
    message.includes("insufficient authentication scopes") ||
    message.includes("insufficient oauth scope")
  );
}
function classifyAccessError_(error) {
  const message = String(
    error && error.message ? error.message : error || "",
  ).toLowerCase();

  /*
   * =====================================================
   * AUTORIZACIÓN OAUTH
   * =====================================================
   *
   * El usuario puede tener ya autorizado Drive pero no
   * el scope de Google Sheets introducido posteriormente.
   *
   * No es ACCESS_DENIED: necesita completar OAuth.
   * =====================================================
   */

  if (isRcsSheetsAuthorizationError_(error)) {
    return "AUTHORIZATION_REQUIRED";
  }

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
function getRcsCurrentUser_() {
  try {
    const about = Drive.About.get({
      fields: "user(displayName,emailAddress)",
    });

    const user = about && about.user ? about.user : {};

    return {
      name: String(user.displayName || "").trim(),

      email: String(user.emailAddress || "")
        .trim()
        .toLowerCase(),
    };
  } catch (error) {
    console.warn(
      "[RCS Access] No se ha podido recuperar la identidad del usuario.",
      error,
    );

    return {
      name: "",
      email: "",
    };
  }
}

function getCockpitLandingData_(spreadsheetId, forceRefresh = false) {
  const cache = CacheService.getScriptCache();

  /*
   * Nueva versión para no reutilizar
   * ninguna respuesta fallida anterior.
   */

  const cacheKey = `rcs-landing-v5:${spreadsheetId}`;

  if (!forceRefresh) {
    try {
      const cached = cache.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn(
        "[RCS Access] No se pudo recuperar la landing de cache.",
        error,
      );
    }
  }

  try {
    /*
     * =====================================================
     * UNA SOLA LLAMADA A GOOGLE SHEETS API
     * =====================================================
     *
     * Leemos exclusivamente:
     *
     * - programs
     * - portfolio_kpis
     *
     * No cargamos el dataset core del Portfolio.
     * =====================================================
     */

    const response = Sheets.Spreadsheets.Values.batchGet(spreadsheetId, {
      ranges: ["programs", "portfolio_kpis"],

      valueRenderOption: "FORMATTED_VALUE",
    });

    const valueRanges = Array.isArray(response?.valueRanges)
      ? response.valueRanges
      : [];

    const programsRows = Array.isArray(valueRanges[0]?.values)
      ? valueRanges[0].values
      : [];

    const kpisRows = Array.isArray(valueRanges[1]?.values)
      ? valueRanges[1].values
      : [];

    const programs = rowsToCockpitPrograms_(programsRows);

    const portfolioKpis = rowsToCockpitPortfolioKpis_(kpisRows);

    if (!programs.length) {
      throw new Error('La pestaña "programs" no contiene programas válidos.');
    }

    const result = {
      available: true,

      portfolioKpis,

      programs,

      generatedAt: new Date().toISOString(),
    };

    /*
     * =====================================================
     * CACHE SERVIDOR · 5 MINUTOS
     * =====================================================
     */

    try {
      cache.put(cacheKey, JSON.stringify(result), 300);
    } catch (error) {
      console.warn("[RCS Access] No se pudo cachear la landing.", error);
    }

    return result;
  } catch (error) {
    console.error("[RCS Access] Error cargando landing.", error);

    /*
     * =====================================================
     * OAUTH
     * =====================================================
     *
     * Este error NO representa una landing no disponible.
     *
     * Debe llegar hasta doGet() para convertirse en
     * AUTHORIZATION_REQUIRED y permitir que el frontend
     * active el flujo interactivo de Google Workspace.
     * =====================================================
     */

    if (isRcsSheetsAuthorizationError_(error)) {
      throw error;
    }

    return {
      available: false,

      portfolioKpis: [],

      programs: [],

      error: String(error?.message || error || "Error desconocido"),

      generatedAt: new Date().toISOString(),
    };
  }
}

function toCockpitNumber_(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");

  const number = Number(normalized);

  return Number.isFinite(number) ? number : 0;
}

function toCockpitBoolean_(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return ["true", "1", "yes", "si", "x"].includes(normalized);
}

function rowsToCockpitPrograms_(rows) {
  if (!Array.isArray(rows) || rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((header) => String(header || "").trim());

  return rows
    .slice(1)
    .filter((row) => row.some((value) => String(value ?? "").trim() !== ""))
    .map((row) => {
      const program = {};

      headers.forEach((header, index) => {
        if (!header) {
          return;
        }

        program[header] = String(row[index] ?? "").trim();
      });

      program.functional = toCockpitNumber_(program.functional);

      program.systems = toCockpitNumber_(program.systems);

      program.architecture = toCockpitNumber_(program.architecture);

      program.enabled = toCockpitBoolean_(program.enabled);

      /*
       * Compatibilidad con nombres legacy.
       */

      if (!program.id && program.programId) {
        program.id = program.programId;
      }

      if (!program.name && program.programName) {
        program.name = program.programName;
      }

      return program;
    })
    .filter((program) => Boolean(String(program.id || "").trim()));
}

function rowsToCockpitPortfolioKpis_(rows) {
  if (!Array.isArray(rows) || rows.length < 2) {
    return [];
  }

  /*
   * El frontend histórico espera arrays,
   * no objetos:
   *
   * [label, value, subtitle, icon]
   */

  return rows
    .slice(1)
    .filter((row) => row.some((value) => String(value ?? "").trim() !== ""))
    .map((row) => row.map((value) => String(value ?? "").trim()));
}
