function roadmapWorkspaceRenderTimelineLane(track, items, state) {
  const laneTitle =
    track === "technical" ? "Carril técnico" : "Carril funcional";

  const isJiraFunctionalLane =
    track === "functional" &&
    String(state?.functionalPlanSource || "internal")
      .trim()
      .toLowerCase() === "jira";

  const laneItems = roadmapWorkspaceSort(
    items.filter((item) => roadmapWorkspaceTrack(item) === track),
  );

  const plannedItems = laneItems.filter(roadmapWorkspaceHasPlanning);

  const undatedItems = laneItems.filter(
    (item) => !roadmapWorkspaceHasPlanning(item),
  );

  const today = roadmapWorkspaceTodayContext(state.quarter);

  return `
    <section
      class="
        roadmap-workspace-timeline-lane
        ${today.visible ? "has-today" : ""}
      "
      style="
        --roadmap-workspace-today:
        ${today.position}%;
      "
    >
      <header
        class="roadmap-workspace-lane-header"
      >
        <div>
          <span>
            ${laneTitle}
          </span>

          <h3>
            ${
              track === "technical"
                ? "MSAs, plataforma y habilitadores"
                : isJiraFunctionalLane
                  ? "Features oficiales JIRA"
                  : "Proyectos, pilotos e iniciativas"
            }
          </h3>
        </div>

        <strong>
          ${laneItems.length}
        </strong>
      </header>

      ${
        plannedItems.length
          ? renderRoadmapTimeline(plannedItems, state.quarter, {
              groupByCapability: state?.groupByCapability === true,
            })
          : `
            <section class="panel">
              <p class="empty-state">
                ${
                  isJiraFunctionalLane
                    ? "No hay Features JIRA con Program Increment para este periodo."
                    : "No hay elementos planificados en este carril y periodo."
                }
              </p>
            </section>
          `
      }

      ${undatedItems.length ? renderRoadmapUndatedItems(undatedItems) : ""}
    </section>
  `;
}
function roadmapWorkspaceRenderTimeline(programId, items, state) {
  const source =
    String(state?.functionalPlanSource || "internal")
      .trim()
      .toLowerCase() === "jira"
      ? "jira"
      : "internal";

  const productId = roadmapWorkspaceNormalizeProduct(
    state?.productId || state?.product || "",
  );

  const countryId = String(state?.countryId || state?.country || "")
    .trim()
    .toUpperCase();

  const capabilityId = String(state?.capabilityId || state?.capability || "")
    .trim()
    .toLowerCase();

  const internalItems = roadmapWorkspaceFilteredItems(items, state).filter(
    roadmapWorkspaceHasPlanning,
  );

  const allJiraItems = roadmapWorkspaceJiraFeatureItems(programId);

  const jiraItems = allJiraItems.filter((item) => {
    if (productId && item.product !== productId) {
      return false;
    }

    if (countryId && item.country && item.country !== countryId) {
      return false;
    }

    if (capabilityId && !item.capabilityIds.includes(capabilityId)) {
      return false;
    }

    return true;
  });

  const internalFunctional = internalItems.filter(
    (item) => roadmapWorkspaceTrack(item) === "functional",
  );

  const technicalInternal = internalItems.filter(
    (item) => roadmapWorkspaceTrack(item) === "technical",
  );

  const jiraFunctional = jiraItems.filter(
    (item) => roadmapWorkspaceTrack(item) === "functional",
  );

  const visibleFunctional =
    source === "jira" ? jiraFunctional : internalFunctional;

  return `
    <section
      class="aixbanker-roadmap-filters"
      aria-label="Fuente del cronograma"
    >
      <div class="aixbanker-roadmap-filter-group">
        <span class="aixbanker-roadmap-filter-label">
          Fuente del cronograma
        </span>

        <nav
          class="executive-filter-row"
          aria-label="Seleccionar fuente funcional"
        >
          <button
            class="quarter-btn ${source === "internal" ? "active" : ""}"
            type="button"
            data-roadmap-functional-source="internal"
            data-program-id="${roadmapWorkspaceEscape(programId)}"
            aria-pressed="${source === "internal" ? "true" : "false"}"
          >
            Plan interno · ${internalFunctional.length}
          </button>

          <button
            class="quarter-btn ${source === "jira" ? "active" : ""}"
            type="button"
            data-roadmap-functional-source="jira"
            data-program-id="${roadmapWorkspaceEscape(programId)}"
            aria-pressed="${source === "jira" ? "true" : "false"}"
          >
            JIRA oficial · ${jiraFunctional.length}
          </button>
        </nav>
      </div>
    </section>

    <section
      class="
        roadmap-workspace-view
        roadmap-workspace-timeline-view
      "
    >
      <section
        class="aixbanker-roadmap-legend"
        aria-label="Tipos de elemento"
      >
        ${
          source === "jira"
            ? `
              <span class="aixbanker-roadmap-legend-item">
                <i class="roadmap-type-project"></i>
                Feature JIRA
              </span>
            `
            : `
              <span class="aixbanker-roadmap-legend-item">
                <i class="roadmap-type-project"></i>
                Proyecto
              </span>

              <span class="aixbanker-roadmap-legend-item">
                <i class="roadmap-type-poc"></i>
                PoC
              </span>

              <span class="aixbanker-roadmap-legend-item">
                <i class="roadmap-type-initiative"></i>
                Iniciativa
              </span>

              <span class="aixbanker-roadmap-legend-item">
                <i class="roadmap-type-epic"></i>
                Epic
              </span>
            `
        }

        <span class="aixbanker-roadmap-legend-item">
          <i class="roadmap-type-msa"></i>
          MSA
        </span>
      </section>

      ${roadmapWorkspaceRenderTimelineLane(
        "functional",
        visibleFunctional,
        state,
      )}

      ${roadmapWorkspaceRenderTimelineLane(
        "technical",
        technicalInternal,
        state,
      )}
    </section>
  `;
}

