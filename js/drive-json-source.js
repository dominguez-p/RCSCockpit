let jsonpRequestSequence = 0;

function loadJsonp(url) {
  return new Promise((resolve, reject) => {
    /*
     * Varias tarjetas del portfolio cargan orígenes en paralelo. Date.now()
     * por sí solo puede generar el mismo callback dentro del mismo milisegundo,
     * haciendo que una petición sobrescriba o elimine el callback de otra.
     */
    const callbackName =
      `portfolioJsonCallback_${Date.now()}_${jsonpRequestSequence++}`;
    const script = document.createElement("script");
    let settled = false;

    const cleanup = () => {
      script.remove();
      delete window[callbackName];
    };

    window[callbackName] = (data) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(data);
    };

    const separator = url.includes("?") ? "&" : "?";
    script.src = `${url}${separator}callback=${callbackName}`;
    script.onerror = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(new Error("No se pudo cargar el JSON desde Apps Script"));
    };

    document.body.appendChild(script);
  });
}

async function loadPortfolioData() {
  const source = window.APP_CONFIG.portfolio;

  if (!source) {
    throw new Error("No está configurado el origen general del portfolio");
  }

  return loadJsonp(source.driveJsonUrl);
}

async function loadProgramData(programId, options = {}) {
  const { forceRefresh = false } = options;

  if (!forceRefresh && PROGRAM_DATA.has(programId)) {
    return PROGRAM_DATA.get(programId);
  }

  const source = window.APP_CONFIG.programs?.[programId];

  if (!source) {
    throw new Error(`No existe un origen configurado para ${programId}`);
  }

  const data = await loadJsonp(source.driveJsonUrl);
  const normalizedData = normalizeProgramData(programId, data);

  PROGRAM_DATA.set(programId, normalizedData);

  return normalizedData;
}

function getProgramData(programId) {
  return PROGRAM_DATA.get(programId) || createEmptyProgramData();
}
