function roadmapWorkspaceRenderTimelineLane(track, items, state) {
  const laneTitle =
    track === "technical" ? "Carril técnico" : "Carril funcional";

  const today = roadmapWorkspaceTodayContext(state.quarter);

  const timelineItems = roadmapWorkspaceSort(
    items.filter(
      (item) =>
        roadmapWorkspaceTrack(item) === track &&
        roadmapWorkspaceHasPlanning(item),
    ),
  );

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
        class="
          roadmap-workspace-lane-header
        "
      >
        <div>
          <span>
            ${laneTitle}
          </span>

          <h3>
            ${
              track === "technical"
                ? "MSAs, plataforma y habilitadores"
                : "Proyectos, pilotos e iniciativas"
            }
          </h3>
        </div>

        <strong>
          ${timelineItems.length}
        </strong>
      </header>

      ${
        timelineItems.length
          ? renderRoadmapTimeline(timelineItems, state.quarter, {
              groupByCapability: state?.groupByCapability === true,
            })
          : `
              <section
                class="panel"
              >
                <p
                  class="empty-state"
                >
                  No hay elementos
                  planificados en este
                  carril y periodo.
                </p>
              </section>
            `
      }
    </section>
  `;
}
function roadmapWorkspaceRenderTimeline(programId, items, state) {
  const filtered = roadmapWorkspaceFilteredItems(items, state).filter(
    roadmapWorkspaceHasPlanning,
  );

  return `
    <section class="roadmap-workspace-view roadmap-workspace-timeline-view">
      <section class="aixbanker-roadmap-legend" aria-label="Tipos de elemento">
        <span class="aixbanker-roadmap-legend-item"><i class="roadmap-type-project"></i>Proyecto</span>
        <span class="aixbanker-roadmap-legend-item"><i class="roadmap-type-msa"></i>MSA</span>
        <span class="aixbanker-roadmap-legend-item"><i class="roadmap-type-poc"></i>PoC</span>
        <span class="aixbanker-roadmap-legend-item"><i class="roadmap-type-initiative"></i>Iniciativa</span>
        <span class="aixbanker-roadmap-legend-item"><i class="roadmap-type-epic"></i>Epic</span>
      </section>

      ${roadmapWorkspaceRenderTimelineLane("functional", filtered, state)}
      ${roadmapWorkspaceRenderTimelineLane("technical", filtered, state)}
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
  return roadmapWorkspaceItemsForProgram(programId).find(
    (item) =>
      String(item.type || "").trim() === String(itemType || "").trim() &&
      String(item.id || "").trim() === String(itemId || "").trim(),
  );
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
