/*
 * =========================================================
 * RCS COCKPIT · DATA SOURCE
 * =========================================================
 *
 * Apps Script tiene únicamente tres responsabilidades
 * desde el navegador:
 *
 * 1. ACCESS CONTROL
 *
 *    Validar permisos mediante JSONP.
 *
 * 2. SNAPSHOT
 *
 *    Servir el JSON ya generado en Drive.
 *
 *    No reconstruye datos.
 *
 * 3. REFRESH
 *
 *    Regenerar explícitamente la fotografía cuando
 *    el usuario pulsa "Actualizar datos".
 *
 * No existen cargas de negocio por dataset.
 * =========================================================
 */

/* =========================================================
 * JSONP
 * ========================================================= */

function createJsonpRequest(
  url,
  timeoutMs = 30000,
  { cacheBust = false } = {},
) {
  return new Promise((resolve, reject) => {
    const callbackName = `__rcsJsonp_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

    const requestUrl = new URL(url, window.location.href);

    requestUrl.searchParams.delete("callback");

    requestUrl.searchParams.delete("_");

    requestUrl.searchParams.set("callback", callbackName);

    if (cacheBust) {
      requestUrl.searchParams.set("_", String(Date.now()));
    }

    const script = document.createElement("script");

    let settled = false;
    let timer = null;

    const createRequestError = (message, code) => {
      const error = new Error(message);

      error.code = code;

      error.requestUrl = requestUrl.toString();

      return error;
    };

    const installLateCallback = () => {
      window[callbackName] = () => {};

      window.setTimeout(() => {
        try {
          delete window[callbackName];
        } catch {
          window[callbackName] = undefined;
        }
      }, 180000);
    };

    const removeCallback = () => {
      try {
        delete window[callbackName];
      } catch {
        window[callbackName] = undefined;
      }
    };

    const removeScript = () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    const finish = (callback, { preserveLateCallback = false } = {}) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timer) {
        window.clearTimeout(timer);

        timer = null;
      }

      removeScript();

      if (preserveLateCallback) {
        installLateCallback();
      } else {
        removeCallback();
      }

      callback();
    };

    window[callbackName] = (data) => {
      finish(() => {
        resolve(data);
      });
    };

    script.onerror = () => {
      const error = createRequestError(
        "No se ha podido ejecutar la llamada a Apps Script.",
        "JSONP_SCRIPT_ERROR",
      );

      finish(() => {
        reject(error);
      });
    };

    timer = window.setTimeout(() => {
      const error = createRequestError(
        "Tiempo de espera agotado en Apps Script.",
        "JSONP_TIMEOUT",
      );

      finish(
        () => {
          reject(error);
        },
        {
          preserveLateCallback: true,
        },
      );
    }, timeoutMs);

    script.src = requestUrl.toString();

    script.async = true;

    document.head.appendChild(script);
  });
}

/* =========================================================
 * JSONP CON REINTENTOS
 *
 * Se utiliza para:
 *
 * - Access Control.
 * - Lectura de action=snapshot.
 * ========================================================= */

async function loadJsonp(
  url,
  { timeoutMs = 30000, retries = 0, cacheBust = false } = {},
) {
  let lastError = null;

  const totalAttempts = Math.max(1, Number(retries || 0) + 1);

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    try {
      return await createJsonpRequest(url, timeoutMs, {
        cacheBust,
      });
    } catch (error) {
      lastError = error;

      console.warn(
        "[RCS Cockpit] " +
          "Fallo en llamada JSONP. " +
          `Intento ${attempt}/${totalAttempts}.`,
        error,
      );
    }
  }

  throw lastError || new Error("No se ha podido completar la llamada JSONP.");
}

/* =========================================================
 * REFRESH EXPLÍCITO
 * ========================================================= */

async function triggerDataRefresh(url, { timeoutMs = 120000 } = {}) {
  const normalizedUrl = String(url || "").trim();

  if (!normalizedUrl) {
    throw new Error("No se ha configurado la URL de actualización.");
  }

  const refreshUrl = new URL(normalizedUrl, window.location.href);

  refreshUrl.searchParams.delete("dataset");

  refreshUrl.searchParams.delete("action");

  refreshUrl.searchParams.set("action", "refresh");

  const payload = await createJsonpRequest(refreshUrl.toString(), timeoutMs, {
    cacheBust: true,
  });

  if (!payload || payload.ok === false) {
    throw new Error(
      payload?.error || "No se ha podido regenerar la fotografía de datos.",
    );
  }

  return payload;
}
