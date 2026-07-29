function roadmapAmbitionRenderBadges(item, options = {}) {
  const primaryId = roadmapAmbitionPrimaryId(item);
  const secondaryIds = roadmapAmbitionSecondaryIds(item);
  const ambitionIds = [primaryId, ...secondaryIds].filter(Boolean);

  if (!ambitionIds.length) {
    return options.showUnassigned
      ? `
          <div class="roadmap-ambition-badges">
            <span class="roadmap-ambition-badge is-unassigned">
              Sin ambición asignada
            </span>
          </div>
        `
      : "";
  }

  return `
    <div class="roadmap-ambition-badges" aria-label="Ambiciones RCS relacionadas">
      ${ambitionIds
        .map((ambitionId, index) => {
          const ambition = roadmapAmbitionGet(ambitionId);

          if (!ambition) {
            return "";
          }

          return `
            <span
              class="roadmap-ambition-badge ${index === 0 ? "is-primary" : "is-secondary"}"
              title="${roadmapWorkspaceEscape(ambition.title)}"
            >
              ${roadmapWorkspaceEscape(
                `${String(ambition.order).padStart(2, "0")} · ${ambition.title}`,
              )}
            </span>
          `;
        })
        .join("")}
    </div>
  `;
}

function roadmapAmbitionFilterLabel(ambitionId) {
  const validAmbitionId = roadmapAmbitionValidFilter(ambitionId);

  if (validAmbitionId === ROADMAP_AMBITION_ALL) {
    return "Todas las ambiciones";
  }

  if (validAmbitionId === ROADMAP_AMBITION_UNASSIGNED) {
    return "Sin ambición asignada";
  }

  return roadmapAmbitionGet(validAmbitionId)?.title || "Todas las ambiciones";
}

const roadmapAmbitionsBaseRenderFilters = roadmapWorkspaceRenderFilters;
roadmapWorkspaceRenderFilters = function renderFiltersWithAmbition(
  programId,
  items,
  state,
) {
  const baseMarkup = roadmapAmbitionsBaseRenderFilters(programId, items, state);
  const selectedAmbition = roadmapAmbitionValidFilter(
    state.ambitionId || ROADMAP_AMBITION_ALL,
  );
  const ambitionFilter = `
    <label class="roadmap-workspace-filter-group roadmap-ambition-filter-group">
      <span>Ambición RCS</span>
      <select data-roadmap-ambition-filter="${roadmapWorkspaceEscape(programId)}">
        <option
          value="${ROADMAP_AMBITION_ALL}"
          ${selectedAmbition === ROADMAP_AMBITION_ALL ? "selected" : ""}
        >
          Todas las ambiciones
        </option>

        ${ROADMAP_RCS_AMBITIONS.map(
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
        ).join("")}

        <option
          value="${ROADMAP_AMBITION_UNASSIGNED}"
          ${selectedAmbition === ROADMAP_AMBITION_UNASSIGNED ? "selected" : ""}
        >
          Sin ambición asignada
        </option>
      </select>
    </label>
  `;

  return baseMarkup.replace(
    /<\/section>\s*$/,
    `${ambitionFilter}</section>`,
  );
};

function roadmapAmbitionRenderCoverageButton(
  programId,
  state,
  ambitionId,
  label,
  count,
  options = {},
) {
  const selectedAmbition = roadmapAmbitionValidFilter(state.ambitionId);
  const isActive = selectedAmbition === ambitionId;

  return `
    <button
      class="roadmap-ambition-coverage-card ${isActive ? "active" : ""} ${
        options.unassigned ? "is-unassigned" : ""
      }"
      type="button"
      data-roadmap-ambition-card="${roadmapWorkspaceEscape(ambitionId)}"
      data-program-id="${roadmapWorkspaceEscape(programId)}"
      aria-pressed="${isActive ? "true" : "false"}"
    >
      ${
        options.order
          ? `<span>${roadmapWorkspaceEscape(String(options.order).padStart(2, "0"))}</span>`
          : `<span>—</span>`
      }
      <strong>${roadmapWorkspaceEscape(label)}</strong>
      <em>${count}</em>
    </button>
  `;
}

function roadmapAmbitionRenderCoverage(programId, items, state) {
  const coverage = roadmapAmbitionCoverage(items);

  return `
    <section class="roadmap-ambition-coverage">
      <header class="roadmap-ambition-coverage-header">
        <div>
          <span>Trazabilidad estratégica</span>
          <h3>Contribución a las ambiciones RCS</h3>
          <p>
            Selecciona una ambición para filtrar el resumen, el cronograma y el backlog.
          </p>
        </div>

        <div class="roadmap-ambition-coverage-kpis">
          <article>
            <span>Cobertura</span>
            <strong>${coverage.percentage}%</strong>
          </article>
          <article>
            <span>Con ambición</span>
            <strong>${coverage.linked}</strong>
          </article>
          <article>
            <span>Sin asignar</span>
            <strong>${coverage.unassigned}</strong>
          </article>
        </div>
      </header>

      <div class="roadmap-ambition-coverage-grid">
        ${ROADMAP_RCS_AMBITIONS.map((ambition) =>
          roadmapAmbitionRenderCoverageButton(
            programId,
            state,
            ambition.id,
            ambition.title,
            coverage.byAmbition.get(ambition.id) || 0,
            { order: ambition.order },
          ),
        ).join("")}

        ${roadmapAmbitionRenderCoverageButton(
          programId,
          state,
          ROADMAP_AMBITION_UNASSIGNED,
          "Sin ambición asignada",
          coverage.unassigned,
          { unassigned: true },
        )}
      </div>

      <p class="roadmap-ambition-active-filter">
        Filtro activo:
        <strong>${roadmapWorkspaceEscape(
          roadmapAmbitionFilterLabel(state.ambitionId),
        )}</strong>
      </p>
    </section>
  `;
}