function roadmapWorkspaceRenderBacklogLane(track, items, programId, state) {
  const laneItems = roadmapWorkspaceSort(
    items.filter((item) => roadmapWorkspaceTrack(item) === track),
  );
  const laneTitle =
    track === "technical" ? "Backlog técnico" : "Backlog funcional";

  return `
    <section class="roadmap-workspace-backlog-lane">
      <header class="roadmap-workspace-lane-header">
        <div>
          <span>${track === "technical" ? "Carril técnico" : "Carril funcional"}</span>
          <h3>${laneTitle}</h3>
        </div>
        <strong>${laneItems.length}</strong>
      </header>

      ${
        laneItems.length
          ? `
              <div class="roadmap-workspace-item-grid">
                ${laneItems
                  .map((item) =>
                    roadmapWorkspaceRenderItemCard(item, programId, state, {
                      showPlanningReason: true,
                    }),
                  )
                  .join("")}
              </div>
            `
          : `<section class="panel"><p class="empty-state">No hay elementos sin planificación en este carril.</p></section>`
      }
    </section>
  `;
}

function roadmapWorkspaceRenderBacklog(programId, items, state) {
  const filtered = roadmapWorkspaceFilteredItems(items, state, {
    applyPeriod: false,
  }).filter((item) => !roadmapWorkspaceHasPlanning(item));

  return `
    <section class="roadmap-workspace-view roadmap-workspace-backlog-view">
      <section class="roadmap-workspace-backlog-summary">
        <article>
          <span>Sin planificación</span>
          <strong>${filtered.length}</strong>
        </article>
        <article>
          <span>Funcionales</span>
          <strong>${
            filtered.filter(
              (item) => roadmapWorkspaceTrack(item) === "functional",
            ).length
          }</strong>
        </article>
        <article>
          <span>Técnicos</span>
          <strong>${
            filtered.filter(
              (item) => roadmapWorkspaceTrack(item) === "technical",
            ).length
          }</strong>
        </article>
        <article>
          <span>En riesgo</span>
          <strong>${filtered.filter(roadmapWorkspaceIsRisk).length}</strong>
        </article>
      </section>

      ${roadmapWorkspaceRenderBacklogLane("functional", filtered, programId, state)}
      ${roadmapWorkspaceRenderBacklogLane("technical", filtered, programId, state)}
    </section>
  `;
}

