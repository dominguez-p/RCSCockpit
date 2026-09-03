const ROADMAP_CONTEXT_HOLDING_ID = "HL";

/*
 * Guardamos las implementaciones base anteriores
 * a la capa visual de ambiciones.
 *
 * roadmap-ambitions-ui.js se carga antes que este
 * fichero, por lo que:
 *
 * - roadmapWorkspaceRenderSummary ya contiene
 *   trazabilidad estratégica.
 *
 * - roadmapAmbitionsBaseRenderSummary contiene
 *   el resumen operativo SIN trazabilidad.
 *
 * Queremos utilizar siempre el resumen operativo
 * base y pintar la trazabilidad al final.
 */
const roadmapContextAmbitionRenderSummary = roadmapWorkspaceRenderSummary;

/* =========================================================
 * ÁMBITO
 * ========================================================= */

function roadmapContextIsHolding() {
  return String(selectedCountry || "").trim() === ROADMAP_CONTEXT_HOLDING_ID;
}

function roadmapContextIsProductScope(state) {
  return Boolean(state?.productId && state.productId !== ROADMAP_WORKSPACE_ALL);
}

function roadmapContextProgramName(program, programId) {
  return program?.name || programId || "Programa";
}

function roadmapContextProductName(state) {
  return roadmapWorkspaceProductLabel(state?.productId);
}

function roadmapContextCountryLabel() {
  return roadmapWorkspaceCountryLabel();
}

function roadmapContextGeographyLabel() {
  return roadmapContextIsHolding()
    ? "Todas las geografías"
    : roadmapContextCountryLabel();
}

function roadmapContextViewLabel(view) {
  const labels = {
    summary: "Resumen",
    timeline: "Cronograma",
    backlog: "Backlog",
  };

  return labels[String(view || "").trim()] || "Roadmap";
}

/* =========================================================
 * HOLDING = CONSOLIDACIÓN DE TODAS LAS GEOGRAFÍAS
 * ========================================================= */

roadmapWorkspaceItemsForProgram =
  function roadmapWorkspaceItemsForProgramWithGlobalHolding(programId) {
    const normalizedProgramId = String(programId || "").trim();

    const isHolding = roadmapContextIsHolding();

    return roadmapWorkspaceAllItems().filter((item) => {
      const matchesProgram =
        String(item.programId || "").trim() === normalizedProgramId;

      if (!matchesProgram) {
        return false;
      }

      /*
       * Holding representa el agregado
       * de todas las geografías.
       */
      if (isHolding) {
        return true;
      }

      /*
       * Un país incorpora:
       *
       * - elementos específicos del país;
       * - elementos sin país explícito.
       */
      const itemCountry = String(item.country || "").trim();

      return !itemCountry || itemCountry === selectedCountry;
    });
  };

/* =========================================================
 * COPY SEGÚN ÁMBITO
 * ========================================================= */

function roadmapContextWorkspaceCopy(program, programId, state) {
  const programName = roadmapContextProgramName(program, programId);

  const productScope = roadmapContextIsProductScope(state);

  const productName = roadmapContextProductName(state);

  const holding = roadmapContextIsHolding();

  const countryLabel = roadmapContextCountryLabel();

  const geographyLabel = roadmapContextGeographyLabel();

  const viewLabel = roadmapContextViewLabel(state.view);

  /*
   * =======================================================
   * ROADMAP DE PRODUCTO
   * =======================================================
   */
  if (productScope) {
    return {
      scopeClass: "is-product-scope",

      pageTitle: `${productName} · Roadmap`,

      pageSubtitle: `${viewLabel} · ${geographyLabel}`,

      breadcrumb: [
        "Retail Client Solutions",
        programName,
        holding ? "Holding" : countryLabel,
        productName,
        "Roadmap",
        viewLabel,
      ].join(" > "),

      heroEyebrow: "Roadmap de producto",

      heroTitle: holding
        ? `Roadmap global de ${productName}`
        : `Roadmap de ${productName}`,

      heroDescription: holding
        ? `Ejecución consolidada de ${productName} en todas las geografías.`
        : `Ejecución de ${productName} en ${countryLabel}.`,

      backLabel: holding
        ? `← Volver a ${programName} · Holding`
        : `← Volver a ${programName} · ${countryLabel}`,

      detailBackLabel: `Volver al roadmap de ${productName}`,
    };
  }

  /*
   * =======================================================
   * ROADMAP DEL PROGRAMA
   * =======================================================
   */

  return {
    scopeClass: "is-program-scope",

    pageTitle: `${programName} · Roadmap`,

    pageSubtitle: `${viewLabel} · Todos los productos · ${geographyLabel}`,

    breadcrumb: [
      "Retail Client Solutions",
      programName,
      holding ? "Holding" : countryLabel,
      "Roadmap",
      "Todos los productos",
      viewLabel,
    ].join(" > "),

    heroEyebrow: "Roadmap del programa",

    heroTitle: holding
      ? `Roadmap global de ${programName}`
      : `Roadmap de ${programName} · ${countryLabel}`,

    heroDescription: holding
      ? `Visión consolidada de la ejecución de todos los productos y geografías de ${programName}.`
      : `Visión conjunta de la ejecución de todos los productos de ${programName} en ${countryLabel}.`,

    backLabel: holding
      ? `← Volver a ${programName} · Holding`
      : `← Volver a ${programName} · ${countryLabel}`,

    detailBackLabel: `Volver al roadmap de ${programName}`,
  };
}

/* =========================================================
 * KPIs DEL HERO
 * ========================================================= */

function roadmapContextScopeItems(items, state) {
  return roadmapAmbitionScopeItems(
    items,
    {
      ...state,

      quarter: ROADMAP_WORKSPACE_ALL,

      ambitionId: ROADMAP_AMBITION_ALL,
    },
    {
      applyPeriod: false,
    },
  );
}

/* =========================================================
 * SELECTOR COMPACTO DE PRODUCTO
 * ========================================================= */

function roadmapContextRenderProductSelector(programId, items, state) {
  const products = roadmapWorkspaceProducts(items);

  const productScope = roadmapContextIsProductScope(state);

  const selectedLabel = productScope
    ? roadmapContextProductName(state)
    : "Todos los productos";

  return `
    <section
      class="
        roadmap-context-product-filter
      "
      aria-label="
        Ámbito de producto
      "
    >
      <div
        class="
          roadmap-context-product-filter-copy
        "
      >
        <span>
          Ámbito
        </span>

        <strong>
          ${roadmapWorkspaceEscape(selectedLabel)}
        </strong>
      </div>

      <label
        class="
          roadmap-context-product-filter-control
        "
      >
        <span>
          Producto
        </span>

        <select
          data-roadmap-workspace-product="${roadmapWorkspaceEscape(programId)}"
        >
          <option
            value="${ROADMAP_WORKSPACE_ALL}"
            ${state.productId === ROADMAP_WORKSPACE_ALL ? "selected" : ""}
          >
            Todos los productos
          </option>

          ${products
            .map(
              (product) => `
                <option
                  value="${roadmapWorkspaceEscape(product.id)}"
                  ${state.productId === product.id ? "selected" : ""}
                >
                  ${roadmapWorkspaceEscape(product.label)}
                </option>
              `,
            )
            .join("")}
        </select>
      </label>
    </section>
  `;
}

/* =========================================================
 * OPCIONES DE AMBICIÓN
 * ========================================================= */

function roadmapContextAmbitionOptions(selectedAmbition) {
  return ROADMAP_RCS_AMBITIONS.map(
    (ambition) => `
      <option
        value="${roadmapWorkspaceEscape(ambition.id)}"
        ${selectedAmbition === ambition.id ? "selected" : ""}
      >
        ${roadmapWorkspaceEscape(
          `${String(ambition.order).padStart(2, "0")} · ${ambition.title}`,
        )}
      </option>
    `,
  ).join("");
}

/* =========================================================
 * TRAZABILIDAD ESTRATÉGICA
 *
 * SIEMPRE:
 *
 * - abajo del roadmap;
 * - cerrada por defecto;
 * - Holding y país con el mismo patrón.
 * ========================================================= */

