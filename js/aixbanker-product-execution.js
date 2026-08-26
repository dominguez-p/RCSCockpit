(function installAIxBankerProductExecution(global) {
  "use strict";

  const loadingByProgram = new Map();
  const loadedPrograms = new Set();

  function text(value) {
    return String(value ?? "").trim();
  }

  function esc(value) {
    if (typeof global.rcsEsc === "function") {
      return global.rcsEsc(text(value));
    }

    return text(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function slug(value) {
    return text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function list(value) {
    if (Array.isArray(value)) {
      return [...new Set(value.map(slug).filter(Boolean))];
    }

    return [
      ...new Set(
        text(value)
          .split(/[|,;\n]+/)
          .map(slug)
          .filter(Boolean),
      ),
    ];
  }

  function status(value) {
    const token = text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (["deployed", "accepted", "done", "closed"].includes(token)) {
      return {
        id: "done",
        label: text(value) || "Deployed",
      };
    }

    if (token === "blocked") {
      return {
        id: "blocked",
        label: text(value) || "Blocked",
      };
    }

    if (
      ["in progress", "execution", "analysing", "ready to verify"].includes(
        token,
      )
    ) {
      return {
        id: "progress",
        label: text(value) || "In Progress",
      };
    }

    if (token === "ready") {
      return {
        id: "ready",
        label: text(value) || "Ready",
      };
    }

    if (["new", "backlog", "to do", "planned"].includes(token)) {
      return {
        id: "new",
        label: text(value) || "New",
      };
    }

    if (token === "discarded") {
      return {
        id: "discarded",
        label: text(value) || "Discarded",
      };
    }

    return {
      id: "neutral",
      label: text(value) || "Sin estado",
    };
  }

  function trackOf(item) {
    const raw = text(item?.track).toLowerCase();

    if (["functional", "technical"].includes(raw)) {
      return raw;
    }

    if (text(item?.type).toLowerCase() === "msa") {
      return "technical";
    }

    if (typeof global.roadmapWorkspaceTrack === "function") {
      const resolved = text(global.roadmapWorkspaceTrack(item)).toLowerCase();

      if (["functional", "technical"].includes(resolved)) {
        return resolved;
      }
    }

    return "functional";
  }

  function capabilityIdsOf(item) {
    const direct = list(item?.capabilityIds || item?.capabilityId);

    if (direct.length) {
      return direct;
    }

    const entries = Array.isArray(item?.capabilityGroupEntries)
      ? item.capabilityGroupEntries
      : [];

    return [
      ...new Set(entries.map((entry) => slug(entry?.id)).filter(Boolean)),
    ];
  }

  function normalizeFeature(row) {
    const product = slug(row?.product);

    const country = text(row?.country).toUpperCase();

    const mappingStatus = text(row?.mappingStatus).toLowerCase();

    const rawStatus = text(row?.statusRaw || row?.status);

    const progressNumber = Number(row?.progress);

    const progress = Number.isFinite(progressNumber)
      ? Math.max(0, Math.min(100, progressNumber))
      : 0;

    return {
      source: row,

      id: text(row?.jiraKey || row?.id || row?.sourceFeatureKey),

      title: text(row?.name || row?.summary || row?.jiraKey || "Feature JIRA"),

      product,

      country,

      capabilityIds: capabilityIdsOf(row),

      track: trackOf(row),

      mappingStatus,

      status: status(rawStatus),

      progress,

      blockedIssues: Math.max(0, Number(row?.blockedIssues || 0) || 0),

      totalStories: Math.max(0, Number(row?.totalStories || 0) || 0),

      priority: text(row?.priority),

      containerName: text(row?.containerName || row?.workspaceName),
    };
  }

  function renderTimelineItems(items, quarter) {
    if (!items.length) {
      return `
      <p class="aix-exec-empty">
        Sin elementos del plan para este carril.
      </p>
    `;
    }

    if (
      typeof global.getRoadmapPeriod !== "function" ||
      typeof global.getRoadmapItemLayout !== "function" ||
      typeof global.renderRoadmapMonths !== "function"
    ) {
      return `
      <p class="aix-exec-empty">
        No está disponible el motor temporal del roadmap.
      </p>
    `;
    }

    const period = global.getRoadmapPeriod(quarter);

    const planned = [];
    const undated = [];

    items.forEach((item) => {
      const layout = global.getRoadmapItemLayout(item, period);

      if (!layout?.hasDates) {
        undated.push(item);

        return;
      }

      if (layout.isVisible) {
        planned.push({
          item,
          layout,
        });
      }
    });

    /*
     * =====================================================
     * HOY
     * =====================================================
     *
     * La posición se calcula exclusivamente dentro del
     * área temporal. Es el mismo sistema de coordenadas
     * que utilizan layout.left y layout.width.
     */
    const today = new Date();

    today.setHours(12, 0, 0, 0);

    const fallbackYear = Number(period?.year) || today.getFullYear();

    const periodStart = new Date(
      period.startDate || period.start || `${fallbackYear}-01-01T12:00:00`,
    );

    const periodEnd = new Date(
      period.endDate || period.end || `${fallbackYear}-12-31T12:00:00`,
    );

    periodStart.setHours(12, 0, 0, 0);

    periodEnd.setHours(12, 0, 0, 0);

    const todayTime = today.getTime();

    const startTime = periodStart.getTime();

    const endTime = periodEnd.getTime();

    const duration = endTime - startTime;

    const showToday =
      Number.isFinite(startTime) &&
      Number.isFinite(endTime) &&
      duration > 0 &&
      todayTime >= startTime &&
      todayTime <= endTime;

    const todayLeft = showToday
      ? Math.max(0, Math.min(100, ((todayTime - startTime) / duration) * 100))
      : 0;

    const todayLabel = new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
      .format(today)
      .replace(/\./g, "");

    return `
    <div class="aix-exec-timeline">
      <div class="aix-exec-scale">
        <span>Plan</span>

        <div
          class="aix-exec-months"
          style="--roadmap-month-count:${period.months.length}"
        >
          ${global.renderRoadmapMonths(period)}

          ${
            showToday
              ? `
                <div
                  class="aix-exec-today-header"
                  style="left:${todayLeft}%"
                  aria-label="Hoy · ${esc(todayLabel)}"
                >
                  <span>
                    Hoy · ${esc(todayLabel)}
                  </span>
                </div>
              `
              : ""
          }
        </div>
      </div>

      <div class="aix-exec-timeline-rows">
        ${
          planned.length
            ? planned
                .map(({ item, layout }) => {
                  const effectiveStatus =
                    typeof global.rcsNormalizeStatus === "function"
                      ? global.rcsNormalizeStatus(item?.status)
                      : text(item?.status) || "pending";

                  const type = text(item?.type || "item").toLowerCase();

                  const label = text(
                    item?.title || item?.name || item?.initiative || "Elemento",
                  );

                  const itemType = text(
                    item?.typeLabel || item?.type || "Plan",
                  );

                  const progress = Math.max(
                    0,
                    Math.min(100, Number(item?.progress || 0) || 0),
                  );

                  return `
                      <div class="aix-exec-timeline-row">
                        <div class="aix-exec-timeline-label">
                          <small>
                            ${esc(itemType)}
                          </small>

                          <strong>
                            ${esc(label)}
                          </strong>
                        </div>

                        <div class="aix-exec-timeline-track">
                          ${
                            showToday
                              ? `
                                <span
                                  class="aix-exec-today-line"
                                  style="left:${todayLeft}%"
                                  aria-hidden="true"
                                ></span>
                              `
                              : ""
                          }

                          <span
                            class="aix-exec-plan-bar aix-exec-plan-${esc(
                              type,
                            )} status-${esc(effectiveStatus)}"
                            style="left:${layout.left}%;width:${layout.width}%"
                            title="${esc(label)}"
                          >
                            ${
                              type === "msa" && item?.jiraCurrentStatus
                                ? esc(item.jiraCurrentStatus)
                                : `${esc(progress)}%`
                            }
                          </span>
                        </div>
                      </div>
                    `;
                })
                .join("")
            : `
              <p class="aix-exec-empty">
                Sin elementos con fechas dentro del periodo seleccionado.
              </p>
            `
        }
      </div>

      ${
        undated.length
          ? `
            <div class="aix-exec-undated">
              <span>
                Plan sin fecha
              </span>

              ${undated
                .map(
                  (item) => `
                    <small>
                      ${esc(
                        item?.title ||
                          item?.name ||
                          item?.initiative ||
                          "Elemento",
                      )}
                    </small>
                  `,
                )
                .join("")}
            </div>
          `
          : ""
      }
    </div>
  `;
  }

  function renderLane(label, track, internalItems, features, quarter) {
    const laneItems = internalItems.filter((item) => trackOf(item) === track);

    const laneFeatures = features.filter((feature) => feature.track === track);

    if (!laneItems.length && !laneFeatures.length) {
      return "";
    }

    const blockedFeatures = laneFeatures.filter(
      (feature) => feature.status.id === "blocked",
    ).length;

    const activeFeatures = laneFeatures.filter((feature) =>
      ["progress", "ready", "new", "blocked", "neutral"].includes(
        feature.status.id,
      ),
    ).length;

    return `
      <section
        class="aix-exec-lane aix-exec-lane-${esc(track)}"
      >
        <header class="aix-exec-lane-header">
          <div>
            <span>
              ${esc(
                track === "functional" ? "Carril funcional" : "Carril técnico",
              )}
            </span>

            <h4>
              ${esc(label)}
            </h4>
          </div>

          <div>
            <strong>
              ${laneItems.length}
            </strong>

            ${
              laneFeatures.length
                ? `
                  <small>
                    ${laneFeatures.length} Features JIRA ·
                    ${activeFeatures} activas ·
                    ${blockedFeatures} bloqueadas
                  </small>
                `
                : ""
            }
          </div>
        </header>

        ${renderTimelineItems(laneItems, quarter)}
      </section>
    `;
  }

  function render(options) {
    const productId = slug(options?.productId);

    const countryId = text(options?.countryId).toUpperCase();

    const quarter = text(options?.quarter || "ALL") || "ALL";

    const capabilities = Array.isArray(options?.capabilities)
      ? options.capabilities
      : [];

    const internalItems = Array.isArray(options?.internalItems)
      ? options.internalItems
      : [];

    const features = (
      Array.isArray(options?.featureRows) ? options.featureRows : []
    )
      .map(normalizeFeature)
      .filter(
        (feature) =>
          feature.product === productId &&
          feature.country === countryId &&
          feature.mappingStatus === "mapped" &&
          feature.capabilityIds.length,
      );

    const groups = capabilities
      .map((capability) => {
        const id = slug(
          capability?.id || capability?.capabilityId || capability?.name,
        );

        const name = text(capability?.name || capability?.capabilityName || id);

        const scopedInternal = internalItems.filter((item) =>
          capabilityIdsOf(item).includes(id),
        );

        const scopedFeatures = features.filter((feature) =>
          feature.capabilityIds.includes(id),
        );

        return {
          id,
          name,
          internalItems: scopedInternal,
          features: scopedFeatures,
        };
      })
      .filter(
        (group) =>
          group.id && (group.internalItems.length || group.features.length),
      );

    const featureCount = features.length;

    const blockedCount = features.filter(
      (feature) => feature.status.id === "blocked",
    ).length;

    const activeCount = features.filter((feature) =>
      ["progress", "ready", "new", "blocked", "neutral"].includes(
        feature.status.id,
      ),
    ).length;

    return `
      <section class="product-experience-section aix-exec-roadmap">
        <header class="product-experience-section-header product-experience-timeline-header">
          <div>
            <span class="product-experience-eyebrow">
              Roadmap del producto
            </span>

            <h2>
              Cronograma por capacidad funcional
            </h2>
          </div>

          <p>
            Plan interno + MSAs JIRA + Features JIRA ·
            ${featureCount} features ·
            ${activeCount} activas ·
            ${blockedCount} bloqueadas.
          </p>
        </header>

        <div
          class="aix-exec-source-legend"
          aria-label="Orígenes del cronograma"
        >
          <span>
            <i class="is-internal"></i>
            Plan interno
          </span>

          <span>
            <i class="is-msa"></i>
            MSA JIRA
          </span>

          <span>
            <i class="is-feature"></i>
            Feature JIRA
          </span>
        </div>

        ${
          groups.length
            ? groups
                .map(
                  (group) => `
                    <section
                      class="aix-exec-capability"
                      data-capability="${esc(group.id)}"
                    >
                      <header class="aix-exec-capability-header">
                        <div>
                          <span>
                            Capacidad funcional
                          </span>

                          <h3>
                            ${esc(group.name)}
                          </h3>
                        </div>

                        <strong>
                          ${group.internalItems.length}
                        </strong>
                      </header>

                      ${renderLane(
                        group.name,
                        "functional",
                        group.internalItems,
                        group.features,
                        quarter,
                      )}

                      ${renderLane(
                        group.name,
                        "technical",
                        group.internalItems,
                        group.features,
                        quarter,
                      )}
                    </section>
                  `,
                )
                .join("")
            : `
              <p class="aix-exec-empty">
                No hay elementos mapeados a capacidades para esta selección.
              </p>
            `
        }
      </section>
    `;
  }

  async function ensureFeatures(options) {
    const programId = text(options?.programId);

    const featureRows = Array.isArray(options?.featureRows)
      ? options.featureRows
      : [];

    if (!programId || featureRows.length || loadedPrograms.has(programId)) {
      return false;
    }

    if (loadingByProgram.has(programId)) {
      await loadingByProgram.get(programId);

      return false;
    }

    if (
      typeof options?.load !== "function" ||
      typeof options?.install !== "function"
    ) {
      return false;
    }

    const request = Promise.resolve()
      .then(() => options.load(programId))
      .then((payload) => {
        options.install(programId, payload);

        loadedPrograms.add(programId);

        return true;
      })
      .finally(() => loadingByProgram.delete(programId));

    loadingByProgram.set(programId, request);

    return request;
  }

  global.AIxBankerProductExecution = Object.freeze({
    ensureFeatures,
    render,
  });
})(window);
