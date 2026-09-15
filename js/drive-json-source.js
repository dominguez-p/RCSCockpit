function createJsonpRequest(
  url,
  timeoutMs = 25000,
  { cacheBust = false } = {},
) {
  return new Promise((resolve, reject) => {
    const callbackName = `__rcsJsonp_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

    const script = document.createElement("script");

    let settled = false;
    let timer = null;

    /*
     * =====================================================
     * CALLBACK TARDÍO
     * =====================================================
     *
     * Apps Script puede seguir ejecutándose aunque
     * nosotros hayamos alcanzado el timeout.
     *
     * En caso de timeout mantenemos temporalmente
     * un callback vacío que absorbe una respuesta tardía.
     */
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
      finish(() => {
        reject(new Error("No se pudo cargar el JSON desde Apps Script."));
      });
    };

    timer = window.setTimeout(() => {
      finish(
        () => {
          reject(new Error("Tiempo de espera agotado al cargar Apps Script."));
        },
        {
          preserveLateCallback: true,
        },
      );
    }, timeoutMs);

    const requestUrl = new URL(url, window.location.href);

    requestUrl.searchParams.delete("callback");
    requestUrl.searchParams.delete("_");

    requestUrl.searchParams.set("callback", callbackName);

    /*
     * Sólo forzamos una URL completamente nueva
     * cuando necesitamos una actualización explícita.
     *
     * Las cargas normales pueden reutilizar el comportamiento
     * de caché disponible en la infraestructura intermedia.
     */
    if (cacheBust) {
      requestUrl.searchParams.set("_", String(Date.now()));
    }

    script.src = requestUrl.toString();
    script.async = true;

    document.head.appendChild(script);
  });
}

async function loadJsonp(
  url,
  { timeoutMs = 25000, retries = 1, cacheBust = false } = {},
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
          "Fallo cargando Apps Script. " +
          `Intento ${attempt}/${totalAttempts}.`,
        error,
      );
    }
  }

  throw lastError || new Error("No se pudo cargar Apps Script.");
}

async function loadJsonpOnDemand(
  url,
  { timeoutMs = 45000, retries = 0, cacheBust = false } = {},
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
          "Fallo carga on-demand Apps Script. " +
          `Intento ${attempt}/${totalAttempts}.`,
        error,
      );
    }
  }

  throw lastError || new Error("No se pudo cargar el dataset on-demand.");
}