function roadmapContextRenderStrategicDisclosure(programId, items, state) {
  const scopeItems = roadmapAmbitionScopeItems(items, state, {
    applyPeriod: state.view !== "backlog",
  });

  const coverage = roadmapAmbitionCoverage(scopeItems);

  const selectedAmbition = roadmapAmbitionValidFilter(
    state.ambitionId || ROADMAP_AMBITION_ALL,
  );

  /*
   * Si existe un filtro estratégico activo
   * mantenemos abierto el disclosure para que
   * el usuario entienda por qué los datos están
   * filtrados.
   *
   * En condiciones normales empieza cerrado.
   */
  const keepOpen = selectedAmbition !== ROADMAP_AMBITION_ALL;

  const isHolding = roadmapContextIsHolding();

  const geographyLabel = roadmapContextGeographyLabel();

  const productScope = roadmapContextIsProductScope(state);

  const scopeLabel = productScope
    ? roadmapContextProductName(state)
    : "todos los productos";

  const description = isHolding
    ? `Cómo la ejecución de ${scopeLabel} contribuye al marco estratégico de RCS en el conjunto de geografías.`
    : `Cómo la ejecución de ${scopeLabel} en ${geographyLabel} contribuye al marco estratégico de RCS.`;

  return `
    <section
      class="
        roadmap-context-strategy
      "
      aria-label="
        Trazabilidad estratégica
      "
    >
      <details
        class="
          roadmap-context-strategy-disclosure
        "
        ${keepOpen ? "open" : ""}
      >
        <summary
          class="
            roadmap-context-strategy-summary
          "
        >
          <span
            class="
              roadmap-context-strategy-copy
            "
          >
            <span
              class="
                roadmap-context-strategy-eyebrow
              "
            >
              Trazabilidad estratégica
            </span>

            <span
              class="
                roadmap-context-strategy-title
              "
            >
              Contribución a las ambiciones RCS
            </span>

            <span
              class="
                roadmap-context-strategy-description
              "
            >
              ${roadmapWorkspaceEscape(description)}
            </span>
          </span>

          <span
            class="
              roadmap-context-strategy-kpis
            "
            aria-label="
              Resumen de trazabilidad
            "
          >
            <span>
              <strong>
                ${coverage.percentage}%
              </strong>

              <small>
                Cobertura
              </small>
            </span>

            <span>
              <strong>
                ${coverage.linked}
              </strong>

              <small>
                Con ambición
              </small>
            </span>

            <span>
              <strong>
                ${coverage.unassigned}
              </strong>

              <small>
                Sin asignar
              </small>
            </span>
          </span>

          <span
            class="
              roadmap-context-strategy-action
            "
          >
            <span
              class="
                roadmap-context-strategy-toggle-closed
              "
            >
              Ver trazabilidad estratégica
            </span>

            <span
              class="
                roadmap-context-strategy-toggle-open
              "
            >
              Ocultar trazabilidad estratégica
            </span>

            <span
              class="
                roadmap-context-strategy-chevron
              "
              aria-hidden="true"
            >
              ⌄
            </span>
          </span>
        </summary>

        <div
          class="
            roadmap-context-strategy-content
          "
        >
          <header
            class="
              roadmap-context-strategy-content-header
            "
          >
            <div>
              <span>
                Detalle estratégico
              </span>

              <h3>
                Ambiciones RCS
              </h3>

              <p>
                Selecciona una ambición para
                filtrar el resumen, el cronograma
                y el backlog.
              </p>
            </div>

            <label
              class="
                roadmap-workspace-filter-group
                roadmap-ambition-filter-group
                roadmap-context-strategy-filter
              "
            >
              <span>
                Ambición RCS
              </span>

              <select
                data-roadmap-ambition-filter="${roadmapWorkspaceEscape(
                  programId,
                )}"
              >
                <option
                  value="${ROADMAP_AMBITION_ALL}"
                  ${selectedAmbition === ROADMAP_AMBITION_ALL ? "selected" : ""}
                >
                  Todas las ambiciones
                </option>

                ${roadmapContextAmbitionOptions(selectedAmbition)}

                <option
                  value="${ROADMAP_AMBITION_UNASSIGNED}"
                  ${
                    selectedAmbition === ROADMAP_AMBITION_UNASSIGNED
                      ? "selected"
                      : ""
                  }
                >
                  Sin ambición asignada
                </option>
              </select>
            </label>
          </header>

          <div
            class="
              roadmap-ambition-coverage-grid
            "
          >
            ${ROADMAP_RCS_AMBITIONS.map((ambition) =>
              roadmapAmbitionRenderCoverageButton(
                programId,
                state,
                ambition.id,
                ambition.title,
                coverage.byAmbition.get(ambition.id) || 0,
                {
                  order: ambition.order,
                },
              ),
            ).join("")}

            ${roadmapAmbitionRenderCoverageButton(
              programId,
              state,
              ROADMAP_AMBITION_UNASSIGNED,
              "Sin ambición asignada",
              coverage.unassigned,
              {
                unassigned: true,
              },
            )}
          </div>

          <p
            class="
              roadmap-ambition-active-filter
            "
          >
            Filtro activo:

            <strong>
              ${roadmapWorkspaceEscape(
                roadmapAmbitionFilterLabel(state.ambitionId),
              )}
            </strong>
          </p>
        </div>
      </details>
    </section>
  `;
}

/* =========================================================
 * CONTENIDO
 * ========================================================= */

function roadmapContextRenderContent(programId, items, state) {
  if (state.view === "timeline") {
    return roadmapWorkspaceRenderTimeline(programId, items, state);
  }

  if (state.view === "backlog") {
    return roadmapWorkspaceRenderBacklog(programId, items, state);
  }

  /*
   * Muy importante:
   *
   * utilizamos SIEMPRE el resumen base.
   *
   * La trazabilidad estratégica se pintará
   * después de todo el contenido,
   * independientemente de Holding o país.
   */
  return roadmapAmbitionsBaseRenderSummary(programId, items, state);
}

/* =========================================================
 * WORKSPACE
 * ========================================================= */

renderRoadmapWorkspace = function renderRoadmapWorkspaceWithContext(
  programId,
  routeContext = roadmapWorkspaceParseRoute(),
) {
  const program = roadmapWorkspaceGetProgram(programId);

  if (!program) {
    renderLanding();
    return;
  }

  const state = roadmapWorkspaceApplyRouteState(programId, routeContext);

  const items = roadmapWorkspaceItemsForProgram(programId);

  const copy = roadmapContextWorkspaceCopy(program, programId, state);

  const scopeItems = roadmapContextScopeItems(items, state);

  setHead(copy.pageTitle, copy.pageSubtitle, copy.breadcrumb);

  const content = roadmapContextRenderContent(programId, items, state);

  const productSelector = roadmapContextRenderProductSelector(
    programId,
    items,
    state,
  );

  /*
   * La trazabilidad se incluye SIEMPRE
   * después del contenido operativo.
   */
  const strategicDisclosure = roadmapContextRenderStrategicDisclosure(
    programId,
    items,
    state,
  );

  view.innerHTML = `
      <section
        class="
          roadmap-workspace
          ${copy.scopeClass}
        "
      >
        <button
          class="
            ghost-button
          "
          type="button"
          data-route="program/${roadmapWorkspaceEscape(programId)}"
        >
          ${roadmapWorkspaceEscape(copy.backLabel)}
        </button>

        <header
          class="
            roadmap-workspace-hero
          "
        >
          <div>
            <span>
              ${roadmapWorkspaceEscape(copy.heroEyebrow)}
            </span>

            <h2>
              ${roadmapWorkspaceEscape(copy.heroTitle)}
            </h2>

            <p>
              ${roadmapWorkspaceEscape(copy.heroDescription)}
            </p>
          </div>

          <aside>
            <strong>
              ${scopeItems.length}
            </strong>

            <span>
              elementos totales
            </span>

            <strong>
              ${scopeItems.filter(roadmapWorkspaceHasPlanning).length}
            </strong>

            <span>
              planificados
            </span>
          </aside>
        </header>

        <div
          class="
            roadmap-context-navigation-row
          "
        >
          ${roadmapWorkspaceRenderTabs(programId, state)}

          ${productSelector}
        </div>

        ${content}

        ${strategicDisclosure}
      </section>
    `;
};

/* =========================================================
 * DETALLE
 * ========================================================= */

renderRoadmapWorkspaceDetail = function renderRoadmapWorkspaceDetailWithContext(
  routeContext,
) {
  const program = roadmapWorkspaceGetProgram(routeContext.programId);

  const state = roadmapWorkspaceState(routeContext.programId);

  state.view = ROADMAP_WORKSPACE_VIEWS.has(routeContext.viewName)
    ? routeContext.viewName
    : "summary";

  state.productId = roadmapWorkspaceNormalizeProduct(routeContext.productId);

  state.quarter = roadmapWorkspaceValidQuarter(routeContext.quarter);

  state.ambitionId = roadmapAmbitionValidFilter(
    routeContext.ambitionId || state.ambitionId || ROADMAP_AMBITION_ALL,
  );

  const item = roadmapWorkspaceFindItem(
    routeContext.programId,
    routeContext.itemType,
    routeContext.itemId,
  );

  const backRoute = roadmapWorkspaceRoute(
    routeContext.programId,
    state.view,
    state.productId,
    state.quarter,
    state.ambitionId,
  );

  if (!program || !item) {
    route(backRoute);
    return;
  }

  const copy = roadmapContextWorkspaceCopy(
    program,
    routeContext.programId,
    state,
  );

  const programName = roadmapContextProgramName(
    program,
    routeContext.programId,
  );

  const productScope = roadmapContextIsProductScope(state);

  const productName = roadmapContextProductName(state);

  const countryLabel = roadmapContextCountryLabel();

  const breadcrumbParts = [
    "Retail Client Solutions",
    programName,
    roadmapContextIsHolding() ? "Holding" : countryLabel,
  ];

  if (productScope) {
    breadcrumbParts.push(productName);
  }

  breadcrumbParts.push("Roadmap", item.title);

  setHead(
    item.title,

    [
      item.typeLabel || item.type,
      productScope ? productName : programName,
      roadmapContextGeographyLabel(),
    ].join(" · "),

    breadcrumbParts.join(" > "),
  );

  renderRoadmapItemDetailView(item, {
    route: backRoute,

    label: copy.detailBackLabel,

    activityRouteBase: roadmapWorkspaceActivityRouteBase(
      routeContext.programId,
      state,
      item,
    ),
  });
};

/* =========================================================
 * ACTIVIDAD
 * ========================================================= */

renderRoadmapWorkspaceActivity =
  function renderRoadmapWorkspaceActivityWithContext(routeContext) {
    const program = roadmapWorkspaceGetProgram(routeContext.programId);

    const state = roadmapWorkspaceState(routeContext.programId);

    state.view = ROADMAP_WORKSPACE_VIEWS.has(routeContext.viewName)
      ? routeContext.viewName
      : "summary";

    state.productId = roadmapWorkspaceNormalizeProduct(routeContext.productId);

    state.quarter = roadmapWorkspaceValidQuarter(routeContext.quarter);

    state.ambitionId = roadmapAmbitionValidFilter(
      routeContext.ambitionId || state.ambitionId || ROADMAP_AMBITION_ALL,
    );

    const item = roadmapWorkspaceFindItem(
      routeContext.programId,
      routeContext.itemType,
      routeContext.itemId,
    );

    const activityId = routeContext.extraActivityId || routeContext.activityId;

    const groupedActivities = item
      ? groupRoadmapItemActivities(item.activities || item.phases || [])
      : [];

    const activity = groupedActivities.find(
      (candidate) =>
        String(candidate.activityId || "").trim() ===
        String(activityId || "").trim(),
    );

    const detailRoute = roadmapWorkspaceDetailRoute(
      routeContext.programId,
      state,
      item || {
        type: routeContext.itemType,

        id: routeContext.itemId,
      },
    );

    if (!program || !item || !activity) {
      route(detailRoute);
      return;
    }

    const programName = roadmapContextProgramName(
      program,
      routeContext.programId,
    );

    const productScope = roadmapContextIsProductScope(state);

    const productName = roadmapContextProductName(state);

    const countryLabel = roadmapContextCountryLabel();

    const breadcrumbParts = [
      "Retail Client Solutions",
      programName,
      roadmapContextIsHolding() ? "Holding" : countryLabel,
    ];

    if (productScope) {
      breadcrumbParts.push(productName);
    }

    breadcrumbParts.push("Roadmap", item.title, activity.activityName);

    setHead(
      activity.activityName,

      [
        item.title,
        productScope ? productName : programName,
        roadmapContextGeographyLabel(),
      ].join(" · "),

      breadcrumbParts.join(" > "),
    );

    renderRoadmapActivityTasksView(item, activity, {
      route: detailRoute,

      label: `Volver a ${item.title}`,
    });
  };
