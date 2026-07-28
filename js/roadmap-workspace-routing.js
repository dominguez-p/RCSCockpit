const roadmapWorkspaceBaseRenderCurrentRoute = renderCurrentRoute;

renderCurrentRoute = function renderRouteWithRoadmapWorkspace(
  routeName,
  programId,
  productId = null,
  quarter = null,
  itemType = null,
  itemId = null,
  activityId = null,
) {
  const context = roadmapWorkspaceParseRoute();

  if (routeName === "roadmap") {
    if (ROADMAP_WORKSPACE_VIEWS.has(String(context.viewName || "").toLowerCase())) {
      renderRoadmapWorkspace(programId, context);
      return;
    }

    renderRoadmapWorkspace(programId, {
      ...context,
      viewName: "timeline",
      productId: context.viewName || productId || ROADMAP_WORKSPACE_ALL,
      quarter: context.productId || quarter || ROADMAP_WORKSPACE_ALL,
    });
    return;
  }

  if (routeName === "roadmap-workspace-detail") {
    renderRoadmapWorkspaceDetail(context);
    return;
  }

  if (routeName === "roadmap-workspace-activity") {
    renderRoadmapWorkspaceActivity(context);
    return;
  }

  if (routeName === "roadmap-detail") {
    renderRoadmapWorkspaceDetail({
      routeName,
      programId,
      viewName: "timeline",
      productId,
      quarter,
      itemType,
      itemId,
    });
    return;
  }

  if (routeName === "roadmap-activity") {
    renderRoadmapWorkspaceActivity({
      routeName,
      programId,
      viewName: "timeline",
      productId,
      quarter,
      itemType,
      itemId,
      activityId,
    });
    return;
  }

  roadmapWorkspaceBaseRenderCurrentRoute(
    routeName,
    programId,
    productId,
    quarter,
    itemType,
    itemId,
    activityId,
  );
};

const roadmapWorkspaceRoadmapModule = PROGRAM_HOME_CORE_MODULES.find(
  (module) => module.id === "roadmap",
);

if (roadmapWorkspaceRoadmapModule) {
  roadmapWorkspaceRoadmapModule.route = (programId) =>
    roadmapWorkspaceRoute(
      programId,
      "summary",
      ROADMAP_WORKSPACE_ALL,
      ROADMAP_WORKSPACE_ALL,
    );
}

programHomeRenderProducts = function renderProductsForRoadmapWorkspace(
  programId,
  context,
) {
  if (programId !== "aixbanker" || !context.products.length) {
    return "";
  }

  return `
    <section class="program-home-section">
      <header class="program-home-section-header">
        <div>
          <span>Productos</span>
          <h2>Selecciona el ámbito del roadmap</h2>
        </div>

        <p>
          Cada producto abre el cronograma filtrado. El acceso general a Roadmap
          abre primero el resumen funcional y técnico.
        </p>
      </header>

      <div class="program-home-product-grid">
        ${context.products
          .map((product) => {
            const roadmapCount = context.roadmapItems.filter(
              (item) => programHomeNormalizeProduct(item.product) === product.id,
            ).length;
            const systemsCount = context.systems.filter(
              (item) => programHomeNormalizeProduct(item.product) === product.id,
            ).length;

            return `
              <article
                class="program-home-product-card"
                data-route="${roadmapWorkspaceEscape(
                  roadmapWorkspaceRoute(
                    programId,
                    "timeline",
                    product.id,
                    getCurrentQuarter(),
                  ),
                )}"
              >
                <span>Producto</span>
                <h3>${programHomeEscape(product.label)}</h3>
                <p>
                  ${roadmapCount} elementos de roadmap ·
                  ${systemsCount} elementos de sistema
                </p>
                <strong>Abrir cronograma →</strong>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
};

document.addEventListener("change", (event) => {
  const productSelect = event.target.closest("[data-roadmap-workspace-product]");

  if (!productSelect) {
    return;
  }

  const programId = productSelect.dataset.roadmapWorkspaceProduct;
  const state = roadmapWorkspaceState(programId);
  state.productId = roadmapWorkspaceNormalizeProduct(productSelect.value);

  route(
    roadmapWorkspaceRoute(
      programId,
      state.view,
      state.productId,
      state.view === "backlog" ? ROADMAP_WORKSPACE_ALL : state.quarter,
    ),
  );
});

document.addEventListener("click", (event) => {
  const quarterButton = event.target.closest("[data-roadmap-workspace-quarter]");

  if (!quarterButton) {
    return;
  }

  const programId = quarterButton.dataset.programId;
  const state = roadmapWorkspaceState(programId);
  state.quarter = roadmapWorkspaceValidQuarter(
    quarterButton.dataset.roadmapWorkspaceQuarter,
  );

  route(
    roadmapWorkspaceRoute(programId, state.view, state.productId, state.quarter),
  );
});

document.addEventListener("click", (event) => {
  const metricButton = event.target.closest("[data-roadmap-summary-metric]");

  if (!metricButton) {
    return;
  }

  const context = roadmapWorkspaceParseRoute();
  const state = roadmapWorkspaceState(context.programId);
  state.summaryMetric = metricButton.dataset.roadmapSummaryMetric;

  renderRoadmapWorkspace(context.programId, context);
});

document.addEventListener(
  "click",
  (event) => {
    const detailButton = event.target.closest("[data-roadmap-detail-type]");

    if (!detailButton) {
      return;
    }

    const context = roadmapWorkspaceParseRoute();

    if (context.routeName !== "roadmap") {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const state = roadmapWorkspaceState(context.programId);
    const item = roadmapWorkspaceFindItem(
      context.programId,
      detailButton.dataset.roadmapDetailType,
      detailButton.dataset.roadmapDetailId,
    );

    if (!item) {
      return;
    }

    route(roadmapWorkspaceDetailRoute(context.programId, state, item));
  },
  true,
);
