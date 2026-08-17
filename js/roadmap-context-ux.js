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
