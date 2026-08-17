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

function contextToolbarEscape(value) {
  if (typeof rcsEsc === "function") {
    return rcsEsc(value);
  }

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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

function contextToolbarCountryButton(country, variant) {
  const countryId = String(country?.id || "").trim();

  const label = String(country?.label || countryId).trim();

  const flagSrc = String(country?.flagSrc || "").trim();

  const active = String(selectedCountry || "").trim() === countryId;

  return `
    <button
      type="button"
      class="
        global-context-scope-button
        is-${contextToolbarEscape(variant)}
        ${active ? "active" : ""}
      "
      data-country="${contextToolbarEscape(countryId)}"
      aria-pressed="${active ? "true" : "false"}"
      title="${contextToolbarEscape(label)}"
    >
      ${
        flagSrc
          ? `
              <img
                src="${contextToolbarEscape(flagSrc)}"
                alt=""
                aria-hidden="true"
              />
            `
          : ""
      }

      <span>
        ${contextToolbarEscape(label)}
      </span>
    </button>
  `;
}

function contextToolbarRenderScope() {
  const countries =
    typeof COUNTRIES !== "undefined" && Array.isArray(COUNTRIES)
      ? COUNTRIES
      : [];

  const holding = countries.find(
    (country) => String(country?.id || "").trim() === "HL",
  );

  const localCountries = countries.filter(
    (country) => String(country?.id || "").trim() !== "HL",
  );

  if (!holding && !localCountries.length) {
    return "";
  }

  return `
    <div
      class="
        global-context-scope
      "
      aria-label="Ámbito de la información"
    >
      ${
        holding
          ? `
              <div
                class="
                  global-context-scope-group
                  is-global
                "
              >
                <span
                  class="
                    global-context-label
                    global-context-scope-label
                  "
                >
                  Global
                </span>

                <div
                  class="
                    global-context-scope-actions
                  "
                >
                  ${contextToolbarCountryButton(holding, "holding")}
                </div>
              </div>
            `
          : ""
      }

      ${
        holding && localCountries.length
          ? `
              <span
                class="
                  global-context-scope-divider
                "
                aria-hidden="true"
              ></span>
            `
          : ""
      }

      ${
        localCountries.length
          ? `
              <div
                class="
                  global-context-scope-group
                  is-countries
                "
              >
                <span
                  class="
                    global-context-label
                    global-context-scope-label
                  "
                >
                  Ejecución por país
                </span>

                <nav
                  class="
                    global-context-scope-actions
                    global-context-country-actions
                  "
                  aria-label="Seleccionar país"
                >
                  ${localCountries
                    .map((country) =>
                      contextToolbarCountryButton(country, "country"),
                    )
                    .join("")}
                </nav>
              </div>
            `
          : ""
      }
    </div>
  `;
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
    {
      id: "ALL",
      label: "Año",
    },
    {
      id: "Q1",
      label: "Q1",
    },
    {
      id: "Q2",
      label: "Q2",
    },
    {
      id: "Q3",
      label: "Q3",
    },
    {
      id: "Q4",
      label: "Q4",
    },
  ];

  return `
    <div
      class="
        global-context-control
        global-context-period
        ${isBacklog ? "is-disabled" : ""}
      "
      ${
        isBacklog
          ? 'title="El backlog contiene elementos sin planificación temporal"'
          : ""
      }
    >
      <span
        class="
          global-context-label
        "
      >
        Periodo
      </span>

      <nav
        class="
          global-context-period-selector
        "
        aria-label="Periodo del roadmap"
      >
        ${quarters
          .map(
            (quarter) => `
              <button
                type="button"
                class="
                  global-context-period-button
                  ${selectedQuarter === quarter.id ? "active" : ""}
                "
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

  const scopeMarkup = contextToolbarRenderScope();

  const periodMarkup = showPeriod
    ? contextToolbarRenderPeriod(context.programId)
    : "";

  container.innerHTML = `
    ${scopeMarkup}
    ${periodMarkup}
  `;

  container.hidden = false;
}

/*
 * Se envuelve el router ya compuesto por el workspace,
 * las ambiciones y las tarjetas adaptativas.
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

document.addEventListener("click", (event) => {
  if (event.target.closest(".global-context-scope [data-country]")) {
    requestAnimationFrame(renderGlobalContextFilters);
  }
});

function contextToolbarLoadPortfolioUxPolish() {
  if (!document.querySelector("#portfolioUxPolishStyles")) {
    const stylesheet = document.createElement("link");

    stylesheet.id = "portfolioUxPolishStyles";

    stylesheet.rel = "stylesheet";

    stylesheet.href = "styles/portfolio-ux-polish.css";

    document.head.append(stylesheet);
  }

  if (document.querySelector("#portfolioUxPolishScript")) {
    return;
  }

  const script = document.createElement("script");

  script.id = "portfolioUxPolishScript";

  script.src = "js/portfolio-ux-polish.js";

  script.onload = () => {
    const context = contextToolbarRoute();

    if (view.querySelector(".portfolio-home")) {
      renderLanding();

      return;
    }

    if (
      context.routeName === "program" &&
      context.programId &&
      view.querySelector(".program-home")
    ) {
      renderProgram(context.programId);

      requestAnimationFrame(renderGlobalContextFilters);
    }
  };

  script.onerror = () => {
    console.error("No se pudo cargar la mejora de portfolio y landing.");
  };

  document.body.append(script);
}

function contextToolbarLoadNavigationUxFixes() {
  if (!document.querySelector("#navigationUxFixesStyles")) {
    const stylesheet = document.createElement("link");

    stylesheet.id = "navigationUxFixesStyles";

    stylesheet.rel = "stylesheet";

    stylesheet.href = "styles/navigation-ux-fixes.css?v=3";

    document.head.append(stylesheet);
  }

  if (document.querySelector("#navigationUxFixesScript")) {
    return;
  }

  const script = document.createElement("script");

  script.id = "navigationUxFixesScript";

  script.src = "js/navigation-ux-fixes.js?v=3";

  script.onerror = () => {
    console.error("No se pudieron cargar los ajustes de navegación.");
  };

  document.body.append(script);
}

requestAnimationFrame(renderGlobalContextFilters);

contextToolbarLoadPortfolioUxPolish();
contextToolbarLoadNavigationUxFixes();
