const CONTEXT_TOOLBAR_PROGRAM_ROUTES = new Set([
  "program",
  "product",
  "capability",
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

const CONTEXT_TOOLBAR_MIN_ROADMAP_YEAR = 2000;
const CONTEXT_TOOLBAR_MAX_ROADMAP_YEAR = 2100;

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
    .replace(/^#\/?/, "")
    .split("/")
    .map((part) => contextToolbarDecode(part));

  const routeName = parts[0] || "landing";

  const context = {
    routeName,

    programId: parts[1] || "",

    viewName: "",

    productId: "",

    capabilityId: "",

    countryId: "",

    period: "",

    ambitionId: "",

    itemType: "",

    itemId: "",

    activityId: "",

    parts,
  };

  /*
   * PRODUCT
   *
   * product/
   * aixbanker/
   * blue-buddy/
   * ES
   */
  if (routeName === "product") {
    context.productId = parts[2] || "";

    context.countryId = parts[3] || "HL";

    return context;
  }

  /*
   * CAPABILITY
   */
  if (routeName === "capability") {
    context.productId = parts[2] || "";

    context.capabilityId = parts[3] || "";

    context.countryId = parts[4] || "HL";

    return context;
  }

  /*
   * ROADMAP WORKSPACE
   */
  if (routeName === "roadmap") {
    context.viewName = parts[2] || "summary";

    context.productId = parts[3] || "ALL";

    context.period = parts[4] || "ALL";

    context.ambitionId = parts[5] || "ALL";

    context.capabilityId = parts[6] || "ALL";

    context.countryId = parts[7] || String(selectedCountry || "HL");

    return context;
  }

  /*
   * ROADMAP DETAIL LEGACY
   *
   * roadmap-detail/
   * aixbanker/
   * blue-buddy/
   * ES/
   * project/
   * discurso-personalizado
   */
  if (routeName === "roadmap-detail") {
    context.productId = parts[2] || "";

    context.countryId = parts[3] || String(selectedCountry || "HL");

    context.itemType = parts[4] || "";

    context.itemId = parts[5] || "";

    return context;
  }

  /*
   * ROADMAP ACTIVITY LEGACY
   */
  if (routeName === "roadmap-activity") {
    context.productId = parts[2] || "";

    context.countryId = parts[3] || String(selectedCountry || "HL");

    context.itemType = parts[4] || "";

    context.itemId = parts[5] || "";

    context.activityId = parts[6] || "";

    return context;
  }

  /*
   * WORKSPACE DETAIL /
   * WORKSPACE ACTIVITY
   */
  if (
    ["roadmap-workspace-detail", "roadmap-workspace-activity"].includes(
      routeName,
    ) &&
    typeof roadmapWorkspaceParseRoute === "function"
  ) {
    const roadmapContext = roadmapWorkspaceParseRoute();

    return {
      ...context,
      ...roadmapContext,

      routeName,
      parts,
    };
  }

  return context;
}

function contextToolbarHasProgramContext(context = contextToolbarRoute()) {
  return (
    Boolean(context.programId) &&
    CONTEXT_TOOLBAR_PROGRAM_ROUTES.has(context.routeName)
  );
}
function contextToolbarNormalizeCountryId(value) {
  const countryId = String(value || "")
    .trim()
    .toUpperCase();

  const countries =
    typeof COUNTRIES !== "undefined" && Array.isArray(COUNTRIES)
      ? COUNTRIES
      : [];

  const exists = countries.some(
    (country) =>
      String(country?.id || "")
        .trim()
        .toUpperCase() === countryId,
  );

  return exists ? countryId : "";
}

function contextToolbarCountryTargetRoute(targetCountryId) {
  const countryId = contextToolbarNormalizeCountryId(targetCountryId);

  if (!countryId) {
    return "";
  }

  const context = contextToolbarRoute();

  const programId = String(context?.programId || "").trim();

  if (!programId) {
    return "";
  }

  /*
   * La geografía es navegación de
   * primer nivel.
   *
   * Cambiarla siempre vuelve a la
   * ficha raíz del programa.
   *
   * NO conservamos:
   *
   * - producto
   * - capacidad
   * - roadmap
   * - año
   * - ambición
   * - proyecto
   * - actividad
   * - tarea
   */
  return ["program", encodeURIComponent(programId)].join("/");
}
function contextToolbarOrderedCountries() {
  const countries =
    typeof COUNTRIES !== "undefined" && Array.isArray(COUNTRIES)
      ? COUNTRIES
      : [];

  const holding = countries.filter(
    (country) =>
      String(country?.id || "")
        .trim()
        .toUpperCase() === "HL",
  );

  const locals = countries.filter(
    (country) =>
      String(country?.id || "")
        .trim()
        .toUpperCase() !== "HL",
  );

  return [...holding, ...locals];
}

function contextToolbarCountryButton(country) {
  const countryId = String(country?.id || "").trim();
  const label = String(country?.label || countryId).trim();
  const flagSrc = String(country?.flagSrc || "").trim();
  const active = String(selectedCountry || "").trim() === countryId;
  const holding = countryId.toUpperCase() === "HL";

  return `
    <button
      type="button"
      class="sidebar-country-button ${active ? "active" : ""} ${
        holding ? "is-holding" : ""
      }"
      data-country="${contextToolbarEscape(countryId)}"
      aria-pressed="${active ? "true" : "false"}"
      ${active ? 'aria-current="true"' : ""}
      title="${contextToolbarEscape(label)}"
    >
      <span class="sidebar-country-flag">
        ${
          flagSrc
            ? `
                <img
                  src="${contextToolbarEscape(flagSrc)}"
                  alt=""
                  aria-hidden="true"
                />
              `
            : `<span aria-hidden="true">${contextToolbarEscape(countryId)}</span>`
        }
      </span>

      <span class="sidebar-country-name">
        ${contextToolbarEscape(label)}
      </span>
    </button>
  `;
}

function renderSidebarCountryNavigation() {
  const sidebar = document.querySelector(".sidebar");

  if (!sidebar) {
    return;
  }

  let navigation = sidebar.querySelector("#sidebarCountryNavigation");

  if (!navigation) {
    navigation = document.createElement("nav");
    navigation.id = "sidebarCountryNavigation";
    navigation.className = "sidebar-country-navigation global-context-scope";
    navigation.setAttribute("aria-label", "Navegación por país");

    const sideTitle = sidebar.querySelector(".side-title");

    if (sideTitle) {
      sideTitle.insertAdjacentElement("afterend", navigation);
    } else {
      sidebar.append(navigation);
    }
  }

  const hasProgramContext = contextToolbarHasProgramContext();
  const countries = contextToolbarOrderedCountries();

  sidebar.classList.toggle(
    "has-country-navigation",
    hasProgramContext && countries.length > 0,
  );

  if (!hasProgramContext || !countries.length) {
    navigation.hidden = true;
    navigation.innerHTML = "";
    return;
  }

  navigation.hidden = false;
  navigation.innerHTML = `
    <span class="sidebar-country-navigation-label">Ámbito</span>

    <div class="sidebar-country-list">
      ${countries
        .map((country, index) => {
          const separator =
            index === 1 &&
            String(countries[0]?.id || "")
              .trim()
              .toUpperCase() === "HL"
              ? '<span class="sidebar-country-separator" aria-hidden="true"></span>'
              : "";

          return `${separator}${contextToolbarCountryButton(country)}`;
        })
        .join("")}
    </div>
  `;
}

function renderGlobalContextFilters() {
  const container = document.querySelector("#globalContextFilters");

  if (!container) {
    return;
  }

  container.hidden = true;
  container.innerHTML = "";
}

function contextToolbarRoadmapYear(value) {
  const text = String(value ?? "").trim();

  if (!/^\d{4}$/.test(text)) {
    return "";
  }

  const year = Number(text);

  return year >= CONTEXT_TOOLBAR_MIN_ROADMAP_YEAR &&
    year <= CONTEXT_TOOLBAR_MAX_ROADMAP_YEAR
    ? text
    : "";
}

function contextToolbarRoadmapDate(value) {
  if (typeof parseValidDate === "function") {
    return parseValidDate(value);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function contextToolbarRoadmapItemDateRange(item) {
  const dates = [
    item?.startDate,
    item?.endDate,
    item?.targetDate,
    item?.nextMilestoneDate,
  ]
    .map(contextToolbarRoadmapDate)
    .filter(Boolean)
    .sort((left, right) => left.getTime() - right.getTime());

  if (!dates.length) {
    return null;
  }

  return {
    startDate: dates[0],
    endDate: dates[dates.length - 1],
  };
}

function contextToolbarRoadmapItemMatchesYear(item, yearValue) {
  const year = Number(contextToolbarRoadmapYear(yearValue));
  const range = contextToolbarRoadmapItemDateRange(item);

  if (!year || !range) {
    return false;
  }

  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

  return range.startDate <= endOfYear && range.endDate >= startOfYear;
}

function contextToolbarRoadmapScopeItems(items, state) {
  let result = Array.isArray(items) ? [...items] : [];

  const productId = String(
    state?.productId ||
      (typeof ROADMAP_WORKSPACE_ALL !== "undefined"
        ? ROADMAP_WORKSPACE_ALL
        : "ALL"),
  ).trim();

  if (productId && productId.toUpperCase() !== "ALL") {
    result = result.filter((item) => {
      const itemProduct =
        typeof roadmapWorkspaceNormalizeProduct === "function"
          ? roadmapWorkspaceNormalizeProduct(item?.product)
          : String(item?.product || "").trim();

      return itemProduct === productId;
    });
  }

  if (
    state?.ambitionId &&
    typeof roadmapAmbitionHas === "function" &&
    String(state.ambitionId).toUpperCase() !== "ALL"
  ) {
    result = result.filter((item) =>
      roadmapAmbitionHas(item, state.ambitionId),
    );
  }

  return result;
}

function contextToolbarRoadmapAvailableYears(
  programId,
  productId,
  items = null,
  state = null,
) {
  const sourceItems = Array.isArray(items)
    ? items
    : typeof roadmapWorkspaceItemsForProgram === "function"
      ? roadmapWorkspaceItemsForProgram(programId)
      : [];

  const scopeState = {
    ...(state || {}),
    productId:
      productId ||
      state?.productId ||
      (typeof ROADMAP_WORKSPACE_ALL !== "undefined"
        ? ROADMAP_WORKSPACE_ALL
        : "ALL"),
  };

  const years = new Set();

  contextToolbarRoadmapScopeItems(sourceItems, scopeState).forEach((item) => {
    const range = contextToolbarRoadmapItemDateRange(item);

    if (!range) {
      return;
    }

    const firstYear = Math.max(
      range.startDate.getFullYear(),
      CONTEXT_TOOLBAR_MIN_ROADMAP_YEAR,
    );
    const lastYear = Math.min(
      range.endDate.getFullYear(),
      CONTEXT_TOOLBAR_MAX_ROADMAP_YEAR,
    );

    for (let year = firstYear; year <= lastYear; year += 1) {
      years.add(year);
    }
  });

  return [...years].sort((left, right) => left - right);
}

function contextToolbarResolveRoadmapYear(
  programId,
  productId,
  requestedYear,
  items = null,
  state = null,
) {
  const years = contextToolbarRoadmapAvailableYears(
    programId,
    productId,
    items,
    state,
  );
  const requested = Number(contextToolbarRoadmapYear(requestedYear));

  if (requested && years.includes(requested)) {
    return String(requested);
  }

  const currentYear = new Date().getFullYear();

  if (years.includes(currentYear)) {
    return String(currentYear);
  }

  if (years.length) {
    const closestYear = [...years].sort((left, right) => {
      const leftDistance = Math.abs(left - currentYear);
      const rightDistance = Math.abs(right - currentYear);

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      return left - right;
    })[0];

    return String(closestYear);
  }

  return String(currentYear);
}

function contextToolbarRenderRoadmapYearContext(programId, items, state) {
  const scopeItems = contextToolbarRoadmapScopeItems(items, state);

  const years = contextToolbarRoadmapAvailableYears(
    programId,
    state?.productId,
    scopeItems,
    state,
  );

  const selectedYear = contextToolbarResolveRoadmapYear(
    programId,
    state?.productId,
    state?.quarter,
    scopeItems,
    state,
  );

  state.quarter = selectedYear;

  const currentContext = contextToolbarRoute();

  const isEmbeddedProductTimeline = currentContext.routeName === "product";

  const selectedProductId = String(state?.productId || "").trim();

  const selectedCountryId = String(selectedCountry || "").trim();

  const yearButtons =
    years.length > 1
      ? years
          .map((year) => {
            const active = String(year) === selectedYear;

            if (isEmbeddedProductTimeline) {
              return `
                <button
                  type="button"
                  class="
                    roadmap-year-button
                    ${active ? "active" : ""}
                  "
                  data-product-timeline-year="${contextToolbarEscape(
                    String(year),
                  )}"
                  data-product-id="${contextToolbarEscape(selectedProductId)}"
                  data-product-country="${contextToolbarEscape(
                    selectedCountryId,
                  )}"
                  aria-pressed="${active ? "true" : "false"}"
                >
                  ${year}
                </button>
              `;
            }

            const targetRoute =
              typeof roadmapWorkspaceRoute === "function"
                ? roadmapWorkspaceRoute(
                    programId,
                    "timeline",
                    state?.productId || "ALL",
                    String(year),
                    state?.ambitionId || null,
                    state?.capabilityId || null,
                    state?.countryId || selectedCountryId || null,
                  )
                : "";

            return `
              <button
                type="button"
                class="
                  roadmap-year-button
                  ${active ? "active" : ""}
                "
                data-route="${contextToolbarEscape(targetRoute)}"
                aria-pressed="${active ? "true" : "false"}"
              >
                ${year}
              </button>
            `;
          })
          .join("")
      : "";

  return `
    <header class="roadmap-year-context">
      <div class="roadmap-year-context-copy">
        <span>
          Periodo del cronograma
        </span>

        <strong>
          ${contextToolbarEscape(selectedYear)}
        </strong>
      </div>

      ${
        years.length > 1
          ? `
              <nav
                class="roadmap-year-selector"
                aria-label="
                  Seleccionar año del cronograma
                "
              >
                ${yearButtons}
              </nav>
            `
          : `
              <span
                class="roadmap-year-single"
              >
                ${
                  years.length === 1
                    ? "Único año con planificación"
                    : "Sin otros años planificados"
                }
              </span>
            `
      }
    </header>
  `;
}

if (typeof renderCountrySelector === "function") {
  renderCountrySelector = function renderCountrySelectorInSidebar() {
    return "";
  };
}

const contextToolbarBaseGetRoadmapPeriod =
  typeof getRoadmapPeriod === "function" ? getRoadmapPeriod : null;

if (contextToolbarBaseGetRoadmapPeriod) {
  getRoadmapPeriod = function getRoadmapPeriodWithYear(
    period,
    fallbackYear = new Date().getFullYear(),
  ) {
    const year = contextToolbarRoadmapYear(period);

    if (year) {
      return contextToolbarBaseGetRoadmapPeriod("ALL", Number(year));
    }

    return contextToolbarBaseGetRoadmapPeriod(period, fallbackYear);
  };
}

const contextToolbarBaseRoadmapItemMatchesPeriod =
  typeof roadmapItemMatchesPeriod === "function"
    ? roadmapItemMatchesPeriod
    : null;

if (contextToolbarBaseRoadmapItemMatchesPeriod) {
  roadmapItemMatchesPeriod = function roadmapItemMatchesYearOrLegacyPeriod(
    item,
    period,
    fallbackYear = new Date().getFullYear(),
  ) {
    const year = contextToolbarRoadmapYear(period);

    if (year) {
      return contextToolbarRoadmapItemMatchesYear(item, year);
    }

    return contextToolbarBaseRoadmapItemMatchesPeriod(
      item,
      period,
      fallbackYear,
    );
  };
}

const contextToolbarBaseRoadmapWorkspaceValidQuarter =
  typeof roadmapWorkspaceValidQuarter === "function"
    ? roadmapWorkspaceValidQuarter
    : null;

if (contextToolbarBaseRoadmapWorkspaceValidQuarter) {
  roadmapWorkspaceValidQuarter = function roadmapWorkspaceValidYearOrLegacy(
    value,
  ) {
    const year = contextToolbarRoadmapYear(value);

    if (year) {
      return year;
    }

    const legacyPeriod = String(value || "ALL")
      .trim()
      .toUpperCase();

    if (["Q1", "Q2", "Q3", "Q4"].includes(legacyPeriod)) {
      return String(new Date().getFullYear());
    }

    return legacyPeriod === "ALL" ? "ALL" : "ALL";
  };
}

const contextToolbarBaseRoadmapWorkspaceApplyRouteState =
  typeof roadmapWorkspaceApplyRouteState === "function"
    ? roadmapWorkspaceApplyRouteState
    : null;

if (contextToolbarBaseRoadmapWorkspaceApplyRouteState) {
  roadmapWorkspaceApplyRouteState =
    function roadmapWorkspaceApplyRouteStateWithYear(programId, routeContext) {
      const requestedView = String(
        routeContext?.viewName || "summary",
      ).toLowerCase();

      const adaptedContext = {
        ...(routeContext || {}),
        quarter:
          requestedView === "timeline" ? routeContext?.quarter || "ALL" : "ALL",
      };

      const state = contextToolbarBaseRoadmapWorkspaceApplyRouteState(
        programId,
        adaptedContext,
      );

      if (state.view === "timeline") {
        state.quarter = contextToolbarResolveRoadmapYear(
          programId,
          state.productId,
          state.quarter,
          null,
          state,
        );
      } else {
        state.quarter = "ALL";
      }

      return state;
    };
}

const contextToolbarBaseRoadmapWorkspaceRoute =
  typeof roadmapWorkspaceRoute === "function" ? roadmapWorkspaceRoute : null;

if (contextToolbarBaseRoadmapWorkspaceRoute) {
  roadmapWorkspaceRoute = function roadmapWorkspaceRouteWithYear(
    programId,
    view,
    productId,
    period,
    ...rest
  ) {
    const normalizedView = String(view || "summary").toLowerCase();

    const nextPeriod =
      normalizedView === "timeline"
        ? contextToolbarResolveRoadmapYear(programId, productId, period)
        : "ALL";

    return contextToolbarBaseRoadmapWorkspaceRoute(
      programId,
      view,
      productId,
      nextPeriod,
      ...rest,
    );
  };
}

const contextToolbarBaseRoadmapWorkspaceRenderTimeline =
  typeof roadmapWorkspaceRenderTimeline === "function"
    ? roadmapWorkspaceRenderTimeline
    : null;

if (contextToolbarBaseRoadmapWorkspaceRenderTimeline) {
  roadmapWorkspaceRenderTimeline =
    function roadmapWorkspaceRenderTimelineWithYear(programId, items, state) {
      const yearContext = contextToolbarRenderRoadmapYearContext(
        programId,
        items,
        state,
      );

      const baseMarkup = contextToolbarBaseRoadmapWorkspaceRenderTimeline(
        programId,
        items,
        state,
      );

      const timelineOpening =
        '<section class="roadmap-workspace-view roadmap-workspace-timeline-view">';

      if (!baseMarkup.includes(timelineOpening)) {
        return `${yearContext}${baseMarkup}`;
      }

      return baseMarkup.replace(
        timelineOpening,
        `${timelineOpening}${yearContext}`,
      );
    };
}

const contextToolbarBaseRenderCurrentRoute = renderCurrentRoute;

renderCurrentRoute = function renderRouteWithSidebarContext(...args) {
  const result = contextToolbarBaseRenderCurrentRoute(...args);

  requestAnimationFrame(() => {
    renderGlobalContextFilters();
    renderSidebarCountryNavigation();
  });

  return result;
};

window.addEventListener("hashchange", () => {
  requestAnimationFrame(() => {
    renderGlobalContextFilters();
    renderSidebarCountryNavigation();
  });
});

document.addEventListener(
  "click",
  (event) => {
    const countryButton = event.target.closest(
      "#sidebarCountryNavigation [data-country]",
    );

    if (!countryButton) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const countryId = contextToolbarNormalizeCountryId(
      countryButton.dataset.country,
    );

    if (!countryId) {
      return;
    }

    const context = contextToolbarRoute();

    const programId = String(context?.programId || "").trim();

    if (!programId) {
      return;
    }

    /*
     * Cambio de país =
     * reset completo de navegación.
     */
    selectedCountry = countryId;

    if (typeof roadmapWorkspaceState === "function") {
      const state = roadmapWorkspaceState(programId);

      state.view = "summary";

      state.productId = ROADMAP_WORKSPACE_ALL;

      state.quarter = ROADMAP_WORKSPACE_ALL;

      state.summaryMetric = "functional:all";

      if (Object.prototype.hasOwnProperty.call(state, "ambitionId")) {
        state.ambitionId = "ALL";
      }

      if (Object.prototype.hasOwnProperty.call(state, "capabilityId")) {
        state.capabilityId = "ALL";
      }

      if (Object.prototype.hasOwnProperty.call(state, "countryId")) {
        state.countryId = countryId;
      }
    }

    selectedCapability = null;

    selectedSystemComponent = null;

    selectedArchitectureGap = null;

    selectedExecutiveProduct = null;

    /*
     * Eliminamos contextos de retorno
     * creados durante navegación de producto.
     */
    sessionStorage.removeItem("productExperienceReturnRoute");

    const targetRoute = ["program", encodeURIComponent(programId)].join("/");

    const currentRoute = String(location.hash || "")
      .replace(/^#\/?/, "")
      .trim();

    /*
     * Aunque ya estemos en la ficha
     * del programa, hay que repintarla
     * porque selectedCountry ha cambiado.
     */
    if (currentRoute === targetRoute) {
      Promise.resolve(render()).catch(console.error);

      return;
    }

    route(targetRoute);
  },
  true,
);

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

      requestAnimationFrame(renderSidebarCountryNavigation);
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

requestAnimationFrame(() => {
  renderGlobalContextFilters();
  renderSidebarCountryNavigation();
});

contextToolbarLoadPortfolioUxPolish();
contextToolbarLoadNavigationUxFixes();