function renderRoadmapWorkspace(
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
  const countryLabel = roadmapWorkspaceCountryLabel();
  const productLabel = roadmapWorkspaceProductLabel(state.productId);
  const viewLabels = {
    summary: "Resumen",
    timeline: "Cronograma",
    backlog: "Backlog",
  };

  setHead(
    `${program.name || "Programa"} · Roadmap`,
    `${viewLabels[state.view]} · ${productLabel} · ${countryLabel}`,
    `Retail Client Solutions > ${program.name || programId} > Roadmap > ${viewLabels[state.view]}`,
  );

  const content =
    state.view === "timeline"
      ? roadmapWorkspaceRenderTimeline(programId, items, state)
      : state.view === "backlog"
        ? roadmapWorkspaceRenderBacklog(programId, items, state)
        : roadmapWorkspaceRenderSummary(programId, items, state);

  view.innerHTML = `
    <section class="roadmap-workspace">
      <button class="ghost-button" type="button" data-route="program/${roadmapWorkspaceEscape(programId)}">
        ← Volver a ${roadmapWorkspaceEscape(program.name || "programa")}
      </button>

      <header class="roadmap-workspace-hero">
        <div>
          <span>Roadmap del programa</span>
          <h2>De la visión al nivel de tarea</h2>
          <p>
            Resumen por carriles, planificación temporal y backlog sin fechas,
            con navegación hasta actividades y tareas.
          </p>
        </div>

        <aside>
          <strong>${items.length}</strong>
          <span>elementos totales</span>
          <strong>${items.filter(roadmapWorkspaceHasPlanning).length}</strong>
          <span>planificados</span>
        </aside>
      </header>

      ${roadmapWorkspaceRenderTabs(programId, state)}
      ${roadmapWorkspaceRenderFilters(programId, items, state)}
      ${content}
    </section>
  `;
}

function roadmapWorkspaceFindItem(programId, itemType, itemId) {
  const normalizedProgramId = String(programId || "").trim();

  const normalizedItemType = String(itemType || "")
    .trim()
    .toLowerCase();

  const normalizedItemId = String(itemId || "").trim();

  if (!normalizedProgramId || !normalizedItemType || !normalizedItemId) {
    return null;
  }

  /*
   * =====================================================
   * ELEMENTO
   * =====================================================
   *
   * No usamos roadmapWorkspaceItemsForProgram()
   * porque esa función depende de selectedCountry.
   *
   * En un detalle, la identidad del elemento
   * debe venir de la ruta y de sus propios datos,
   * no del estado global de navegación.
   */
  const candidates = roadmapWorkspaceAllItems().filter(
    (item) =>
      String(item.programId || "").trim() === normalizedProgramId &&
      String(item.type || "")
        .trim()
        .toLowerCase() === normalizedItemType &&
      String(item.id || "").trim() === normalizedItemId,
  );

  if (!candidates.length) {
    return null;
  }

  const state = roadmapWorkspaceState(normalizedProgramId);

  const stateProduct = roadmapWorkspaceNormalizeProduct(
    state?.productId || ROADMAP_WORKSPACE_ALL,
  );

  const currentCountry = String(selectedCountry || "")
    .trim()
    .toUpperCase();

  /*
   * Si hubiera IDs repetidos entre geografías
   * o productos, priorizamos el contexto
   * actual, pero nunca impedimos encontrar
   * el elemento.
   */
  const item =
    candidates.find((candidate) => {
      const candidateProduct = roadmapWorkspaceNormalizeProduct(
        candidate.product,
      );

      const candidateCountry = String(candidate.country || "")
        .trim()
        .toUpperCase();

      const matchesProduct =
        stateProduct === ROADMAP_WORKSPACE_ALL ||
        candidateProduct === stateProduct;

      const matchesCountry =
        !currentCountry ||
        currentCountry === "HL" ||
        !candidateCountry ||
        candidateCountry === currentCountry;

      return matchesProduct && matchesCountry;
    }) ||
    candidates.find((candidate) => {
      const candidateProduct = roadmapWorkspaceNormalizeProduct(
        candidate.product,
      );

      return (
        stateProduct === ROADMAP_WORKSPACE_ALL ||
        candidateProduct === stateProduct
      );
    }) ||
    candidates[0];

  /*
   * =====================================================
   * ACTIVIDADES / TAREAS
   * =====================================================
   *
   * DATA.roadmapItemActivities es la fuente
   * de verdad para el detalle.
   *
   * Para discurso-personalizado sabemos ya
   * que aquí existen 78 filas.
   */
  const activityRows = Array.isArray(DATA?.roadmapItemActivities)
    ? DATA.roadmapItemActivities
    : [];

  const itemProduct = roadmapWorkspaceNormalizeProduct(item.product);

  const itemCountry = String(item.country || "")
    .trim()
    .toUpperCase();

  const activities = activityRows
    .filter((activity) => {
      const activityItemId = String(activity?.itemId || "").trim();

      if (activityItemId !== normalizedItemId) {
        return false;
      }

      const activityProgramId = String(activity?.programId || "").trim();

      if (activityProgramId && activityProgramId !== normalizedProgramId) {
        return false;
      }

      const activityProduct = roadmapWorkspaceNormalizeProduct(
        activity?.product || "",
      );

      if (
        itemProduct &&
        itemProduct !== ROADMAP_WORKSPACE_ALL &&
        activityProduct &&
        activityProduct !== itemProduct
      ) {
        return false;
      }

      const activityCountry = String(activity?.country || "")
        .trim()
        .toUpperCase();

      if (itemCountry && activityCountry && activityCountry !== itemCountry) {
        return false;
      }

      return true;
    })
    .map((activity) => {
      if (typeof adaptRoadmapItemActivity === "function") {
        return adaptRoadmapItemActivity(activity);
      }

      return {
        ...activity,

        id: String(activity.activityId || "").trim(),

        activityId: String(activity.activityId || "").trim(),

        itemId: normalizedItemId,

        activityName: activity.activityName || "Actividad",

        phaseName: activity.activityName || "Actividad",

        order: Number(activity.order) || 0,
      };
    })
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0));

  /*
   * Sólo utilizamos las actividades ya
   * incluidas en el item como fallback.
   */
  const embeddedActivities =
    Array.isArray(item.activities) && item.activities.length
      ? item.activities
      : Array.isArray(item.phases)
        ? item.phases
        : [];

  const effectiveActivities = activities.length
    ? activities
    : embeddedActivities;

  return {
    ...item,

    activities: effectiveActivities,

    phases: effectiveActivities,
  };
}

