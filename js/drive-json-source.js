function loadJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `portfolioJsonCallback_${Date.now()}`;

    window[callbackName] = (data) => {
      delete window[callbackName];
      script.remove();
      resolve(data);
    };

    const script = document.createElement("script");
    const separator = url.includes("?") ? "&" : "?";
    script.src = `${url}${separator}callback=${callbackName}`;
    script.onerror = () => {
      delete window[callbackName];
      script.remove();
      reject(new Error("No se pudo cargar el JSON desde Apps Script"));
    };

    document.body.appendChild(script);
  });
}

async function loadData() {
  if (window.APP_CONFIG.runtime === "drive-json") {
    return loadJsonp(window.APP_CONFIG.driveJsonUrl);
  }

  if (window.APP_CONFIG.useGoogleSheets) {
    return loadGoogleSheetsData();
  }

  return window.SAMPLE_DATA;
}