function installProductPlanComparison() {
  if (window.__productPlanComparisonInstalled) {
    return;
  }

  window.__productPlanComparisonInstalled = true;

  const PROGRAM_ID = "aixbanker";

  const HOLDING_ID = "HL";

  const ALL_ID = "ALL";

  const MONTH_LABELS = [
    "ENE",
    "FEB",
    "MAR",
    "ABR",
    "MAY",
    "JUN",
    "JUL",
    "AGO",
    "SEP",
    "OCT",
    "NOV",
    "DIC",
  ];

  const comparisonStates = new Map();

  const loadedFeaturePrograms = new Set();

  const baseRenderRoadmapWorkspace =
    typeof renderRoadmapWorkspace === "function"
      ? renderRoadmapWorkspace
      : null;

  function escapeHtml(value) {
    if (typeof roadmapWorkspaceEscape === "function") {
      return roadmapWorkspaceEscape(value);
    }

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

  function normalizeProduct(value) {
    if (typeof roadmapWorkspaceNormalizeProduct === "function") {
      return roadmapWorkspaceNormalizeProduct(value);
    }

    return String(value || "")
      .trim()
      .toLowerCase()
      .replaceAll("_", "-")
      .replace(/\s+/g, "-");
  }

  function productLabel(productId) {
    if (typeof roadmapWorkspaceProductLabel === "function") {
      return roadmapWorkspaceProductLabel(productId);
    }

    if (typeof getAIxBankerProduct === "function") {
      const product = getAIxBankerProduct(productId);

      if (product?.label) {
        return product.label;
      }
    }

    return String(productId || "")
      .split("-")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function availableCountries() {
    return Array.isArray(COUNTRIES) ? COUNTRIES : [];
  }

  function localCountries() {
    /*
     * En el comparador, Holding es una geografía
     * seleccionable igual que cualquier país.
     *
     * El nombre histórico de esta función se mantiene
     * para no modificar el resto del bloque.
     */
    return availableCountries().filter((country) => {
      const countryId = String(country?.id || "")
        .trim()
        .toUpperCase();

      return Boolean(countryId);
    });
  }

  function localCountryIds() {
    return localCountries()
      .map((country) =>
        String(country?.id || "")
          .trim()
          .toUpperCase(),
      )
      .filter(Boolean);
  }

  function countryMeta(countryId) {
    const normalized = String(countryId || "")
      .trim()
      .toUpperCase();

    return (
      availableCountries().find(
        (country) =>
          String(country?.id || "")
            .trim()
            .toUpperCase() === normalized,
      ) || {
        id: normalized,
        label: normalized === HOLDING_ID ? "Holding" : normalized,
        flagSrc: "",
      }
    );
  }
  function productPlanFoldCountryText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function normalizeCountry(value) {
    const raw = String(value || "").trim();

    if (!raw) {
      return "";
    }

    const folded = productPlanFoldCountryText(raw);

    const compact = folded.replace(/\s+/g, "");

    /*
     * Primero resolvemos IDs y aliases
     * conocidos del Cockpit/SDA.
     */
    const aliases = {
      HL: HOLDING_ID,
      HOLDING: HOLDING_ID,
      HOLDINGRCS: HOLDING_ID,
      GLOBAL: HOLDING_ID,
      GLOBALRCS: HOLDING_ID,
      CENTRAL: HOLDING_ID,

      ES: "ES",
      ESP: "ES",
      ESPANA: "ES",
      SPAIN: "ES",

      MX: "MX",
      MEX: "MX",
      MEXICO: "MX",

      PE: "PE",
      PER: "PE",
      PERU: "PE",

      CO: "CO",
      COL: "CO",
      COLOMBIA: "CO",
    };

    if (aliases[compact]) {
      return aliases[compact];
    }

    /*
     * Después contrastamos contra la configuración
     * real de COUNTRIES.
     *
     * Esto permite que el código continúe funcionando
     * aunque cambie el texto visible de un país.
     */
    const configuredCountry = availableCountries().find((country) => {
      const countryId = String(country?.id || "")
        .trim()
        .toUpperCase();

      const countryLabel = productPlanFoldCountryText(country?.label || "");

      return (
        countryId === folded || countryId === compact || countryLabel === folded
      );
    });

    if (configuredCountry) {
      return String(configuredCountry.id || "")
        .trim()
        .toUpperCase();
    }

    return "";
  }

  function parseCountries(value) {
    const rawValues = Array.isArray(value) ? value : [value];

    const hasSourceValue = rawValues.some((entry) =>
      String(entry || "").trim(),
    );

    /*
     * Si SDA no informa beneficiaryCountries,
     * consideramos el deliverable de Holding.
     */
    if (!hasSourceValue) {
      return [HOLDING_ID];
    }

    const countries = new Set();

    rawValues.forEach((entry) => {
      const source = String(entry || "").trim();

      if (!source) {
        return;
      }

      /*
       * Primero intentamos interpretar
       * el valor completo.
       */
      const direct = normalizeCountry(source);

      if (direct) {
        countries.add(direct);

        return;
      }

      /*
       * SDA puede devolver combinaciones como:
       *
       * España | México
       * España, México
       * España / México
       * España + México
       * España & México
       */
      const pieces = source
        .split(/[|,;\n/]+|\s+\+\s+|\s+&\s+/)
        .map((part) => String(part || "").trim())
        .filter(Boolean);

      pieces.forEach((piece) => {
        const normalizedPiece = normalizeCountry(piece);

        if (normalizedPiece) {
          countries.add(normalizedPiece);

          return;
        }

        /*
         * Fallback para textos OCR que llegan
         * sin separadores claros, por ejemplo:
         *
         * "Holding RCS España México"
         * "ES MX"
         */
        const tokens = productPlanFoldCountryText(piece)
          .split(/\s+/)
          .filter(Boolean);

        tokens.forEach((token) => {
          const normalizedToken = normalizeCountry(token);

          if (normalizedToken) {
            countries.add(normalizedToken);
          }
        });

        /*
         * También buscamos nombres completos
         * dentro del texto.
         */
        const foldedPiece = ` ${productPlanFoldCountryText(piece)} `;

        const searchTerms = [
          {
            id: HOLDING_ID,
            terms: ["HOLDING", "GLOBAL"],
          },
          {
            id: "ES",
            terms: ["ESPANA", "SPAIN"],
          },
          {
            id: "MX",
            terms: ["MEXICO"],
          },
          {
            id: "PE",
            terms: ["PERU"],
          },
          {
            id: "CO",
            terms: ["COLOMBIA"],
          },
        ];

        searchTerms.forEach(({ id, terms }) => {
          const matched = terms.some((term) =>
            foldedPiece.includes(` ${term} `),
          );

          if (matched) {
            countries.add(id);
          }
        });
      });
    });

    /*
     * Importante:
     *
     * si el origen tiene contenido pero no hemos
     * podido reconocer ninguna geografía,
     * NO lo convertimos a Holding.
     *
     * Antes ese comportamiento provocaba falsos
     * elementos globales.
     */
    if (!countries.size) {
      console.warn(
        "[AIxBanker] beneficiaryCountries SDA no reconocido:",
        value,
      );

      return [];
    }

    return [...countries];
  }

  function parseDate(value) {
    if (!value) {
      return null;
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    if (typeof parseValidDate === "function") {
      const parsed = parseValidDate(value);

      if (parsed) {
        return parsed;
      }
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  function parseQuarterDate(value, fallbackYear, useEndOfQuarter = false) {
    const text = String(value || "")
      .trim()
      .toUpperCase();

    if (!text) {
      return null;
    }

    let quarter = null;

    let year = null;

    let match = text.match(/\bQ([1-4])\s*(20\d{2})\b/i);

    if (match) {
      quarter = Number(match[1]);

      year = Number(match[2]);
    }

    if (!match) {
      match = text.match(/\b(20\d{2})\s*Q([1-4])\b/i);

      if (match) {
        year = Number(match[1]);

        quarter = Number(match[2]);
      }
    }

    if (!match) {
      match = text.match(/\b([1-4])Q\s*(20\d{2})?\b/i);

      if (match) {
        quarter = Number(match[1]);

        year = match[2] ? Number(match[2]) : Number(fallbackYear);
      }
    }

    if (!Number.isFinite(quarter) || quarter < 1 || quarter > 4) {
      return null;
    }

    if (!Number.isFinite(year)) {
      year = Number(fallbackYear);
    }

    if (!Number.isFinite(year)) {
      return null;
    }

    if (useEndOfQuarter) {
      return new Date(year, quarter * 3, 0);
    }

    return new Date(year, (quarter - 1) * 3, 1);
  }

  function addOneDay(date) {
    if (!date) {
      return null;
    }

    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  }

  function comparisonStateKey(programId, productId) {
    return [String(programId || "").trim(), normalizeProduct(productId)].join(
      "::",
    );
  }

  function comparisonState(programId, productId) {
    const key = comparisonStateKey(programId, productId);

    if (!comparisonStates.has(key)) {
      comparisonStates.set(key, {
        sources: {
          sda: true,
          msa: true,
          features: false,
        },

        /*
         * Holding comienza mostrando:
         *
         * - Holding
         * - España
         * - México
         * - Perú
         * - Colombia
         *
         * Todos son después activables/
         * desactivables individualmente.
         */
        holdingCountries: new Set(localCountryIds()),

        featuresLoading: false,

        featuresLoadError: false,
      });
    }

    return comparisonStates.get(key);
  }

  function rowMatchesGeography(rowCountries, state) {
    const countries = Array.isArray(rowCountries)
      ? rowCountries
          .map((countryId) => normalizeCountry(countryId))
          .filter(Boolean)
      : [];

    if (!countries.length) {
      return false;
    }

    const activeCountry = normalizeCountry(selectedCountry) || HOLDING_ID;

    /*
     * =====================================================
     * PAÍS CONCRETO
     * =====================================================
     *
     * España sólo muestra España.
     * México sólo muestra México.
     * Perú sólo muestra Perú.
     * Colombia sólo muestra Colombia.
     *
     * Holding NO se incorpora automáticamente.
     */
    if (activeCountry !== HOLDING_ID) {
      return countries.includes(activeCountry);
    }

    /*
     * =====================================================
     * HOLDING
     * =====================================================
     *
     * Cada geografía participa únicamente si está
     * activada en el selector.
     *
     * Holding es ahora una opción explícita.
     */
    return countries.some((countryId) => state.holdingCountries.has(countryId));
  }

  function rangeOverlapsYear(startDate, endDate, year) {
    if (!startDate || !endDate) {
      return false;
    }

    const startOfYear = new Date(year, 0, 1);

    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    return startDate <= endOfYear && endDate >= startOfYear;
  }
  function productPlanSdaStatus(row) {
    const rawKey = String(row?.statusKey || "")
      .trim()
      .toLowerCase();

    const rawLabel = String(row?.status || "").trim();

    const officialStatuses = {
      "no-iniciado": "No Iniciado",
      "en-curso": "En Curso",
      bloqueado: "Bloqueado",
      cancelado: "Cancelado",
      finalizado: "Finalizado",
    };

    if (Object.prototype.hasOwnProperty.call(officialStatuses, rawKey)) {
      return {
        key: rawKey,
        label: rawLabel || officialStatuses[rawKey],
      };
    }

    const normalized = rawLabel
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

    if (
      normalized === "no iniciado" ||
      normalized === "no iniciada" ||
      normalized === "not started"
    ) {
      return {
        key: "no-iniciado",
        label: "No Iniciado",
      };
    }

    if (
      normalized === "en curso" ||
      normalized === "en progreso" ||
      normalized === "in progress"
    ) {
      return {
        key: "en-curso",
        label: "En Curso",
      };
    }

    if (
      normalized === "bloqueado" ||
      normalized === "bloqueada" ||
      normalized === "blocked"
    ) {
      return {
        key: "bloqueado",
        label: "Bloqueado",
      };
    }

    if (
      normalized === "cancelado" ||
      normalized === "cancelada" ||
      normalized === "cancelled" ||
      normalized === "canceled"
    ) {
      return {
        key: "cancelado",
        label: "Cancelado",
      };
    }

    if (
      normalized === "finalizado" ||
      normalized === "finalizada" ||
      normalized === "completed" ||
      normalized === "finalized"
    ) {
      return {
        key: "finalizado",
        label: "Finalizado",
      };
    }

    return {
      key: "sin-estado",
      label: rawLabel || "Sin estado",
    };
  }

  function productPlanSdaStatusPalette(statusKey) {
    /*
     * Paleta basada en los estados visuales
     * de SDA Suite.
     *
     * No mezclamos aquí las alertas:
     *
     * - Replanificado
     * - Retrasado
     *
     * porque son una dimensión independiente.
     */
    const palettes = {
      "no-iniciado": {
        bar: "#B8B8B8",
        background: "#F2F2F2",
        text: "#8A8A8A",
        border: "#D5D5D5",
      },

      "en-curso": {
        bar: "#49B5E7",
        background: "#E4F4FC",
        text: "#1479B8",
        border: "#B8E2F6",
      },

      bloqueado: {
        bar: "#C72C48",
        background: "#FBE8EC",
        text: "#B2223D",
        border: "#EFBBC5",
      },

      cancelado: {
        bar: "#414343",
        background: "#414343",
        text: "#FFFFFF",
        border: "#414343",
      },

      finalizado: {
        bar: "#348A36",
        background: "#E8F5E8",
        text: "#2C7A2F",
        border: "#C8E6C9",
      },

      "sin-estado": {
        bar: "#8795AA",
        background: "#EEF2F6",
        text: "#65748A",
        border: "#D9E0E8",
      },

      otro: {
        bar: "#8795AA",
        background: "#EEF2F6",
        text: "#65748A",
        border: "#D9E0E8",
      },
    };

    return (
      palettes[
        String(statusKey || "")
          .trim()
          .toLowerCase()
      ] || palettes["sin-estado"]
    );
  }
  function collectSdaRows(programId, productId) {
    const rows = Array.isArray(DATA?.sdaDeliverables)
      ? DATA.sdaDeliverables
      : [];

    return rows
      .filter(
        (row) =>
          String(row.programId || "").trim() ===
            String(programId || "").trim() &&
          normalizeProduct(row.productId || row.product) === productId,
      )
      .map((row, index) => {
        const year = Number(row.year) || new Date().getFullYear();

        let startDate = parseQuarterDate(row.startQuarter, year, false);

        let endDate = parseQuarterDate(row.endQuarter, year, true);

        if (!startDate && endDate) {
          startDate = parseQuarterDate(row.endQuarter, year, false);
        }

        if (startDate && !endDate) {
          endDate = parseQuarterDate(row.startQuarter, year, true);
        }

        const status = productPlanSdaStatus(row);

        return {
          id: `sda-${row.sdaCode || "SDA"}-` + `${row.deliverableId || index}`,

          sourceType: "sda",

          sourceLabel: "SDA",

          sourceKey:
            [row.sdaCode, row.deliverableId ? `D${row.deliverableId}` : ""]
              .filter(Boolean)
              .join(" · ") || "SDA",

          title:
            String(row.name || "").trim() ||
            `Deliverable ${row.deliverableId || index + 1}`,

          subtitle: String(
            row.goal || row.description || row.deliverableType || "",
          ).trim(),

          startDate,

          endDate,

          countries: parseCountries(row.beneficiaryCountries),

          statusKey: status.key,

          statusLabel: status.label,

          year,

          raw: row,
        };
      })
      .filter((row) => row.startDate && row.endDate);
  }

  function collectMsaRows(programId, productId) {
    const items =
      typeof roadmapWorkspaceAllItems === "function"
        ? roadmapWorkspaceAllItems()
        : [];

    const today = new Date();

    return items
      .filter(
        (item) =>
          String(item.programId || "").trim() ===
            String(programId || "").trim() &&
          normalizeProduct(item.product) === productId &&
          String(item.type || "")
            .trim()
            .toLowerCase() === "msa",
      )
      .map((item) => {
        const startDate = parseDate(item.startDate);

        let endDate = parseDate(
          item.endDate || item.targetDate || item.nextMilestoneDate,
        );

        /*
         * Los MSAs abiertos que ya han
         * comenzado llegan hasta hoy.
         *
         * Normalmente app.js ya viene
         * con este dato enriquecido desde
         * jiraMsaIndex, pero mantenemos
         * este fallback defensivo.
         */
        if (startDate && !endDate && startDate <= today) {
          endDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
          );
        }

        return {
          id: `msa-${item.id || item.jiraKey || item.title}`,

          sourceType: "msa",

          sourceLabel: "JIRA · MSA",

          sourceKey: String(item.jiraKey || item.id || "MSA").trim(),

          title: String(
            item.title || item.name || item.initiative || "MSA",
          ).trim(),

          subtitle: String(
            item.jiraCurrentStatus ||
              item.jiraMetrics?.currentStatus ||
              item.status ||
              "",
          ).trim(),

          startDate,

          endDate,

          countries: parseCountries(item.country),

          raw: item,
        };
      })
      .filter((row) => row.startDate && row.endDate);
  }

  function collectFeatureRows(programId, productId) {
    const items =
      typeof roadmapWorkspaceJiraFeatureItems === "function"
        ? roadmapWorkspaceJiraFeatureItems(programId)
        : [];

    return items
      .filter((item) => normalizeProduct(item.product) === productId)
      .map((item) => ({
        id: `feature-${item.id || item.jiraKey || item.title}`,

        sourceType: "features",

        sourceLabel: "JIRA · Feature",

        sourceKey: String(
          item.jiraKey || item.key || item.id || "Feature",
        ).trim(),

        title: String(
          item.title || item.name || item.featureName || "Feature JIRA",
        ).trim(),

        subtitle: String(
          item.statusRaw || item.currentStatus || item.status || "",
        ).trim(),

        startDate: parseDate(item.startDate),

        endDate: parseDate(item.endDate || item.targetDate),

        countries: parseCountries(item.country),

        raw: item,
      }))
      .filter((row) => row.startDate && row.endDate);
  }

  function filterRows(rows, year, state) {
    return rows
      .filter((row) => rowMatchesGeography(row.countries, state))
      .filter((row) => rangeOverlapsYear(row.startDate, row.endDate, year))
      .sort((left, right) => {
        const startDifference = left.startDate - right.startDate;

        if (startDifference !== 0) {
          return startDifference;
        }

        return String(left.title || "").localeCompare(
          String(right.title || ""),
          "es",
        );
      });
  }

  function collectAvailableYears(sdaRows, msaRows, featureRows, selectedYear) {
    const years = new Set();

    sdaRows.forEach((row) => {
      if (Number.isFinite(Number(row.year))) {
        years.add(Number(row.year));
      }
    });

    [...msaRows, ...featureRows].forEach((row) => {
      if (!row.startDate || !row.endDate) {
        return;
      }

      const firstYear = row.startDate.getFullYear();

      const lastYear = row.endDate.getFullYear();

      for (let year = firstYear; year <= lastYear; year += 1) {
        years.add(year);
      }
    });

    years.add(selectedYear);

    return [...years].sort((left, right) => left - right);
  }

  function requestedYear(routeContext) {
    const raw = String(
      routeContext?.quarter || routeContext?.period || "",
    ).trim();

    if (/^\d{4}$/.test(raw)) {
      return Number(raw);
    }

    return new Date().getFullYear();
  }

  function buildRoute(programId, productId, year, countryId) {
    return [
      "roadmap",
      encodeURIComponent(programId),
      "timeline",
      encodeURIComponent(productId),
      encodeURIComponent(String(year)),
      ALL_ID,
      ALL_ID,
      encodeURIComponent(countryId || HOLDING_ID),
    ].join("/");
  }

  function rowLayout(row, year) {
    const yearStart = new Date(year, 0, 1);

    const yearEndExclusive = new Date(year + 1, 0, 1);

    const visibleStart = row.startDate < yearStart ? yearStart : row.startDate;

    const rawEndExclusive = addOneDay(row.endDate);

    const visibleEndExclusive =
      rawEndExclusive > yearEndExclusive ? yearEndExclusive : rawEndExclusive;

    const total = yearEndExclusive.getTime() - yearStart.getTime();

    const left = ((visibleStart.getTime() - yearStart.getTime()) / total) * 100;

    const right =
      ((visibleEndExclusive.getTime() - yearStart.getTime()) / total) * 100;

    return {
      left: Math.max(0, Math.min(100, left)),

      width: Math.max(0.8, Math.min(100 - left, right - left)),
    };
  }

  function todayPosition(year) {
    const today = new Date();

    if (today.getFullYear() !== year) {
      return null;
    }

    const yearStart = new Date(year, 0, 1);

    const yearEndExclusive = new Date(year + 1, 0, 1);

    const total = yearEndExclusive - yearStart;

    return ((today - yearStart) / total) * 100;
  }

  function renderTodayLine(year, withLabel = false) {
    const position = todayPosition(year);

    if (position === null) {
      return "";
    }

    return `
      <span
        class="
          product-plan-today
          ${withLabel ? "has-label" : ""}
        "
        style="
          left:${position}%;
        "
        aria-hidden="true"
      >
        ${
          withLabel
            ? `
                <em>
                  Hoy
                </em>
              `
            : ""
        }
      </span>
    `;
  }

  function formatShortDate(value) {
    const date = parseDate(value);

    if (!date) {
      return "-";
    }

    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    });
  }

  function renderCountryBadges(countryIds) {
    const ids = countryIds?.length ? countryIds : [HOLDING_ID];

    return `
      <span
        class="
          product-plan-row-countries
        "
      >
        ${ids
          .map((countryId) => {
            const country = countryMeta(countryId);

            return `
                <span
                  title="${escapeHtml(country.label || countryId)}"
                >
                  ${escapeHtml(
                    countryId === HOLDING_ID ? "Holding" : countryId,
                  )}
                </span>
              `;
          })
          .join("")}
      </span>
    `;
  }

  function renderMonthAxis(year) {
    return `
      <div
        class="
          product-plan-axis
        "
      >
        <div
          class="
            product-plan-axis-label
          "
        >
          ELEMENTO
        </div>

        <div
          class="
            product-plan-axis-track
          "
        >
          <div
            class="
              product-plan-months
            "
          >
            ${MONTH_LABELS.map(
              (month) => `
                <span>
                  ${month}
                </span>
              `,
            ).join("")}
          </div>

          ${renderTodayLine(year, true)}
        </div>
      </div>
    `;
  }

  function renderTimelineRows(rows, year, sourceType) {
    if (!rows.length) {
      return `
      <div
        class="
          product-plan-empty-lane
        "
      >
        No hay elementos con
        planificación temporal
        para esta selección.
      </div>
    `;
    }

    return rows
      .map((row) => {
        const layout = rowLayout(row, year);

        const isSda = sourceType === "sda";

        const sdaStatus = isSda
          ? {
              key: row.statusKey || "sin-estado",

              label: row.statusLabel || "Sin estado",
            }
          : null;

        const sdaPalette = isSda
          ? productPlanSdaStatusPalette(sdaStatus.key)
          : null;

        const statusBadge = isSda
          ? `
              <span
                title="${escapeHtml(`Estado SDA: ${sdaStatus.label}`)}"
                style="
                  display:inline-flex;
                  align-items:center;
                  min-height:22px;
                  padding:2px 8px;
                  border:1px solid ${sdaPalette.border};
                  border-radius:999px;
                  background:${sdaPalette.background};
                  color:${sdaPalette.text};
                  font-size:10px;
                  font-weight:900;
                  white-space:nowrap;
                "
              >
                ${escapeHtml(sdaStatus.label)}
              </span>
            `
          : "";

        const barStatusStyle = isSda
          ? `
              background:${sdaPalette.bar};
            `
          : "";

        const barTitle = [
          row.title,

          isSda ? `Estado: ${sdaStatus.label}` : "",

          `${formatShortDate(row.startDate)} → ${formatShortDate(row.endDate)}`,
        ]
          .filter(Boolean)
          .join(" · ");

        return `
        <article
          class="
            product-plan-row
            product-plan-row-${escapeHtml(sourceType)}
          "
        >
          <div
            class="
              product-plan-row-info
            "
          >
            <div
              class="
                product-plan-row-topline
              "
            >
              <span
                class="
                  product-plan-source-key
                "
              >
                ${escapeHtml(row.sourceKey)}
              </span>

              ${statusBadge}

              ${renderCountryBadges(row.countries)}
            </div>

            <strong
              title="${escapeHtml(row.title)}"
            >
              ${escapeHtml(row.title)}
            </strong>

            ${
              row.subtitle
                ? `
                    <small>
                      ${escapeHtml(row.subtitle)}
                    </small>
                  `
                : ""
            }
          </div>

          <div
            class="
              product-plan-row-track
            "
          >
            ${renderTodayLine(year)}

            <span
              class="
                product-plan-bar
                product-plan-bar-${escapeHtml(sourceType)}
              "
              style="
                left:${layout.left}%;
                width:${layout.width}%;
                ${barStatusStyle}
              "
              title="${escapeHtml(barTitle)}"
            >
              <span>
                ${escapeHtml(formatShortDate(row.startDate))}
                →
                ${escapeHtml(formatShortDate(row.endDate))}

                ${isSda ? ` · ${escapeHtml(sdaStatus.label)}` : ""}
              </span>
            </span>
          </div>
        </article>
      `;
      })
      .join("");
  }

  function renderLane(sourceType, eyebrow, title, description, rows, year) {
    return `
      <section
        class="
          product-plan-lane
          product-plan-lane-${escapeHtml(sourceType)}
        "
      >
        <header
          class="
            product-plan-lane-header
          "
        >
          <div>
            <span>
              ${escapeHtml(eyebrow)}
            </span>

            <h3>
              ${escapeHtml(title)}
            </h3>

            <p>
              ${escapeHtml(description)}
            </p>
          </div>

          <strong>
            ${rows.length}
          </strong>
        </header>

        <div
          class="
            product-plan-lane-rows
          "
        >
          ${renderTimelineRows(rows, year, sourceType)}
        </div>
      </section>
    `;
  }

  function renderSourceToggle(
    sourceType,
    sourceTitle,
    roleTitle,
    description,
    active,
    countValue,
    loading = false,
  ) {
    return `
      <button
        type="button"
        class="
          product-plan-source-toggle
          product-plan-source-${escapeHtml(sourceType)}
          ${active ? "is-active" : ""}
        "
        data-product-plan-source="${escapeHtml(sourceType)}"
        aria-pressed="${active ? "true" : "false"}"
        ${loading ? "disabled" : ""}
      >
        <span
          class="
            product-plan-source-toggle-top
          "
        >
          <span>
            ${escapeHtml(sourceTitle)}
          </span>

          <i
            aria-hidden="true"
          ></i>
        </span>

        <strong>
          ${escapeHtml(roleTitle)}
        </strong>

        <small>
          ${escapeHtml(description)}
        </small>

        <footer>
          <span>
            ${loading ? "Cargando..." : escapeHtml(countValue)}
          </span>

          <em>
            ${active ? "VISIBLE" : "OCULTO"}
          </em>
        </footer>
      </button>
    `;
  }

  function holdingScopeText(state) {
    const allIds = localCountryIds();

    const selectedIds = allIds.filter((countryId) =>
      state.holdingCountries.has(countryId),
    );

    if (selectedIds.length === 0) {
      return "Sin geografías seleccionadas";
    }

    const allSelected =
      allIds.length > 0 &&
      allIds.every((countryId) => state.holdingCountries.has(countryId));

    if (allSelected) {
      return "Todas las geografías";
    }

    if (selectedIds.length === 1 && selectedIds[0] === HOLDING_ID) {
      return "Solo Holding";
    }

    return selectedIds
      .map(
        (countryId) =>
          countryMeta(countryId).label ||
          (countryId === HOLDING_ID ? "Holding" : countryId),
      )
      .join(" · ");
  }

  function renderHoldingCountryToggle(country, state) {
    const countryId = String(country.id || "")
      .trim()
      .toUpperCase();

    const active = state.holdingCountries.has(countryId);

    const flagSrc = String(country.flagSrc || "").trim();

    return `
      <button
        type="button"
        class="
          product-plan-country-toggle
          ${active ? "is-active" : ""}
        "
        data-product-plan-country="${escapeHtml(countryId)}"
        aria-pressed="${active ? "true" : "false"}"
      >
        ${
          flagSrc
            ? `
                <img
                  src="${escapeHtml(flagSrc)}"
                  alt=""
                  aria-hidden="true"
                />
              `
            : `
                <span>
                  ${escapeHtml(countryId)}
                </span>
              `
        }

        <strong>
          ${escapeHtml(country.label || countryId)}
        </strong>
      </button>
    `;
  }

  function renderGeographyControl(state) {
    const activeCountry = normalizeCountry(selectedCountry) || HOLDING_ID;

    /*
     * =====================================================
     * PAÍS
     * =====================================================
     *
     * El eje izquierdo sigue siendo el control principal.
     */
    if (activeCountry !== HOLDING_ID) {
      const country = countryMeta(activeCountry);

      return `
      <section
        class="
          product-plan-geography
          is-local
        "
      >
        <div
          class="
            product-plan-geography-copy
          "
        >
          <span>
            ÁMBITO GEOGRÁFICO
          </span>

          <strong>
            ${escapeHtml(country.label || activeCountry)}
          </strong>

          <small>
            Se muestran únicamente
            elementos asociados a
            ${escapeHtml(country.label || activeCountry)}.
            La navegación se controla
            desde el eje izquierdo.
          </small>
        </div>
      </section>
    `;
    }

    /*
     * =====================================================
     * HOLDING
     * =====================================================
     */

    const allIds = localCountryIds();

    const allSelected =
      allIds.length > 0 &&
      allIds.every((countryId) => state.holdingCountries.has(countryId));

    return `
    <section
      class="
        product-plan-geography
        is-holding
      "
    >
      <div
        class="
          product-plan-geography-copy
        "
      >
        <span>
          HOLDING · GEOGRAFÍAS
        </span>

        <strong>
          ${escapeHtml(holdingScopeText(state))}
        </strong>

        <small>
          Activa o desactiva Holding
          y cada país para construir
          la visión agregada.
        </small>
      </div>

      <div
        class="
          product-plan-country-toggles
        "
      >
        <button
          type="button"
          class="
            product-plan-country-toggle
            product-plan-country-all
            ${allSelected ? "is-active" : ""}
          "
          data-product-plan-country="ALL"
          aria-pressed="${allSelected ? "true" : "false"}"
        >
          <span
            aria-hidden="true"
          >
            ◎
          </span>

          <strong>
            Todos
          </strong>
        </button>

        ${localCountries()
          .map((country) => renderHoldingCountryToggle(country, state))
          .join("")}
      </div>
    </section>
  `;
  }

  function renderYearSelector(
    programId,
    productId,
    years,
    selectedYear,
    countryId,
  ) {
    return `
      <section
        class="
          product-plan-period
        "
      >
        <div>
          <span>
            PERIODO DEL CRONOGRAMA
          </span>

          <strong>
            ${selectedYear}
          </strong>
        </div>

        ${
          years.length > 1
            ? `
                <nav
                  class="
                    product-plan-year-selector
                  "
                  aria-label="
                    Seleccionar año
                  "
                >
                  ${years
                    .map(
                      (year) => `
                        <button
                          type="button"
                          class="
                            ${year === selectedYear ? "active" : ""}
                          "
                          data-product-plan-year="${year}"
                          data-product-plan-program="${escapeHtml(programId)}"
                          data-product-plan-product="${escapeHtml(productId)}"
                          data-product-plan-country-scope="${escapeHtml(
                            countryId,
                          )}"
                          aria-pressed="${
                            year === selectedYear ? "true" : "false"
                          }"
                        >
                          ${year}
                        </button>
                      `,
                    )
                    .join("")}
                </nav>
              `
            : `
                <span
                  class="
                    product-plan-single-year
                  "
                >
                  Único año disponible
                </span>
              `
        }
      </section>
    `;
  }

  function featuresAreLoaded(programId) {
    if (loadedFeaturePrograms.has(programId)) {
      return true;
    }

    const rows = Array.isArray(DATA?.jiraWorkspaceFeatures)
      ? DATA.jiraWorkspaceFeatures
      : [];

    if (rows.length) {
      loadedFeaturePrograms.add(programId);

      return true;
    }

    return false;
  }

  function renderComparison(programId, routeContext) {
    const program =
      typeof roadmapWorkspaceGetProgram === "function"
        ? roadmapWorkspaceGetProgram(programId)
        : (Array.isArray(DATA?.programs) ? DATA.programs : []).find(
            (item) =>
              String(item.id || "").trim() === String(programId || "").trim(),
          );

    if (!program) {
      renderLanding();

      return;
    }

    const productId = normalizeProduct(routeContext?.productId);

    if (!productId || productId === ALL_ID) {
      if (baseRenderRoadmapWorkspace) {
        baseRenderRoadmapWorkspace(programId, routeContext);
      }

      return;
    }

    const selectedYear = requestedYear(routeContext);

    const requestedCountry =
      normalizeCountry(routeContext?.countryId) ||
      normalizeCountry(selectedCountry) ||
      HOLDING_ID;

    selectedCountry = requestedCountry;

    selectedExecutiveProduct = productId;

    if (typeof roadmapWorkspaceState === "function") {
      const workspaceState = roadmapWorkspaceState(programId);

      workspaceState.view = "timeline";

      workspaceState.productId = productId;

      workspaceState.quarter = String(selectedYear);

      if (Object.prototype.hasOwnProperty.call(workspaceState, "ambitionId")) {
        workspaceState.ambitionId = ALL_ID;
      }

      if (
        Object.prototype.hasOwnProperty.call(workspaceState, "capabilityId")
      ) {
        workspaceState.capabilityId = ALL_ID;
      }

      if (Object.prototype.hasOwnProperty.call(workspaceState, "countryId")) {
        workspaceState.countryId = requestedCountry;
      }
    }

    const state = comparisonState(programId, productId);

    const allSdaRows = collectSdaRows(programId, productId);

    const allMsaRows = collectMsaRows(programId, productId);

    const featureLoaded = featuresAreLoaded(programId);

    const allFeatureRows = featureLoaded
      ? collectFeatureRows(programId, productId)
      : [];

    const sdaRows = filterRows(allSdaRows, selectedYear, state);

    const msaRows = filterRows(allMsaRows, selectedYear, state);

    const featureRows = filterRows(allFeatureRows, selectedYear, state);

    const years = collectAvailableYears(
      allSdaRows,
      allMsaRows,
      allFeatureRows,
      selectedYear,
    );

    const productName = productLabel(productId);

    const programName = String(program.name || "AIxBanker").trim();

    const geographyLabel =
      requestedCountry === HOLDING_ID
        ? `Holding · ${holdingScopeText(state)}`
        : countryMeta(requestedCountry).label || requestedCountry;

    setHead(
      `${productName} · Flight Plan`,

      `Planificación SDA · Diseño MSA · Ejecución Features · ${geographyLabel}`,

      [
        "Retail Client Solutions",
        programName,
        requestedCountry === HOLDING_ID
          ? "Holding"
          : countryMeta(requestedCountry).label || requestedCountry,
        productName,
        "Flight Plan",
      ].join(" > "),
    );

    const visibleLaneCount = [
      state.sources.sda,
      state.sources.msa,
      state.sources.features,
    ].filter(Boolean).length;

    view.innerHTML = `
      <section
        class="
          product-plan-comparison
        "
      >
        <button
          type="button"
          class="
            ghost-button
            product-plan-back
          "
          data-route="program/${escapeHtml(programId)}/${escapeHtml(productId)}"
        >
          ← Volver al Flight Deck
        </button>

        <header
          class="
            product-plan-header
          "
        >
          <div>
            <span>
              PRODUCT FLIGHT PLAN ·
              ${selectedYear}
            </span>

            <h2>
              ${escapeHtml(productName)}
            </h2>

            <p>
              Planificación aprobada,
              diseño y ejecución sobre
              una única escala temporal.
            </p>
          </div>

          <aside>
            <span>
              Ámbito
            </span>

            <strong>
              ${escapeHtml(geographyLabel)}
            </strong>
          </aside>
        </header>

        <section
          class="
            product-plan-source-controls
          "
          aria-label="
            Fuentes visibles
          "
        >
          ${renderSourceToggle(
            "sda",
            "SDA",
            "PLANIFICACIÓN",
            "Compromisos y ventanas aprobadas",
            state.sources.sda,
            `${sdaRows.length} deliverables`,
          )}

          ${renderSourceToggle(
            "msa",
            "JIRA · MSAs",
            "DISEÑO",
            "Ciclo de análisis y diseño",
            state.sources.msa,
            `${msaRows.length} MSAs`,
          )}

          ${renderSourceToggle(
            "features",
            "JIRA · FEATURES",
            "EJECUCIÓN",
            featureLoaded
              ? "Features oficiales de ejecución"
              : "Carga bajo demanda desde JIRA",
            state.sources.features,
            featureLoaded ? `${featureRows.length} features` : "Cargar JIRA",
            state.featuresLoading,
          )}
        </section>

        ${renderGeographyControl(state)}

        ${renderYearSelector(
          programId,
          productId,
          years,
          selectedYear,
          requestedCountry,
        )}

        <section
          class="
            product-plan-timeline-shell
          "
        >
          <div
            class="
              product-plan-timeline-scroll
            "
          >
            <div
              class="
                product-plan-timeline
              "
            >
              ${renderMonthAxis(selectedYear)}

              ${
                visibleLaneCount
                  ? `
                      ${
                        state.sources.sda
                          ? renderLane(
                              "sda",
                              "SDA",
                              "Planificación",
                              "Qué nos comprometimos a entregar",
                              sdaRows,
                              selectedYear,
                            )
                          : ""
                      }

                      ${
                        state.sources.msa
                          ? renderLane(
                              "msa",
                              "JIRA · MSAs",
                              "Diseño",
                              "Cuándo se analiza y diseña la solución",
                              msaRows,
                              selectedYear,
                            )
                          : ""
                      }

                      ${
                        state.sources.features
                          ? renderLane(
                              "features",
                              "JIRA · Features",
                              "Ejecución",
                              "Cuándo se ejecuta la entrega en JIRA",
                              featureRows,
                              selectedYear,
                            )
                          : ""
                      }
                    `
                  : `
                      <div
                        class="
                          product-plan-no-sources
                        "
                      >
                        <strong>
                          No hay fuentes visibles
                        </strong>

                        <span>
                          Activa SDA, JIRA · MSAs
                          o JIRA · Features.
                        </span>
                      </div>
                    `
              }
            </div>
          </div>
        </section>
      </section>
    `;

    requestAnimationFrame(() => {
      if (typeof renderSidebarCountryNavigation === "function") {
        renderSidebarCountryNavigation();
      }
    });
  }

  function rerenderComparison() {
    if (typeof roadmapWorkspaceParseRoute !== "function") {
      return;
    }

    const context = roadmapWorkspaceParseRoute();

    if (String(context?.programId || "").trim() !== PROGRAM_ID) {
      return;
    }

    renderRoadmapWorkspace(PROGRAM_ID, context);
  }

  async function toggleSource(button) {
    const sourceType = String(button.dataset.productPlanSource || "")
      .trim()
      .toLowerCase();

    const context =
      typeof roadmapWorkspaceParseRoute === "function"
        ? roadmapWorkspaceParseRoute()
        : null;

    const programId = String(context?.programId || "").trim();

    const productId = normalizeProduct(context?.productId);

    if (programId !== PROGRAM_ID || !productId || productId === ALL_ID) {
      return;
    }

    const state = comparisonState(programId, productId);

    if (!Object.prototype.hasOwnProperty.call(state.sources, sourceType)) {
      return;
    }

    const nextValue = !state.sources[sourceType];

    /*
     * Features:
     *
     * sólo accedemos a JIRA cuando
     * el usuario las activa.
     */
    if (
      sourceType === "features" &&
      nextValue &&
      !featuresAreLoaded(programId)
    ) {
      state.featuresLoading = true;

      state.featuresLoadError = false;

      rerenderComparison();

      if (typeof showLoadingOverlay === "function") {
        showLoadingOverlay("Cargando Features oficiales de JIRA...");
      }

      try {
        const jiraData = await loadJiraFeaturesData(programId);

        installJiraFeaturesData(programId, jiraData);

        loadedFeaturePrograms.add(programId);

        state.sources.features = true;

        if (typeof clearDataFallbackBanner === "function") {
          clearDataFallbackBanner();
        }
      } catch (error) {
        console.error(
          "[AIxBanker] No se han podido cargar las Features JIRA.",
          error,
        );

        state.sources.features = false;

        state.featuresLoadError = true;

        if (typeof showDataFallbackBanner === "function") {
          showDataFallbackBanner(
            "No se han podido cargar las Features JIRA. SDA y MSAs siguen disponibles.",
          );
        }
      } finally {
        state.featuresLoading = false;

        if (typeof hideLoadingOverlay === "function") {
          hideLoadingOverlay();
        }

        rerenderComparison();
      }

      return;
    }

    state.sources[sourceType] = nextValue;

    rerenderComparison();
  }

  function toggleHoldingCountry(button) {
    const context =
      typeof roadmapWorkspaceParseRoute === "function"
        ? roadmapWorkspaceParseRoute()
        : null;

    const programId = String(context?.programId || "").trim();

    const productId = normalizeProduct(context?.productId);

    if (
      programId !== PROGRAM_ID ||
      !productId ||
      productId === ALL_ID ||
      normalizeCountry(selectedCountry) !== HOLDING_ID
    ) {
      return;
    }

    const state = comparisonState(programId, productId);

    const countryId = String(button.dataset.productPlanCountry || "")
      .trim()
      .toUpperCase();

    /*
     * Ahora contiene:
     *
     * HL
     * ES
     * MX
     * PE
     * CO
     */
    const selectableIds = localCountryIds();

    /*
     * =====================================================
     * TODOS
     * =====================================================
     */
    if (countryId === ALL_ID) {
      const allSelected =
        selectableIds.length > 0 &&
        selectableIds.every((id) => state.holdingCountries.has(id));

      if (allSelected) {
        state.holdingCountries.clear();
      } else {
        state.holdingCountries = new Set(selectableIds);
      }

      rerenderComparison();

      return;
    }

    /*
     * =====================================================
     * GEOGRAFÍA INDIVIDUAL
     * =====================================================
     */
    if (!selectableIds.includes(countryId)) {
      return;
    }

    if (state.holdingCountries.has(countryId)) {
      state.holdingCountries.delete(countryId);
    } else {
      state.holdingCountries.add(countryId);
    }

    rerenderComparison();
  }

  function selectYear(button) {
    const year = Number(button.dataset.productPlanYear);

    const programId = String(button.dataset.productPlanProgram || "").trim();

    const productId = normalizeProduct(button.dataset.productPlanProduct);

    const countryId =
      normalizeCountry(button.dataset.productPlanCountryScope) ||
      normalizeCountry(selectedCountry) ||
      HOLDING_ID;

    if (!Number.isFinite(year) || !programId || !productId) {
      return;
    }

    route(buildRoute(programId, productId, year, countryId));
  }

  function handleComparisonClick(event) {
    const sourceButton = event.target.closest("[data-product-plan-source]");

    if (sourceButton) {
      event.preventDefault();

      toggleSource(sourceButton).catch(console.error);

      return;
    }

    const countryButton = event.target.closest("[data-product-plan-country]");

    if (countryButton) {
      event.preventDefault();

      toggleHoldingCountry(countryButton);

      return;
    }

    const yearButton = event.target.closest("[data-product-plan-year]");

    if (yearButton) {
      event.preventDefault();

      selectYear(yearButton);
    }
  }

  /*
   * =====================================================
   * SIDEBAR DE PAÍS
   * =====================================================
   *
   * context-toolbar.js trata normalmente
   * el país como navegación de primer nivel
   * y vuelve a la raíz del programa.
   *
   * En este comparador queremos conservar:
   *
   * - producto
   * - año
   * - Flight Plan
   *
   * El listener se instala en window/capture,
   * que se ejecuta antes que el listener
   * de document/capture del toolbar.
   *
   * Sólo interceptamos esta pantalla.
   * El resto del Cockpit conserva su
   * comportamiento actual.
   */
  function handleSidebarCountryClick(event) {
    const target = event.target;

    if (!target || typeof target.closest !== "function") {
      return;
    }

    const button = target.closest("#sidebarCountryNavigation [data-country]");

    if (!button) {
      return;
    }

    if (typeof roadmapWorkspaceParseRoute !== "function") {
      return;
    }

    const context = roadmapWorkspaceParseRoute();

    const programId = String(context?.programId || "").trim();

    const productId = normalizeProduct(context?.productId);

    if (
      String(context?.routeName || "").trim() !== "roadmap" ||
      programId !== PROGRAM_ID ||
      !productId ||
      productId === ALL_ID
    ) {
      return;
    }

    const countryId = normalizeCountry(button.dataset.country);

    if (!countryId) {
      return;
    }

    event.preventDefault();

    event.stopImmediatePropagation();

    selectedCountry = countryId;

    const year = requestedYear(context);

    const targetRoute = buildRoute(programId, productId, year, countryId);

    const currentRoute = String(location.hash || "")
      .replace(/^#\/?/, "")
      .trim();

    if (currentRoute === targetRoute) {
      rerenderComparison();

      return;
    }

    route(targetRoute);
  }

  function installStyles() {
    if (document.querySelector("#productPlanComparisonStyles")) {
      return;
    }

    const style = document.createElement("style");

    style.id = "productPlanComparisonStyles";

    style.textContent = `
      .product-plan-comparison {
        display: grid;
        gap: 24px;
        padding-bottom: 40px;
      }

      .product-plan-back {
        justify-self: start;
      }

      .product-plan-header {
        display: grid;
        grid-template-columns:
          minmax(0, 1fr)
          minmax(190px, 280px);
        gap: 28px;
        align-items: center;
        padding: 28px 30px;
        border: 1px solid #d8e2f1;
        border-top: 4px solid #061b9b;
        border-radius: 22px;
        background: #ffffff;
        box-shadow:
          0 16px 40px
          rgba(5, 31, 79, 0.06);
      }

      .product-plan-header > div > span,
      .product-plan-period > div > span,
      .product-plan-geography-copy > span {
        display: block;
        margin-bottom: 7px;
        color: #08238f;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.09em;
      }

      .product-plan-header h2 {
        margin: 0;
        color: #071a8c;
        font-size:
          clamp(32px, 4vw, 52px);
        line-height: 1;
      }

      .product-plan-header p {
        max-width: 760px;
        margin: 12px 0 0;
        color: #5c6f8f;
        font-size: 17px;
        line-height: 1.5;
      }

      .product-plan-header aside {
        display: grid;
        gap: 7px;
        padding: 18px 20px;
        border: 1px solid #d8e2f1;
        border-radius: 16px;
        background: #f5f8fd;
      }

      .product-plan-header aside span {
        color: #647694;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .product-plan-header aside strong {
        color: #071a8c;
        font-size: 17px;
        line-height: 1.35;
      }

      .product-plan-source-controls {
        display: grid;
        grid-template-columns:
          repeat(3, minmax(0, 1fr));
        gap: 14px;
      }

      .product-plan-source-toggle {
        --source-color: #1464c9;
        --source-soft: #edf5ff;

        display: grid;
        gap: 8px;
        min-height: 150px;
        padding: 18px 20px;
        border: 1px solid #d7e1ef;
        border-top: 4px solid #c8d2df;
        border-radius: 18px;
        background: #ffffff;
        color: #667792;
        text-align: left;
        cursor: pointer;
        transition:
          transform 140ms ease,
          box-shadow 140ms ease,
          border-color 140ms ease,
          background 140ms ease;
      }

      .product-plan-source-toggle:hover {
        transform: translateY(-2px);
        box-shadow:
          0 12px 28px
          rgba(0, 37, 92, 0.08);
      }

      .product-plan-source-toggle.is-active {
        border-color:
          color-mix(
            in srgb,
            var(--source-color) 48%,
            #d7e1ef
          );
        border-top-color:
          var(--source-color);
        background:
          var(--source-soft);
        color: #243a5d;
      }

      .product-plan-source-toggle:disabled {
        cursor: wait;
        opacity: 0.72;
      }

      .product-plan-source-sda {
        --source-color: #1464c9;
        --source-soft: #edf5ff;
      }

      .product-plan-source-msa {
        --source-color: #6755c4;
        --source-soft: #f2efff;
      }

      .product-plan-source-features {
        --source-color: #159d82;
        --source-soft: #ebf9f5;
      }

      .product-plan-source-toggle-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        color: var(--source-color);
        font-size: 13px;
        font-weight: 900;
        letter-spacing: 0.055em;
      }

      .product-plan-source-toggle-top i {
        position: relative;
        width: 38px;
        height: 22px;
        flex: 0 0 38px;
        border-radius: 999px;
        background: #bdc9d9;
        transition: background 140ms ease;
      }

      .product-plan-source-toggle-top i::after {
        content: "";
        position: absolute;
        top: 3px;
        left: 3px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: white;
        box-shadow:
          0 1px 4px
          rgba(0, 0, 0, 0.22);
        transition: transform 140ms ease;
      }

      .product-plan-source-toggle.is-active
        .product-plan-source-toggle-top i {
        background:
          var(--source-color);
      }

      .product-plan-source-toggle.is-active
        .product-plan-source-toggle-top i::after {
        transform: translateX(16px);
      }

      .product-plan-source-toggle > strong {
        color: #071a8c;
        font-size: 20px;
      }

      .product-plan-source-toggle > small {
        min-height: 34px;
        color: #647694;
        font-size: 13px;
        line-height: 1.35;
      }

      .product-plan-source-toggle footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding-top: 7px;
        border-top: 1px solid
          rgba(116, 136, 166, 0.18);
      }

      .product-plan-source-toggle footer span {
        color: #233c63;
        font-size: 13px;
        font-weight: 800;
      }

      .product-plan-source-toggle footer em {
        color: #8090a8;
        font-size: 10px;
        font-style: normal;
        font-weight: 900;
        letter-spacing: 0.08em;
      }

      .product-plan-source-toggle.is-active
        footer em {
        color: var(--source-color);
      }

      .product-plan-geography {
        display: grid;
        grid-template-columns:
          minmax(210px, 0.9fr)
          minmax(0, 2.1fr);
        gap: 24px;
        align-items: center;
        padding: 18px 22px;
        border: 1px solid #d7e1ef;
        border-radius: 18px;
        background: #ffffff;
      }

      .product-plan-geography.is-local {
        grid-template-columns: 1fr;
      }

      .product-plan-geography-copy strong {
        display: block;
        color: #071a8c;
        font-size: 18px;
      }

      .product-plan-geography-copy small {
        display: block;
        margin-top: 5px;
        color: #71819b;
        line-height: 1.35;
      }

      .product-plan-country-toggles {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
      }

      .product-plan-country-toggle {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 42px;
        padding: 7px 13px;
        border: 1px solid #d4deec;
        border-radius: 999px;
        background: #f7f9fc;
        color: #526682;
        cursor: pointer;
        transition:
          border-color 120ms ease,
          background 120ms ease,
          color 120ms ease,
          transform 120ms ease;
      }

      .product-plan-country-toggle:hover {
        transform: translateY(-1px);
      }

      .product-plan-country-toggle.is-active {
        border-color: #0b35b7;
        background: #eaf1ff;
        color: #071a8c;
      }

      .product-plan-country-toggle img {
        width: 25px;
        height: 25px;
        border-radius: 50%;
        object-fit: cover;
      }

      .product-plan-country-toggle > span {
        display: inline-grid;
        width: 25px;
        height: 25px;
        place-items: center;
        border-radius: 50%;
        background: #dfe8f6;
        font-size: 12px;
        font-weight: 900;
      }

      .product-plan-country-toggle strong {
        font-size: 12px;
      }

      .product-plan-country-all {
        padding-right: 16px;
      }

      .product-plan-period {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 0 0 16px;
        border-bottom: 1px solid #d8e2ef;
      }

      .product-plan-period > div > strong {
        display: block;
        color: #071a8c;
        font-family: Georgia, serif;
        font-size: 30px;
      }

      .product-plan-year-selector {
        display: inline-flex;
        gap: 4px;
        padding: 4px;
        border: 1px solid #d5dfec;
        border-radius: 999px;
        background: #f5f8fc;
      }

      .product-plan-year-selector button {
        min-width: 64px;
        padding: 8px 14px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        color: #536785;
        font-weight: 800;
        cursor: pointer;
      }

      .product-plan-year-selector button.active {
        background: #0719ad;
        color: white;
        box-shadow:
          0 5px 12px
          rgba(7, 25, 173, 0.2);
      }

      .product-plan-single-year {
        color: #71819b;
        font-size: 13px;
        font-weight: 700;
      }

      .product-plan-timeline-shell {
        min-width: 0;
        border: 1px solid #d6e0ee;
        border-radius: 20px;
        background: white;
        overflow: hidden;
        box-shadow:
          0 16px 38px
          rgba(11, 38, 84, 0.06);
      }

      .product-plan-timeline-scroll {
        overflow-x: auto;
      }

      .product-plan-timeline {
        min-width: 1120px;
      }

      .product-plan-axis,
      .product-plan-row {
        display: grid;
        grid-template-columns:
          310px
          minmax(760px, 1fr);
      }

      .product-plan-axis {
        position: sticky;
        top: 0;
        z-index: 4;
        min-height: 58px;
        border-bottom: 1px solid #dbe4f0;
        background: #f5f8fc;
      }

      .product-plan-axis-label {
        display: flex;
        align-items: center;
        padding: 0 22px;
        border-right: 1px solid #dbe4f0;
        color: #71819b;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.08em;
      }

      .product-plan-axis-track,
      .product-plan-row-track {
        position: relative;
        min-width: 0;
        background-image:
          linear-gradient(
            to right,
            rgba(18, 57, 116, 0.10) 1px,
            transparent 1px
          );
        background-size:
          calc(100% / 12) 100%;
      }

      .product-plan-months {
        display: grid;
        grid-template-columns:
          repeat(12, 1fr);
        height: 100%;
      }

      .product-plan-months span {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #526783;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.04em;
      }

      .product-plan-lane {
        border-bottom: 1px solid #dce5f0;
      }

      .product-plan-lane:last-child {
        border-bottom: 0;
      }

      .product-plan-lane-header {
        --lane-color: #1464c9;

        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 18px 22px;
        border-bottom: 1px solid #e1e8f2;
        border-left: 5px solid var(--lane-color);
        background: #f9fbfe;
      }

      .product-plan-lane-sda
        .product-plan-lane-header {
        --lane-color: #1464c9;
      }

      .product-plan-lane-msa
        .product-plan-lane-header {
        --lane-color: #6755c4;
      }

      .product-plan-lane-features
        .product-plan-lane-header {
        --lane-color: #159d82;
      }

      .product-plan-lane-header > div > span {
        color: var(--lane-color);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.08em;
      }

      .product-plan-lane-header h3 {
        margin: 3px 0 0;
        color: #071a8c;
        font-size: 21px;
      }

      .product-plan-lane-header p {
        margin: 3px 0 0;
        color: #6f8099;
        font-size: 13px;
      }

      .product-plan-lane-header > strong {
        display: grid;
        min-width: 42px;
        height: 42px;
        place-items: center;
        border-radius: 12px;
        background: white;
        color: var(--lane-color);
        box-shadow:
          inset 0 0 0 1px
          #d8e2ef;
        font-size: 18px;
      }

      .product-plan-row {
        min-height: 86px;
        border-bottom: 1px solid #edf1f6;
      }

      .product-plan-row:last-child {
        border-bottom: 0;
      }

      .product-plan-row-info {
        min-width: 0;
        display: grid;
        align-content: center;
        gap: 5px;
        padding: 13px 18px 13px 22px;
        border-right: 1px solid #dbe4f0;
      }

      .product-plan-row-topline {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .product-plan-source-key {
        min-width: 0;
        overflow: hidden;
        color: #71819b;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.05em;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .product-plan-row-info > strong {
        min-width: 0;
        overflow: hidden;
        color: #122b55;
        font-size: 13px;
        line-height: 1.3;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .product-plan-row-info > small {
        min-width: 0;
        overflow: hidden;
        color: #74849b;
        font-size: 11px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .product-plan-row-countries {
        display: inline-flex;
        gap: 3px;
        flex: 0 0 auto;
      }

      .product-plan-row-countries > span {
        display: inline-flex;
        align-items: center;
        min-height: 20px;
        padding: 2px 6px;
        border-radius: 999px;
        background: #eef3fa;
        color: #4e6381;
        font-size: 9px;
        font-weight: 900;
      }

      .product-plan-row-track {
        min-height: 86px;
      }

      .product-plan-bar {
        position: absolute;
        top: 50%;
        z-index: 2;
        display: flex;
        align-items: center;
        min-width: 6px;
        height: 28px;
        padding: 0 7px;
        border-radius: 7px;
        transform: translateY(-50%);
        overflow: hidden;
        box-sizing: border-box;
        box-shadow:
          0 4px 10px
          rgba(14, 42, 83, 0.16);
      }

      .product-plan-bar span {
        overflow: hidden;
        color: white;
        font-size: 10px;
        font-weight: 900;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .product-plan-bar-sda {
        background: #1464c9;
      }

      .product-plan-bar-msa {
        background: #6755c4;
      }

      .product-plan-bar-features {
        background: #159d82;
      }

      .product-plan-today {
        position: absolute;
        top: 0;
        bottom: 0;
        z-index: 3;
        width: 2px;
        background: #e1261c;
        pointer-events: none;
      }

      .product-plan-today.has-label em {
        position: absolute;
        top: 4px;
        left: 5px;
        padding: 2px 5px;
        border-radius: 4px;
        background: #e1261c;
        color: white;
        font-size: 9px;
        font-style: normal;
        font-weight: 900;
        white-space: nowrap;
      }

      .product-plan-empty-lane {
        padding: 22px;
        color: #77869d;
        font-size: 13px;
      }

      .product-plan-no-sources {
        display: grid;
        place-items: center;
        gap: 5px;
        min-height: 220px;
        color: #71819b;
        text-align: center;
      }

      .product-plan-no-sources strong {
        color: #17315a;
        font-size: 18px;
      }

      @media (max-width: 980px) {
        .product-plan-header {
          grid-template-columns: 1fr;
        }

        .product-plan-source-controls {
          grid-template-columns: 1fr;
        }

        .product-plan-geography {
          grid-template-columns: 1fr;
        }

        .product-plan-country-toggles {
          justify-content: flex-start;
        }

        .product-plan-period {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    `;

    document.head.append(style);
  }

  if (baseRenderRoadmapWorkspace) {
    renderRoadmapWorkspace =
      function renderRoadmapWorkspaceWithProductPlanComparison(
        programId,
        routeContext = roadmapWorkspaceParseRoute(),
      ) {
        const normalizedProgramId = String(programId || "").trim();

        const productId = normalizeProduct(routeContext?.productId);

        /*
         * Sólo sustituimos la visión
         * cuando estamos en AIxBanker
         * y existe un producto concreto.
         *
         * El roadmap general del programa
         * conserva la implementación actual.
         */
        if (
          normalizedProgramId === PROGRAM_ID &&
          productId &&
          productId !== ALL_ID
        ) {
          renderComparison(normalizedProgramId, routeContext);

          return;
        }

        baseRenderRoadmapWorkspace(programId, routeContext);
      };
  }

  document.addEventListener("click", handleComparisonClick);

  window.addEventListener("click", handleSidebarCountryClick, true);

  installStyles();
}

installProductPlanComparison();
