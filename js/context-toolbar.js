const CONTEXT_TOOLBAR_PROGRAM_ROUTES = new Set([
  "program",
  "functional",
  "systems",
  "architecture",
  "roadmap",
  "roadmap-detail",
  "roadmap-activity",
  "roadmap-workspace-detail",
  "roadmap-workspace-activity",
  "projects",
  "msas",
  "teams",
  "impediments",
  "decisions",
]);

function contextToolbarDecode(value) {
  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function contextToolbarRoute() {
  const parts = String(location.hash || "")
    .replace(/^#/, "")
    .split("/");

  return {
    routeName: parts[0] || "landing",
    programId: contextToolbarDecode(parts[1]),
  };
}

function contextToolbarRenderPeriod(programId) {
  if (
    typeof roadmapWorkspaceState !== "function" ||
    typeof roadmapWorkspaceValidQuarter !== "function"
  ) {
    return "";
  }

  const routeContext =
    typeof roadmapWorkspaceParseRoute === "function"
      ? roadmapWorkspaceParseRoute()
      : {};

  /*
   * El estado del workspace ya ha sido actualizado por el renderer.
   * Se prioriza sobre la URL para mantener compatibilidad con rutas antiguas.
   */
  const state = roadmapWorkspaceState(programId);
  const selectedQuarter = roadmapWorkspaceValidQuarter(
    state.quarter || routeContext.quarter || "ALL",
  );
  const currentView = String(
    state.view || routeContext.viewName || "summary",
  ).toLowerCase();
  const isBacklog = currentView === "backlog";

  const quarters = [
    { id: "ALL", label: "Año" },
    { id: "Q1", label: "Q1" },
    { id: "Q2", label: "Q2" },
    { id: "Q3", label: "Q3" },
    { id: "Q4", label: "Q4" },
  ];

  return `
    <div
      class="global-context-control global-context-period ${
        isBacklog ? "is-disabled" : ""
      }"
      ${
        isBacklog
          ? 'title="El backlog contiene elementos sin planificación temporal"'
          : ""
      }
    >
      <span class="global-context-label">Periodo</span>

      <nav
        class="global-context-period-selector"
        aria-label="Periodo del roadmap"
      >
        ${quarters
          .map(
            (quarter) => `
              <button
                type="button"
                class="global-context-period-button ${
                  selectedQuarter === quarter.id ? "active" : ""
                }"
                data-roadmap-workspace-quarter="${quarter.id}"
                data-program-id="${roadmapWorkspaceEscape(programId)}"
                aria-pressed="${
                  selectedQuarter === quarter.id ? "true" : "false"
                }"
                ${isBacklog ? "disabled" : ""}
              >
                ${quarter.label}
              </button>
            `,
          )
          .join("")}
      </nav>
    </div>
  `;
}

function renderGlobalContextFilters() {
  const container = document.querySelector("#globalContextFilters");

  if (!container) {
    return;
  }

  const context = contextToolbarRoute();
  const hasProgramContext =
    Boolean(context.programId) &&
    CONTEXT_TOOLBAR_PROGRAM_ROUTES.has(context.routeName);

  /*
   * Periodo solo se muestra en la pantalla principal de Roadmap.
   * En los detalles se conserva el periodo en la URL, pero no se modifica.
   */
  const showPeriod = context.routeName === "roadmap";

  if (!hasProgramContext) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }

  const countryMarkup =
    typeof renderCountrySelector === "function"
      ? `
          <div class="global-context-control global-context-country">
            <span class="global-context-label">País</span>
            ${renderCountrySelector()}
          </div>
        `
      : "";

  const periodMarkup = showPeriod
    ? contextToolbarRenderPeriod(context.programId)
    : "";

  container.innerHTML = `
    ${countryMarkup}
    ${periodMarkup}
  `;

  container.hidden = false;
}

/*
 * Se envuelve el router ya compuesto por el workspace, las ambiciones
 * y las tarjetas adaptativas.
 */
const contextToolbarBaseRenderCurrentRoute = renderCurrentRoute;

renderCurrentRoute = function renderRouteWithContextToolbar(...args) {
  const result = contextToolbarBaseRenderCurrentRoute(...args);

  requestAnimationFrame(renderGlobalContextFilters);

  return result;
};

window.addEventListener("hashchange", () => {
  requestAnimationFrame(renderGlobalContextFilters);
});

document.addEventListener("change", (event) => {
  if (event.target.closest(".country-selector")) {
    requestAnimationFrame(renderGlobalContextFilters);
  }
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".country-selector")) {
    requestAnimationFrame(renderGlobalContextFilters);
  }
});

function contextToolbarLoadNavigationUxFixes() {
  if (!document.querySelector("#navigationUxFixesStyles")) {
    const stylesheet = document.createElement("link");
    stylesheet.id = "navigationUxFixesStyles";
    stylesheet.rel = "stylesheet";
    stylesheet.href = "styles/navigation-ux-fixes.css";
    document.head.append(stylesheet);
  }

  if (document.querySelector("#navigationUxFixesScript")) {
    return;
  }

  const script = document.createElement("script");
  script.id = "navigationUxFixesScript";
  script.src = "js/navigation-ux-fixes.js";
  script.onerror = () => {
    console.error("No se pudieron cargar los ajustes de navegación y cabecera.");
  };

  document.body.append(script);
}

function contextToolbarLoadPortfolioUxPolish() {
  if (!document.querySelector("#portfolioUxPolishStyles")) {
    const stylesheet = document.createElement("link");
    stylesheet.id = "portfolioUxPolishStyles";
    stylesheet.rel = "stylesheet";
    stylesheet.href = "styles/portfolio-ux-polish.css";
    document.head.append(stylesheet);
  }

  if (document.querySelector("#portfolioUxPolishScript")) {
    contextToolbarLoadNavigationUxFixes();
    return;
  }

  const script = document.createElement("script");
  script.id = "portfolioUxPolishScript";
  script.src = "js/portfolio-ux-polish.js";
  script.onload = () => {
    const context = contextToolbarRoute();

    if (view.querySelector(".portfolio-home")) {
      renderLanding();
    } else if (
      context.routeName === "program" &&
      context.programId &&
      view.querySelector(".program-home")
    ) {
      renderProgram(context.programId);
      requestAnimationFrame(renderGlobalContextFilters);
    }

    contextToolbarLoadNavigationUxFixes();
  };
  script.onerror = () => {
    console.error("No se pudo cargar la mejora de portfolio y landing.");
    contextToolbarLoadNavigationUxFixes();
  };

  document.body.append(script);
}

requestAnimationFrame(renderGlobalContextFilters);
contextToolbarLoadPortfolioUxPolish();