function renderRoadmapWorkspaceDetail(routeContext) {
  const program = roadmapWorkspaceGetProgram(routeContext.programId);
  const state = roadmapWorkspaceState(routeContext.programId);

  state.view = ROADMAP_WORKSPACE_VIEWS.has(routeContext.viewName)
    ? routeContext.viewName
    : "summary";
  state.productId = roadmapWorkspaceNormalizeProduct(routeContext.productId);
  state.quarter = roadmapWorkspaceValidQuarter(routeContext.quarter);

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
  );

  if (!program || !item) {
    route(backRoute);
    return;
  }

  setHead(
    item.title,
    `${item.typeLabel || item.type} · ${roadmapWorkspaceCountryLabel()}`,
    `Retail Client Solutions > ${program.name || routeContext.programId} > Roadmap > ${item.title}`,
  );

  renderRoadmapItemDetailView(item, {
    route: backRoute,
    label: "Volver al roadmap",
    activityRouteBase: roadmapWorkspaceActivityRouteBase(
      routeContext.programId,
      state,
      item,
    ),
  });
}

function renderRoadmapWorkspaceActivity(routeContext) {
  const program = roadmapWorkspaceGetProgram(routeContext.programId);
  const state = roadmapWorkspaceState(routeContext.programId);

  state.view = ROADMAP_WORKSPACE_VIEWS.has(routeContext.viewName)
    ? routeContext.viewName
    : "summary";
  state.productId = roadmapWorkspaceNormalizeProduct(routeContext.productId);
  state.quarter = roadmapWorkspaceValidQuarter(routeContext.quarter);

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

  setHead(
    activity.activityName,
    `${item.title} · ${roadmapWorkspaceCountryLabel()}`,
    `Retail Client Solutions > ${program.name || routeContext.programId} > Roadmap > ${item.title} > ${activity.activityName}`,
  );

  renderRoadmapActivityTasksView(item, activity, {
    route: detailRoute,
    label: "Volver al roadmap de actividades",
  });
}