const roadmapAmbitionsBaseRenderSummary = roadmapWorkspaceRenderSummary;
roadmapWorkspaceRenderSummary = function renderSummaryWithAmbitions(
  programId,
  items,
  state,
) {
  const scopeItems = roadmapAmbitionScopeItems(items, state);

  return `
    ${roadmapAmbitionRenderCoverage(programId, scopeItems, state)}
    ${roadmapAmbitionsBaseRenderSummary(programId, items, state)}
  `;
};

const roadmapAmbitionsBaseRenderItemCard = roadmapWorkspaceRenderItemCard;
roadmapWorkspaceRenderItemCard = function renderItemCardWithAmbitions(
  item,
  programId,
  state,
  options = {},
) {
  const baseMarkup = roadmapAmbitionsBaseRenderItemCard(
    item,
    programId,
    state,
    options,
  );
  const badges = roadmapAmbitionRenderBadges(item, {
    showUnassigned: true,
  });

  return baseMarkup.replace(
    /(<h4>)/,
    `${badges}$1`,
  );
};

function roadmapAmbitionRenderDetail(item) {
  const ambitionIds = roadmapAmbitionAllIds(item);
  const expectedContribution = roadmapAmbitionExpectedContribution(item);
  const strategicOutcome = roadmapAmbitionStrategicOutcome(item);
  const evidence = roadmapAmbitionEvidence(item);

  return `
    <section class="roadmap-ambition-detail-section">
      <header>
        <div>
          <span>Contribución estratégica</span>
          <h3>Ambiciones RCS</h3>
        </div>
        <strong>${ambitionIds.length}</strong>
      </header>

      ${roadmapAmbitionRenderBadges(item, { showUnassigned: true })}

      <div class="roadmap-ambition-detail-grid">
        <article>
          <span>Contribución esperada</span>
          <p>${roadmapWorkspaceEscape(
            expectedContribution || "No informada.",
          )}</p>
        </article>

        <article>
          <span>Resultado estratégico</span>
          <p>${roadmapWorkspaceEscape(
            strategicOutcome || "No informado.",
          )}</p>
        </article>

        <article>
          <span>Evidencia</span>
          <p>${roadmapWorkspaceEscape(evidence || "No informada.")}</p>
        </article>
      </div>
    </section>
  `;
}

const roadmapAmbitionsBaseRenderRoadmapItemDetailView =
  renderRoadmapItemDetailView;
renderRoadmapItemDetailView = function renderRoadmapItemDetailWithAmbitions(
  roadmapItem,
  navigation,
) {
  roadmapAmbitionsBaseRenderRoadmapItemDetailView(roadmapItem, navigation);

  const detailPanel = view.querySelector(".project-detail-panel");
  const phaseSection = detailPanel?.querySelector(".phase-section");

  if (!detailPanel) {
    return;
  }

  const markup = roadmapAmbitionRenderDetail(roadmapItem);

  if (phaseSection) {
    phaseSection.insertAdjacentHTML("beforebegin", markup);
  } else {
    detailPanel.insertAdjacentHTML("beforeend", markup);
  }
};

const roadmapAmbitionsBaseRenderWorkspaceDetail = renderRoadmapWorkspaceDetail;
renderRoadmapWorkspaceDetail = function renderWorkspaceDetailWithAmbitionState(
  routeContext,
) {
  const state = roadmapWorkspaceState(routeContext.programId);
  state.ambitionId = roadmapAmbitionValidFilter(
    routeContext.ambitionId || state.ambitionId,
  );

  return roadmapAmbitionsBaseRenderWorkspaceDetail(routeContext);
};

const roadmapAmbitionsBaseRenderWorkspaceActivity =
  renderRoadmapWorkspaceActivity;
renderRoadmapWorkspaceActivity = function renderWorkspaceActivityWithAmbitionState(
  routeContext,
) {
  const state = roadmapWorkspaceState(routeContext.programId);
  state.ambitionId = roadmapAmbitionValidFilter(
    routeContext.ambitionId || state.ambitionId,
  );

  return roadmapAmbitionsBaseRenderWorkspaceActivity(routeContext);
};

document.addEventListener("change", (event) => {
  const filter = event.target.closest("[data-roadmap-ambition-filter]");

  if (!filter) {
    return;
  }

  const programId = filter.dataset.roadmapAmbitionFilter;
  const state = roadmapWorkspaceState(programId);
  state.ambitionId = roadmapAmbitionValidFilter(filter.value);

  route(
    roadmapWorkspaceRoute(
      programId,
      state.view,
      state.productId,
      state.view === "backlog" ? ROADMAP_WORKSPACE_ALL : state.quarter,
      state.ambitionId,
    ),
  );
});

document.addEventListener("click", (event) => {
  const card = event.target.closest("[data-roadmap-ambition-card]");

  if (!card) {
    return;
  }

  const programId = card.dataset.programId;
  const state = roadmapWorkspaceState(programId);
  const requestedAmbition = roadmapAmbitionValidFilter(
    card.dataset.roadmapAmbitionCard,
  );

  state.ambitionId =
    state.ambitionId === requestedAmbition
      ? ROADMAP_AMBITION_ALL
      : requestedAmbition;

  route(
    roadmapWorkspaceRoute(
      programId,
      state.view,
      state.productId,
      state.quarter,
      state.ambitionId,
    ),
  );
});
