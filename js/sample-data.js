/*
 * Fallback deliberadamente vacío para producción.
 *
 * El cockpit no debe depender de snapshots reales versionados en el
 * repositorio. Si el origen corporativo no está disponible, app.js puede
 * utilizar esta estructura mínima y mostrar el estado de error correspondiente.
 */
const EMPTY_SAMPLE_DATA = {
  portfolioKpis: [],
  programs: [],
};

window.SAMPLE_DATA = EMPTY_SAMPLE_DATA;

async function loadSampleData() {
  return {
    portfolioKpis: [],
    programs: [],
  };
}

window.loadSampleData = loadSampleData;
