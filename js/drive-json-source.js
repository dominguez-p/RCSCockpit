function createJsonpRequest(url, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const callbackName = `__rcsJsonp_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

    const separator = url.includes("?") ? "&" : "?";

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
     * Eliminar inmediatamente:
     *
     * window[callbackName]
     *
     * provoca:
     *
     * ReferenceError:
     * __rcsJsonp_xxx is not defined
     *
     * cuando la respuesta llega unos segundos después.
     *
     * En caso de timeout dejamos temporalmente un
     * callback vacío que absorbe esa respuesta tardía.
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

    script.src =
      `${url}${separator}` +
      `callback=${encodeURIComponent(callbackName)}` +
      `&_=${Date.now()}`;

    script.async = true;

    document.head.appendChild(script);
  });
}

async function loadJsonp(url, { timeoutMs = 25000, retries = 1 } = {}) {
  let lastError = null;

  const totalAttempts = Math.max(1, Number(retries || 0) + 1);

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    try {
      return await createJsonpRequest(url, timeoutMs);
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

async function loadJsonpOnDemand(url, { timeoutMs = 45000, retries = 1 } = {}) {
  let lastError = null;

  const totalAttempts = Math.max(1, Number(retries || 0) + 1);

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    try {
      return await createJsonpRequest(url, timeoutMs);
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
