function roadmapWorkspaceRenderTabs(programId, state) {
  const views = [
    {
      id: "summary",
      label: "Resumen",
      description: "Carriles funcional y técnico",
    },
    {
      id: "timeline",
      label: "Cronograma",
      description: "Planificación temporal",
    },
    {
      id: "backlog",
      label: "Backlog",
      description: "Sin planificación",
    },
  ];

  return `
    <nav class="roadmap-workspace-tabs" aria-label="Vistas del roadmap">
      ${views
        .map(
          (view) => `
            <button
              class="roadmap-workspace-tab ${state.view === view.id ? "active" : ""}"
              type="button"
              data-route="${roadmapWorkspaceEscape(
                roadmapWorkspaceRoute(
                  programId,
                  view.id,
                  state.productId,
                  view.id === "backlog" ? ROADMAP_WORKSPACE_ALL : state.quarter,
                ),
              )}"
              aria-pressed="${state.view === view.id ? "true" : "false"}"
            >
              <strong>${roadmapWorkspaceEscape(view.label)}</strong>
              <span>${roadmapWorkspaceEscape(view.description)}</span>
            </button>
          `,
        )
        .join("")}
    </nav>
  `;
}

function roadmapWorkspaceRenderFilters(programId, items, state) {
  const products = roadmapWorkspaceProducts(items);

  return `
    <section
      class="roadmap-workspace-filters"
      aria-label="Filtros específicos del roadmap"
    >
      <label class="roadmap-workspace-filter-group">
        <span>Producto</span>

        <select
          data-roadmap-workspace-product="${roadmapWorkspaceEscape(programId)}"
        >
          <option
            value="ALL"
            ${state.productId === "ALL" ? "selected" : ""}
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

function roadmapWorkspaceMetricDefinitions(track) {
  if (track === "technical") {
    return [
      { key: "all", label: "Elementos", filter: () => true },
      {
        key: "msa-active",
        label: "MSAs en curso",
        filter: (item) => item.type === "msa" && !roadmapWorkspaceIsDone(item),
      },
      {
        key: "msa-done",
        label: "MSAs entregadas",
        filter: (item) => item.type === "msa" && roadmapWorkspaceIsDone(item),
      },
      {
        key: "projects",
        label: "Proyectos técnicos",
        filter: (item) => item.type === "project",
      },
      {
        key: "risk",
        label: "En riesgo",
        filter: roadmapWorkspaceIsRisk,
      },
      {
        key: "unplanned",
        label: "Sin planificación",
        filter: (item) => !roadmapWorkspaceHasPlanning(item),
      },
    ];
  }

  return [
    { key: "all", label: "Elementos", filter: () => true },
    {
      key: "projects",
      label: "Proyectos",
      filter: (item) => item.type === "project",
    },
    {
      key: "pilots",
      label: "Pilotos / PoCs",
      filter: (item) => ["poc", "pilot", "piloto"].includes(item.type),
    },
    {
      key: "initiatives",
      label: "Iniciativas / Epics",
      filter: (item) => ["initiative", "epic"].includes(item.type),
    },
    {
      key: "risk",
      label: "En riesgo",
      filter: roadmapWorkspaceIsRisk,
    },
    {
      key: "unplanned",
      label: "Sin planificación",
      filter: (item) => !roadmapWorkspaceHasPlanning(item),
    },
  ];
}

function roadmapWorkspaceRenderMetricLane(track, items, state) {
  const definitions = roadmapWorkspaceMetricDefinitions(track);
  const laneTitle =
    track === "technical" ? "Carril técnico" : "Carril funcional";
  const selectedMetric = String(state.summaryMetric || "functional:all");

  return `
    <section class="roadmap-workspace-lane roadmap-workspace-lane-${track}">
      <header>
        <div>
          <span>${laneTitle}</span>
          <h3>${track === "technical" ? "Plataforma y habilitadores" : "Entrega de valor"}</h3>
        </div>
        <strong>${items.length}</strong>
      </header>

      <div class="roadmap-workspace-metric-grid">
        ${definitions
          .map((definition) => {
            const metricId = `${track}:${definition.key}`;
            const count = items.filter(definition.filter).length;

            return `
              <button
                class="roadmap-workspace-metric ${
                  selectedMetric === metricId ? "active" : ""
                }"
                type="button"
                data-roadmap-summary-metric="${metricId}"
              >
                <span>${roadmapWorkspaceEscape(definition.label)}</span>
                <strong>${count}</strong>
              </button>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function roadmapWorkspaceRenderItemCard(item, programId, state, options = {}) {
  const status = roadmapWorkspaceStatus(item);
  const detailRoute = roadmapWorkspaceDetailRoute(programId, state, item);
  const track = roadmapWorkspaceTrack(item);
  const source = item.source || {};
  const reason =
    source.unplannedReason ||
    source.planningReason ||
    source.reasonWithoutPlanning ||
    source.motivoSinPlanificacion ||
    "";

  return `
    <article
      class="roadmap-workspace-item-card clickable-card"
      data-route="${roadmapWorkspaceEscape(detailRoute)}"
      tabindex="0"
      role="link"
    >
      <div class="roadmap-workspace-item-heading">
        <div>
          <span class="roadmap-workspace-track-badge track-${track}">
            ${track === "technical" ? "Técnico" : "Funcional"}
          </span>
          <span class="executive-item-type ${getRoadmapTypeClass(item.type)}">
            ${roadmapWorkspaceEscape(item.typeLabel || item.type || "Elemento")}
          </span>
        </div>

        <span class="status-pill status-${roadmapWorkspaceEscape(status)}">
          ${roadmapWorkspaceEscape(
            typeof rcsStatusLabel === "function"
              ? rcsStatusLabel(status)
              : status,
          )}
        </span>
      </div>

      <h4>${roadmapWorkspaceEscape(item.title || "Elemento sin nombre")}</h4>
      <p>${roadmapWorkspaceEscape(item.summary || item.description || "Sin descripción")}</p>

      <div class="roadmap-workspace-item-meta">
        <span>Owner: ${roadmapWorkspaceEscape(item.owner || "-")}</span>
        <span>Avance: ${roadmapWorkspaceEscape(item.progress || 0)}%</span>
        <span>Producto: ${roadmapWorkspaceEscape(
          item.product
            ? roadmapWorkspaceProductLabel(item.product)
            : "Sin producto",
        )}</span>
      </div>

      ${
        options.showPlanningReason && reason
          ? `
              <small class="roadmap-workspace-planning-reason">
                Motivo: ${roadmapWorkspaceEscape(reason)}
              </small>
            `
          : ""
      }

      <strong class="roadmap-workspace-item-action">Abrir detalle →</strong>
    </article>
  `;
}

function roadmapWorkspaceSummarySelection(items, state) {
  const [track = "functional", metric = "all"] = String(
    state.summaryMetric || "functional:all",
  ).split(":");
  const trackItems = items.filter(
    (item) => roadmapWorkspaceTrack(item) === track,
  );
  const definition =
    roadmapWorkspaceMetricDefinitions(track).find(
      (item) => item.key === metric,
    ) || roadmapWorkspaceMetricDefinitions(track)[0];

  return {
    track,
    label: definition.label,
    items: roadmapWorkspaceSort(trackItems.filter(definition.filter)),
  };
}

function roadmapWorkspaceRenderSummary(programId, items, state) {
  const filtered = roadmapWorkspaceFilteredItems(items, state);
  const functional = filtered.filter(
    (item) => roadmapWorkspaceTrack(item) === "functional",
  );
  const technical = filtered.filter(
    (item) => roadmapWorkspaceTrack(item) === "technical",
  );
  const selection = roadmapWorkspaceSummarySelection(filtered, state);

  return `
    <section class="roadmap-workspace-view">
      <div class="roadmap-workspace-lanes">
        ${roadmapWorkspaceRenderMetricLane("functional", functional, state)}
        ${roadmapWorkspaceRenderMetricLane("technical", technical, state)}
      </div>

      <section class="roadmap-workspace-detail-list">
        <header>
          <div>
            <span>Detalle seleccionado</span>
            <h3>
              ${selection.track === "technical" ? "Carril técnico" : "Carril funcional"}
              · ${roadmapWorkspaceEscape(selection.label)}
            </h3>
          </div>
          <strong>${selection.items.length}</strong>
        </header>

        ${
          selection.items.length
            ? `
                <div class="roadmap-workspace-item-grid">
                  ${selection.items
                    .map((item) =>
                      roadmapWorkspaceRenderItemCard(item, programId, state),
                    )
                    .join("")}
                </div>
              `
            : `<p class="empty-state">No hay elementos para el indicador seleccionado.</p>`
        }
      </section>
    </section>
  `;
}

function roadmapWorkspaceTodayContext(quarter) {
  if (typeof getRoadmapPeriod !== "function") {
    return { visible: false, position: 0 };
  }

  const period = getRoadmapPeriod(quarter);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const visible = today >= period.startDate && today <= period.endDate;
  const position =
    visible && typeof getRoadmapDatePosition === "function"
      ? getRoadmapDatePosition(today, period)
      : 0;

  return { visible, position };
}
