/*
 * Transporte JSONP para los Web Apps de Google Apps Script.
 *
 * Responsabilidades:
 *
 * - generar callbacks JSONP únicos;
 * - controlar errores de red;
 * - limitar el tiempo máximo de espera;
 * - absorber respuestas tardías de Apps Script;
 * - reintentar únicamente errores reales de carga;
 * - evitar callbacks huérfanos en window.
 *
 * La lógica de Portfolio y Programas vive en app.js.
 */

let jsonpRequestSequence = 0;

const JSONP_DEFAULT_TIMEOUT_MS = 25000;
const JSONP_DEFAULT_ATTEMPTS = 2;
const JSONP_DEFAULT_RETRY_DELAY_MS = 900;
const JSONP_LATE_CALLBACK_GRACE_MS = 60000;

function waitForJsonpRetry(delayMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function releaseJsonpCallbackLater(callbackName) {
  const lateCallback = function lateJsonpCallback() {
    console.warn(
      `[RCS Cockpit] Se recibió una respuesta JSONP tardía para ${callbackName}. ` +
        "La respuesta se ignora porque la aplicación ya activó el mecanismo de contingencia.",
    );
  };

  window[callbackName] = lateCallback;

  window.setTimeout(() => {
    if (window[callbackName] === lateCallback) {
      delete window[callbackName];
    }
  }, JSONP_LATE_CALLBACK_GRACE_MS);
}

function createJsonpError(message, code) {
  const error = new Error(message);

  error.code = code;

  return error;
}

function loadJsonpAttempt(
  url,
  { timeoutMs = JSONP_DEFAULT_TIMEOUT_MS, attemptNumber = 1 } = {},
) {
  return new Promise((resolve, reject) => {
    const callbackName = `portfolioJsonCallback_${Date.now()}_${jsonpRequestSequence++}`;

    const script = document.createElement("script");

    let settled = false;
    let timeoutId = null;

    const removeScript = () => {
      if (script.parentNode) {
        script.remove();
      }
    };

    const resolveRequest = (data) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      removeScript();

      delete window[callbackName];

      resolve(data);
    };

    const rejectRequest = (message, code, preserveLateCallback = false) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      removeScript();

      if (preserveLateCallback) {
        releaseJsonpCallbackLater(callbackName);
      } else {
        delete window[callbackName];
      }

      reject(createJsonpError(message, code));
    };

    window[callbackName] = resolveRequest;

    const separator = url.includes("?") ? "&" : "?";

    const requestId = `${Date.now()}-${attemptNumber}-${jsonpRequestSequence}`;

    script.async = true;

    script.src =
      `${url}${separator}` +
      `callback=${encodeURIComponent(callbackName)}` +
      `&_rcs_request=${encodeURIComponent(requestId)}`;

    script.onerror = () => {
      rejectRequest(
        `No se pudo cargar el JSON desde Apps Script ` +
          `(intento ${attemptNumber})`,
        "RCS_JSONP_NETWORK_ERROR",
        false,
      );
    };

    timeoutId = window.setTimeout(() => {
      /*
       * Importante:
       *
       * Eliminar un <script> no garantiza que una petición que ya
       * está siendo procesada por Apps Script deje de ejecutarse.
       *
       * Por eso NO eliminamos inmediatamente el callback global.
       * Lo sustituimos temporalmente por una función neutra para
       * absorber una posible respuesta tardía.
       */
      rejectRequest(
        `Tiempo de espera agotado al cargar Apps Script ` +
          `(intento ${attemptNumber})`,
        "RCS_JSONP_TIMEOUT",
        true,
      );
    }, timeoutMs);

    document.body.appendChild(script);
  });
}

async function loadJsonp(url, options = {}) {
  if (!url) {
    throw createJsonpError(
      "No se ha informado la URL del origen JSONP",
      "RCS_JSONP_URL_MISSING",
    );
  }

  const attempts = Math.max(
    1,
    Number(options.attempts ?? JSONP_DEFAULT_ATTEMPTS),
  );

  const timeoutMs = Math.max(
    1000,
    Number(options.timeoutMs ?? JSONP_DEFAULT_TIMEOUT_MS),
  );

  const retryDelayMs = Math.max(
    0,
    Number(options.retryDelayMs ?? JSONP_DEFAULT_RETRY_DELAY_MS),
  );

  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await loadJsonpAttempt(url, {
        timeoutMs,
        attemptNumber: attempt,
      });
    } catch (error) {
      lastError = error;

      console.warn(
        `[RCS Cockpit] Fallo cargando Apps Script. ` +
          `Intento ${attempt}/${attempts}.`,
        error,
      );

      /*
       * Un timeout significa que Apps Script puede seguir
       * procesando la petición.
       *
       * No lanzamos inmediatamente una segunda petición porque:
       *
       * - duplicaría trabajo en Apps Script;
       * - aumentaría la latencia;
       * - podría empeorar un cold start;
       * - podría provocar más llamadas simultáneas.
       *
       * El fallback del cockpit se encargará de mantener
       * disponible la experiencia.
       */
      if (error?.code === "RCS_JSONP_TIMEOUT") {
        throw error;
      }

      if (attempt < attempts) {
        await waitForJsonpRetry(retryDelayMs * attempt);
      }
    }
  }

  throw createJsonpError(
    `No se pudo cargar el JSON desde Apps Script ` +
      `tras ${attempts} intentos`,
    lastError?.code || "RCS_JSONP_LOAD_ERROR",
  );
}

window.loadJsonp = loadJsonp;
