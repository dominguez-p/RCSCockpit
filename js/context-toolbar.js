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
function contextToolbarShouldShowScope(context) {
  if (!context?.programId) {
    return false;
  }

  const capabilityScopedRoutes = new Set([
    "roadmap",
    "roadmap-detail",
    "roadmap-activity",
    "roadmap-workspace-detail",
    "roadmap-workspace-activity",
  ]);

  if (!capabilityScopedRoutes.has(context.routeName)) {
    return true;
  }

  /*
   * Para las rutas de roadmap utilizamos el parser
   * del workspace, que conoce el nuevo contexto:
   *
   * programa
   * producto
   * periodo
   * ambición
   * capacidad
   * país
   */
  if (typeof roadmapWorkspaceParseRoute === "function") {
    const roadmapContext = roadmapWorkspaceParseRoute();

    const capabilityId = String(roadmapContext?.capabilityId || "")
      .trim()
      .toUpperCase();

    if (capabilityId && capabilityId !== "ALL") {
      return false;
    }
  }

  /*
   * En detalle y actividad parte del contexto puede
   * vivir ya en el estado del workspace.
   *
   * Esto evita que el selector vuelva a aparecer
   * al bajar desde una capacidad a un elemento
   * o a una actividad.
   */
  if (typeof roadmapWorkspaceState === "function") {
    const state = roadmapWorkspaceState(context.programId);

    const capabilityId = String(state?.capabilityId || "")
      .trim()
      .toUpperCase();

    if (capabilityId && capabilityId !== "ALL") {
      return false;
    }
  }

  return true;
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

  if (!hasProgramContext) {
    container.hidden = true;
    container.innerHTML = "";

    return;
  }

  /*
   * El selector geográfico sólo se muestra
   * cuando la geografía sigue siendo una
   * dimensión navegable.
   *
   * En un roadmap de capacidad concreta:
   *
   * producto + capacidad + país
   *
   * forman un contexto cerrado.
   */
  const showScope = contextToolbarShouldShowScope(context);

  /*
   * El periodo sólo se ofrece en el roadmap
   * general de producto.
   *
   * Si showScope === false significa que
   * estamos dentro de una capacidad concreta.
   * En ese caso tampoco mostramos:
   *
   * Año / Q1 / Q2 / Q3 / Q4
   *
   * La capacidad se consulta como un ámbito
   * completo mediante:
   *
   * Resumen / Cronograma / Backlog.
   */
  const showPeriod = context.routeName === "roadmap" && showScope;

  const scopeMarkup = showScope ? contextToolbarRenderScope() : "";

  const periodMarkup = showPeriod
    ? contextToolbarRenderPeriod(context.programId)
    : "";

  /*
   * Si el contexto actual no admite
   * ni navegación geográfica ni temporal,
   * ocultamos completamente el toolbar.
   *
   * Esto ocurre, por ejemplo, en:
   *
   * Sales Assistant · España
   * Knowledge Assistant · España
   * Marko · México
   */
  if (!scopeMarkup && !periodMarkup) {
    container.hidden = true;
    container.innerHTML = "";

    return;
  }

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
