let DATA = window.SAMPLE_DATA;
let selectedCountry = "ES";
let selectedSystemProduct = "blue-buddy";
let selectedCapability = null;
let selectedSystemComponent = null;
let selectedFunctionalItem = null;
let selectedArchitectureGap = null;
let isSystemMapExpanded = false;
let isToBeMapExpanded = false;
let showProgramLocalisms = false;
let isLoadingData = false;
let executiveQuarter = "ALL";
const view = document.querySelector("#view");
const title = document.querySelector("#pageTitle");
const subtitle = document.querySelector("#pageSubtitle");
const crumb = document.querySelector("#breadcrumb");
const statusEl = document.querySelector("#dataStatus");
const COUNTRIES = [
  { id: "ES", label: "España", flagSrc: "assets/flags/es.svg" },
  { id: "MX", label: "México", flagSrc: "assets/flags/mx.svg" },
  { id: "PE", label: "Perú", flagSrc: "assets/flags/pe.svg" },
  { id: "CO", label: "Colombia", flagSrc: "assets/flags/co.svg" },
  { id: "HL", label: "Holding", flagSrc: "assets/flags/world.png" },
];
function getAvailableSystemProducts(programId) {
  const products = new Map();

  (DATA.systems || [])
    .filter(
      (item) =>
        item.programId === programId &&
        item.country === selectedCountry &&
        item.product,
    )
    .forEach((item) => {
      const id = String(item.product).trim();
      products.set(id, {
        id,
        label: id
          .split("-")
          .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
          .join(" "),
      });
    });

  return [...products.values()];
}
function setHead(t, s, c = "Retail Client Solutions") {
  title.textContent = t;
  subtitle.textContent = s;
  crumb.textContent = c;
}

function tpl(id) {
  return document.querySelector(id).content.cloneNode(true);
}

function pillClass(s) {
  return s.includes("Atención") ? "red" : s.includes("Piloto") ? "yellow" : "";
}

function route(r) {
  location.hash = r;
}
function splitPipeList(value) {
  if (Array.isArray(value)) return value;

  return String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}
function renderLanding() {
  setHead(
    "Retail Client Solutions Cockpit",
    "Portfolio overview, demanda estratégica y evolución de arquitectura",
  );

  view.innerHTML = "";
  view.append(tpl("#landing-template"));

  document.querySelector("#portfolioKpis").innerHTML = (
    DATA.portfolioKpis || []
  )
    .map((k) => {
      const label = k.label || k.title || k.name || k[0] || "";
      const value = k.value || k.metric || k[1] || "";
      const subtitle = k.subtitle || k.description || k[2] || "";
      const icon = k.icon || k[3] || "◎";

      return `
      <article class="kpi-card">
        <div class="kpi-icon">${icon}</div>
        <div>
          <h3>${label}</h3>
          <strong>${value}</strong>
          <p>${subtitle}</p>
        </div>
      </article>
    `;
    })
    .join("");
  document.querySelector("#programGrid").innerHTML = DATA.programs
    .map(
      (p) => `
        <article class="program-card ${p.enabled ? "" : "disabled"}">
          <div class="program-head">
            <div class="program-icon">${p.icon || "●"}</div>
            <div>
              <h3>${p.name}</h3>
              <p>${p.description}</p>
            </div>
          </div>

          <span class="pill ${pillClass(p.status)}">${p.status}</span>

          <div class="progress-row">
            <div>
              <small>Funcional</small>
              <div class="donut" style="--p:${p.functional}" data-label="${p.functional}%"></div>
            </div>
            <div>
              <small>Sistemas</small>
              <div class="donut" style="--p:${p.systems}" data-label="${p.systems}%"></div>
            </div>
            <div>
              <small>Arquitectura</small>
              <div class="donut" style="--p:${p.architecture}" data-label="${p.architecture}%"></div>
            </div>
          </div>

          <button class="card-link" ${p.enabled ? `data-route="program/${p.id}"` : `onclick=\"alert('Programa próximamente disponible')\"`}>→ Ver programa</button>
        </article>
      `,
    )
    .join("");
}
function renderProgram(programId) {
  const data = DATA;

  if (!data || !Array.isArray(data.programs)) {
    console.error("No hay datos válidos para renderProgram:", data);
    return "";
  }

  const p = data.programs.find((p) => p.id === programId);

  if (!p) {
    renderLanding();
    return;
  }

  const modules = DATA.modules.filter(
    (m) => m.programId === programId && m.route !== "backlog",
  );
  const roles = DATA.roles.filter(
    (r) => r.programId === programId && r.country === selectedCountry,
  );

  const priorities = DATA.priorities.filter(
    (x) => x.programId === programId && x.country === selectedCountry,
  );
  const impediments = (DATA.impediments || []).filter(
    (x) => x.programId === programId && x.country === selectedCountry,
  );

  const decisionsPending = (DATA.decisionsPending || []).filter(
    (x) => x.programId === programId && x.country === selectedCountry,
  );

  const decisionsDone = (DATA.decisionsDone || []).filter(
    (x) => x.programId === programId && x.country === selectedCountry,
  );

  setHead(p.name, p.description, `Retail Client Solutions > ${p.name}`);

  view.innerHTML = "";
  view.append(tpl("#program-template"));
  document.querySelector("#rolesList")?.closest(".two-column")?.remove();
  view.insertAdjacentHTML("afterbegin", renderCountrySelector());
  programName.textContent = p.name;
  programDescription.textContent = p.description;

  programMetrics.innerHTML = ["functional", "systems", "architecture"]
    .map(
      (k) => `
        <div class="metric-tile">
          <strong>${p[k]}%</strong><br/>
          <span>${k}</span>
        </div>
      `,
    )
    .join("");

  moduleGrid.innerHTML = modules
    .map(
      (m) => `
        <article
          class="module-card ${m.route ? "active" : ""}"
          ${m.route ? `data-route="${m.route}/${programId}"` : `onclick="alert('Módulo próximamente disponible')"`}>
          <span class="pill ${m.route ? "" : "yellow"}">${m.status}</span>
          <h3>${m.title}</h3>
          <p>${m.description}</p>
        </article>
      `,
    )
    .join("");
  view.insertAdjacentHTML(
    "beforeend",
    `
    <section class="panel executive-quarter-panel">
      <div class="executive-quarter-header">
        <div>
          <h3>Executive Summary</h3>
          <p>Vista por trimestre de proyectos y MSAs.</p>
        </div>

        <div class="executive-quarter-selector">
          ${["ALL", "Q1", "Q2", "Q3", "Q4"]
            .map(
              (quarter) => `
                <button
                  class="quarter-btn ${
                    executiveQuarter === quarter ? "active" : ""
                  }"
                  type="button"
                  data-executive-quarter="${quarter}"
                >
                  ${quarter === "ALL" ? "Todo el año" : quarter}
                </button>
              `,
            )
            .join("")}
        </div>
      </div>

      <div id="executiveQuarterView"></div>
    </section>
  `,
  );

  renderExecutiveQuarterView(programId);
  view.insertAdjacentHTML(
    "beforeend",
    `
    <section class="localisms-toggle-section">
      <button class="localisms-toggle-btn" type="button" id="localismsToggleBtn">
        ${showProgramLocalisms ? "Contraer" : "Localismos del programa"}
      </button>
    </section>

    <section class="program-localisms ${showProgramLocalisms ? "is-open" : ""}">      
      <section class="two-column management-section">
        <article class="panel">
          <h3>Impedimentos</h3>
          <div class="management-list">
            ${
              impediments.length
                ? impediments
                    .map(
                      (item) => `
                        <div class="management-card">
                          <div class="management-card-top">
                            <strong>${item.title}</strong>
                            <span class="pill ${item.severity === "high" ? "red" : item.severity === "medium" ? "yellow" : ""}">
                              ${item.severity || "low"}
                            </span>
                          </div>
                          <p>${item.impact || ""}</p>
                          <small><b>Owner:</b> ${item.owner || "-"} · <b>Objetivo:</b> ${item.targetResolutionDate || "-"}</small>
                          <small><b>Mitigación:</b> ${item.mitigation || "-"}</small>
                        </div>
                      `,
                    )
                    .join("")
                : `<p class="empty-state">No hay impedimentos registrados.</p>`
            }
          </div>
        </article>

        <article class="panel">
          <h3>Decisiones</h3>

          <h4 class="management-subtitle">Pendientes</h4>
          <div class="management-list">
            ${
              decisionsPending.length
                ? decisionsPending
                    .map(
                      (item) => `
                        <div class="management-card">
                          <div class="management-card-top">
                            <strong>${item.title}</strong>
                            <span class="pill yellow">${item.status || "pending"}</span>
                          </div>
                          <small><b>Owner:</b> ${item.owner || "-"} · <b>Fecha:</b> ${item.dueDate || "-"}</small>
                          <p>${item.impact || ""}</p>
                        </div>
                      `,
                    )
                    .join("")
                : `<p class="empty-state">No hay decisiones pendientes.</p>`
            }
          </div>

          <h4 class="management-subtitle">Tomadas</h4>
          <div class="management-list">
            ${
              decisionsDone.length
                ? decisionsDone
                    .map(
                      (item) => `
                        <div class="management-card done">
                          <div class="management-card-top">
                            <strong>${item.title}</strong>
                            <span class="pill">${item.status || "done"}</span>
                          </div>
                          <small><b>Owner:</b> ${item.owner || "-"} · <b>Fecha:</b> ${item.dueDate || "-"}</small>
                          <p>${item.impact || ""}</p>
                        </div>
                      `,
                    )
                    .join("")
                : `<p class="empty-state">No hay decisiones tomadas.</p>`
            }
          </div>
        </article>
      </section> 
    <section class="module-grid secondary-module-grid">
       <article class="module-card" data-route="projects/${programId}">
        <span class="pill green">Activo</span>
        <h3>Seguimiento de los proyectos</h3>
        <p>Iniciativas, desarrollos, MSAs, etc</p>
      </article>

      <article class="module-card" onclick="alert('Roadmap próximamente disponible')">
        <span class="pill yellow">Próximamente</span>
        <h3>Roadmap</h3>
        <p>Hitos, entregas y planificación temporal.</p>
      </article>
      <article class="module-card" onclick="alert('Hitos próximamente disponible')">
        <span class="pill yellow">Próximamente</span>
        <h3>Hitos</h3>
        <p>Hitos, entregas y planificación temporal.</p>
      </article>
    </section>
     <section class="two-column final-info-section">
    <article class="panel">
      <h3>Roles clave</h3>
      <div class="tag-list">
        ${roles
          .map((r) => `<span class="tag">${r.role} · ${r.description}</span>`)
          .join("")}
      </div>
    </article>

    <article class="panel">
      <h3>Prioridades</h3>
      <div class="stack-list">
        ${priorities
          .map((x) => `<div class="stack-item">${x.priority}</div>`)
          .join("")}
      </div>
    </article>
  </section>
    `,
  );
}
function renderFunctional(programId) {
  const p = DATA.programs.find((x) => x.id === programId);
  const functionalItems = DATA.functional.filter(
    (item) => item.programId === programId && item.country === selectedCountry,
  );

  const country = COUNTRIES.find((c) => c.id === selectedCountry);

  setHead(
    `${p?.name || "Programa"} · Mapa de capacidades funcionales`,
    `Dominios, capacidades y funcionalidades · ${country?.label || selectedCountry}`,
    `Retail Client Solutions > ${p?.name || programId} > ${country?.label || selectedCountry} > Mapa de capacidades funcionales`,
  );

  view.innerHTML = "";
  view.append(tpl("#functional-template"));
  view.insertAdjacentHTML("afterbegin", renderCountrySelector());
  const backButton = document.querySelector(".back-to-program-btn");

  if (backButton) {
    backButton.dataset.route = `program/${programId}`;
    backButton.textContent = `← Volver a ${p?.name || "programa"}`;
  }
  document
    .querySelector('[data-route="program/"]')
    ?.setAttribute("data-route", `program/${programId}`);

  const groupedDomains = {};

  functionalItems.forEach((item) => {
    if (!groupedDomains[item.domain]) {
      groupedDomains[item.domain] = [];
    }

    groupedDomains[item.domain].push(item);
  });

  functionalMap.innerHTML = Object.entries(groupedDomains)
    .map(
      ([domainName, capabilities]) => `

    <article class="domain">

      <h3>${domainName}</h3>

      ${capabilities
        .map(
          (capability) => `

            <div class="capability">

              <strong>${capability.capability}</strong>

              ${splitPipeList(capability.features)
                .map(
                  (feature) => `
                    <div class="feature">
                      • ${feature}
                    </div>
                  `,
                )
                .join("")}

            </div>

          `,
        )
        .join("")}

    </article>

  `,
    )
    .join("");
}

function renderSystems(programId, mode = "systems") {
  const p = DATA.programs.find((x) => x.id === programId);

  const systemItems = DATA.systems.filter(
    (item) =>
      item.programId === programId &&
      item.country === selectedCountry &&
      item.product === selectedSystemProduct,
  );

  const architectureGapItems = (DATA.architectureFeaturesGaps || []).filter(
    (item) =>
      item.programId === programId &&
      item["RtC Anchor Country"] === selectedCountry &&
      item.product === selectedSystemProduct,
  );

  const relationshipItems = (DATA.systemRelationships || []).filter((item) => {
    const itemCountry = item.country || item["RtC Anchor Country"];

    return (
      String(item.programId || "").trim() === String(programId || "").trim() &&
      String(itemCountry || "").trim() ===
        String(selectedCountry || "").trim() &&
      String(item.product || "").trim() ===
        String(selectedSystemProduct || "").trim()
    );
  });

  const functionalItems = DATA.functional.filter(
    (item) => item.programId === programId && item.country === selectedCountry,
  );

  const affectedSystems = new Set(
    (DATA.functionalSystemLinks || [])
      .filter(
        (link) =>
          String(link.programId || "").trim() ===
            String(programId || "").trim() &&
          String(link.country || "").trim() ===
            String(selectedCountry || "").trim() &&
          String(link.product || "").trim() ===
            String(selectedSystemProduct || "").trim() &&
          String(link.functionalKey || "").trim() ===
            String(selectedCapability || "").trim(),
      )
      .map((link) => String(link.systemComponent || "").trim()),
  );

  if (selectedArchitectureGap) {
    const selectedGap = architectureGapItems.find(
      (item, index) =>
        [
          item.programId,
          item["RtC Anchor Country"],
          item["GAP Asignado"],
          item.Demanda,
          index,
        ].join("::") === selectedArchitectureGap,
    );

    String(selectedGap?.affectedSystemComponents || "")
      .split("|")
      .map((component) => component.trim())
      .filter(Boolean)
      .forEach((component) => affectedSystems.add(component));
  }

  const country = COUNTRIES.find((c) => c.id === selectedCountry);

  const groupedDomains = {};

  const sourceSystems = mode === "architecture" ? DATA.systems : DATA.systems;

  const targetSystems = mode === "architecture" ? DATA.systemsToBe || [] : [];

  functionalItems.forEach((item) => {
    if (!groupedDomains[item.domain]) {
      groupedDomains[item.domain] = [];
    }

    groupedDomains[item.domain].push(item);
  });

  setHead(
    `${p?.name || "Programa"} · Mapa de sistemas`,
    `Arquitectura y capacidades · ${country?.label || selectedCountry}`,
    `Retail Client Solutions > ${
      p?.name || programId
    } > ${country?.label || selectedCountry}`,
  );

  view.innerHTML = "";

  const templateId =
    mode === "architecture" ? "#architecture-template" : "#systems-template";

  view.append(tpl(templateId));

  const systemsDashboardGrid = document.querySelector("#systemsDashboardGrid");

  const expandSystemMapBtn = document.querySelector("#expandSystemMapBtn");
  const expandToBeMapBtn = document.querySelector("#expandToBeMapBtn");
  const toBePanel = document.querySelector(".systems-tobe-panel");
  if (toBePanel) {
    toBePanel.classList.toggle("tobe-map-expanded", isToBeMapExpanded);
  }

  if (expandToBeMapBtn) {
    expandToBeMapBtn.textContent = isToBeMapExpanded
      ? "Contraer mapa"
      : "Expandir mapa";
  }
  if (systemsDashboardGrid) {
    systemsDashboardGrid.classList.toggle(
      "system-map-expanded",
      isSystemMapExpanded,
    );
  }

  if (expandSystemMapBtn) {
    expandSystemMapBtn.textContent = isSystemMapExpanded
      ? "Contraer mapa"
      : "Expandir mapa";
  }

  view.insertAdjacentHTML(
    "afterbegin",
    renderSystemsProductSelector(programId),
  );
  view.insertAdjacentHTML("afterbegin", renderCountrySelector());

  const backButton = document.querySelector(".back-to-program-btn");

  if (backButton) {
    backButton.dataset.route = `program/${programId}`;

    backButton.textContent = `← Volver a ${p?.name || "programa"}`;
  }

  const groupedSystems = {};

  systemItems.forEach((item) => {
    const layerName = item.layer || "General";

    if (!groupedSystems[layerName]) {
      groupedSystems[layerName] = {};
    }

    const groupName = item.groupName || "Sin agrupación";

    if (!groupedSystems[layerName][groupName]) {
      groupedSystems[layerName][groupName] = [];
    }

    groupedSystems[layerName][groupName].push(item);
  });
  console.log("selectedCapability:", selectedCapability);
  console.log("affectedSystems:", [...affectedSystems]);

  systemLayers.innerHTML = Object.entries(groupedSystems)
    .map(
      ([layerName, groups]) => `
      <article class="layer">

        <h3>${layerName}</h3>

        <div class="system-groups">

          ${Object.entries(groups)
            .map(([groupName, groupItems]) => {
              const componentsByLevel = {};

              groupItems.forEach((s) => {
                const level = s.level || "1";

                const components = String(s.component || "")
                  .split("|")
                  .map((item) => item.trim())
                  .filter(Boolean);

                if (!componentsByLevel[level]) {
                  componentsByLevel[level] = [];
                }

                componentsByLevel[level].push(...components);
              });

              return `
                <div
                  class="system-group-box"
                  data-system-group="${groupName}"
                >

                  <div class="system-group-title">
                    ${groupName}
                  </div>

                  ${Object.entries(componentsByLevel)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(
                      ([level, components]) => `
                        <div
                          class="system-level-row"
                          data-level="${level}"
                        >

                          ${components
                            .map((component) => {
                              const isAffected = affectedSystems.has(component);

                              const isSelected =
                                selectedSystemComponent === component;

                              return `
                                <button
                                  class="
                                    component
                                    system-component-card
                                    ${
                                      isAffected ? "affected-by-capability" : ""
                                    }
                                    ${
                                      isSelected
                                        ? "selected-system-component"
                                        : ""
                                    }
                                  "
                                  type="button"
                                  data-system-component="${component}"
                                  data-system-node="${component}"
                                >
                                  ${component}
                                </button>
                              `;
                            })
                            .join("")}

                        </div>
                      `,
                    )
                    .join("")}

                </div>
              `;
            })
            .join("")}

        </div>

      </article>
    `,
    )
    .join("");

  if (mode === "architecture") {
    const toBeItems = (DATA.systemsToBe || []).filter(
      (item) =>
        item.programId === programId &&
        item.country === selectedCountry &&
        item.product === selectedSystemProduct,
    );

    const groupedToBeSystems = {};

    toBeItems.forEach((item) => {
      const layerName = item.layer || "General";

      if (!groupedToBeSystems[layerName]) {
        groupedToBeSystems[layerName] = {};
      }

      const groupName = item.groupName || "Sin agrupación";

      if (!groupedToBeSystems[layerName][groupName]) {
        groupedToBeSystems[layerName][groupName] = [];
      }

      groupedToBeSystems[layerName][groupName].push(item);
    });

    systemLayersToBe.innerHTML = Object.entries(groupedToBeSystems)
      .map(
        ([layerName, groups]) => `
        <article class="layer">

          <h3>${layerName}</h3>

          <div class="system-groups">

            ${Object.entries(groups)
              .map(([groupName, groupItems]) => {
                const componentsByLevel = {};

                groupItems.forEach((s) => {
                  const level = s.level || "1";

                  const components = String(s.component || "")
                    .split("|")
                    .map((item) => item.trim())
                    .filter(Boolean);

                  if (!componentsByLevel[level]) {
                    componentsByLevel[level] = [];
                  }

                  componentsByLevel[level].push(...components);
                });

                return `
                  <div
                    class="system-group-box"
                    data-system-group="${groupName}"
                  >

                    <div class="system-group-title">
                      ${groupName}
                    </div>

                    ${Object.entries(componentsByLevel)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(
                        ([level, components]) => `
                          <div
                            class="system-level-row"
                            data-level="${level}"
                          >

                            ${components
                              .map(
                                (component) => `
                                  <button
                                    class="
                                      component
                                      system-component-card
                                      ${affectedSystems.has(component) ? "affected-by-capability" : ""}
                                    "
                                    type="button"
                                    data-system-node="${component}"
                                  >
                                    ${component}
                                  </button> 
                                `,
                              )
                              .join("")}

                          </div>
                        `,
                      )
                      .join("")}

                  </div>
                `;
              })
              .join("")}

          </div>

        </article>
      `,
      )
      .join("");

    requestAnimationFrame(() => {
      renderSystemRelationships(
        (DATA.systemRelationshipsToBe || []).filter(
          (item) =>
            item.programId === programId &&
            item.country === selectedCountry &&
            item.product === selectedSystemProduct,
        ),
        "#systemMapCanvasToBe",
        "#systemLinksSvgToBe",
      );
    });
  }

  requestAnimationFrame(() => {
    renderSystemRelationships(relationshipItems);
  });

  if (mode === "architecture" && typeof systemsTable !== "undefined") {
    systemsTable.outerHTML = `
    <div class="architecture-gap-list">

      ${architectureGapItems
        .map((item, index) => {
          const gapKey = [
            item.programId,
            item["RtC Anchor Country"],
            item["GAP Asignado"],
            item.Demanda,
            index,
          ].join("::");

          return `
            <button
              class="
                architecture-gap-card
                ${selectedArchitectureGap === gapKey ? "selected" : ""}
              "
              type="button"
              data-architecture-gap="${gapKey}"
            >

              <div class="architecture-gap-top">

                <span class="architecture-gap-status">
                  ${item["Estatus revisión PA"] || ""}
                </span>

                <span class="architecture-gap-priority">
                  ${item.Prioridad || ""}
                </span>

              </div>

              <strong class="architecture-gap-title">
                ${item.Demanda || "Sin demanda"}
              </strong>

              <div class="architecture-gap-meta">

                <span>
                  <b>GAP:</b>
                  ${item["GAP asignado"] || "-"}
                </span>

                <span>
                  <b>País:</b>
                  ${item["RtC Anchor Country"] || "-"}
                </span>

                <span>
                  <b>Dependencias:</b>
                  ${item.Dependencias || "-"}
                </span>

              </div>

            </button>
          `;
        })
        .join("")}

    </div>
  `;
  }

  const systemsFunctionalMapEl = document.querySelector(
    "#systemsFunctionalMap",
  );

  if (systemsFunctionalMapEl) {
    systemsFunctionalMapEl.innerHTML = Object.entries(groupedDomains)
      .map(
        ([domainName, capabilities]) => `
          <article class="systems-mini-domain">

            <h4>${domainName}</h4>

            ${capabilities
              .map(
                (capability) => `
                  <div class="systems-mini-capability">

                    <strong>
                      ${capability.capability}
                    </strong>

                    <div class="feature-card-list">

                      ${splitPipeList(capability.features)
                        .map((feature) => {
                          const featureKey = `${domainName}::${capability.capability}::${feature}`;

                          return `
                            <button
                              class="
                                feature-card
                                ${
                                  selectedCapability === featureKey
                                    ? "selected"
                                    : ""
                                }
                              "
                              type="button"
                              data-feature="${featureKey}"
                            >
                              ${feature}
                            </button>
                          `;
                        })
                        .join("")}

                    </div>

                  </div>
                `,
              )
              .join("")}

          </article>
        `,
      )
      .join("");
  }
}
function render() {
  const h = location.hash.replace("#", "") || "landing";
  const [routeName, programId] = h.split("/");

  if (routeName === "program") renderProgram(programId);
  else if (routeName === "functional") renderFunctional(programId);
  else if (routeName === "systems") renderSystems(programId, "systems");
  else if (routeName === "architecture")
    renderSystems(programId, "architecture");
  else if (routeName === "impediments") renderImpediments(programId);
  else if (routeName === "decisions") renderDecisions(programId);
  else if (routeName === "projects") renderProjectsView(programId);
  else if (routeName === "msas") renderMsasView(programId);
  else renderLanding();
}
function renderCountrySelector() {
  return `
    <div class="country-selector">
      ${COUNTRIES.map(
        (country) => `
          <button
            class="country-flag ${selectedCountry === country.id ? "active" : ""}"
            type="button"
            data-country="${country.id}"
            title="${country.label}"
            aria-label="${country.label}"
          >
            <img src="${country.flagSrc}" alt="${country.label}" />
            </button>
            <span>${country.label}</span>
        `,
      ).join("")}
    </div>
  `;
}
function renderSystemsProductSelector(programId) {
  const products = getAvailableSystemProducts(programId);

  if (!products.length) return "";

  if (!products.some((p) => p.id === selectedSystemProduct)) {
    selectedSystemProduct = products[0].id;
  }

  return `
    <div class="systems-product-selector">
      ${products
        .map(
          (product) => `
            <button
              class="systems-product-btn ${
                selectedSystemProduct === product.id ? "active" : ""
              }"
              type="button"
              data-system-product="${product.id}"
            >
              ${product.label}
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}
function renderSystemRelationships(
  relationships,
  canvasSelector = "#systemMapCanvas",
  svgSelector = "#systemLinksSvg",
) {
  const canvas = document.querySelector(canvasSelector);
  const svg = document.querySelector(svgSelector);

  if (!canvas || !svg) return;

  const canvasRect = canvas.getBoundingClientRect();

  svg.setAttribute("width", canvasRect.width);
  svg.setAttribute("height", canvasRect.height);
  svg.setAttribute("viewBox", `0 0 ${canvasRect.width} ${canvasRect.height}`);

  svg.innerHTML = `
    <defs>
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="10"
        refX="8"
        refY="3"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L0,6 L9,3 z" class="relationship-arrow-head"></path>
      </marker>
    </defs>
  `;

  relationships.forEach((relationship, index) => {
    function getRelationshipNode(type, id) {
      const cleanType = String(type || "component").trim();
      const cleanId = String(id || "").trim();
      if (cleanType === "group") {
        return canvas.querySelector(
          `[data-system-group="${CSS.escape(cleanId)}"]`,
        );
      }

      return canvas.querySelector(
        `[data-system-node="${CSS.escape(cleanId)}"]`,
      );
    }

    const fromNode = getRelationshipNode(
      relationship.fromType,
      relationship.fromId || relationship.fromComponent,
    );

    const toNode = getRelationshipNode(
      relationship.toType,
      relationship.toId || relationship.toComponent,
    );

    if (!fromNode || !toNode) return;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    path.classList.add("system-relationship-link");

    const fromRect = fromNode.getBoundingClientRect();
    const toRect = toNode.getBoundingClientRect();

    const offset = ((index % 3) - 1) * 18;

    const fromCenterX = fromRect.left + fromRect.width / 2 - canvasRect.left;
    const fromBottomY = fromRect.bottom - canvasRect.top;

    const toCenterX = toRect.left + toRect.width / 2 - canvasRect.left;
    const toTopY = toRect.top - canvasRect.top;

    const sameGroup =
      fromNode.closest(".system-group-box") ===
      toNode.closest(".system-group-box");

    const sameLayer = fromNode.closest(".layer") === toNode.closest(".layer");

    const gap = 18;
    const laneOffset = 28 + (index % 4) * 14;

    let d;

    if (sameGroup) {
      const startY = fromBottomY + 4;
      const endY = toTopY - 4;
      const midY = startY + (endY - startY) / 2;

      d = `
    M ${fromCenterX} ${startY}
    L ${fromCenterX} ${midY}
    L ${toCenterX} ${midY}
    L ${toCenterX} ${endY}
  `;
    } else if (sameLayer) {
      const fromRightX = fromRect.right - canvasRect.left + 4;
      const toLeftX = toRect.left - canvasRect.left - 4;
      const laneY =
        Math.min(fromRect.top, toRect.top) - canvasRect.top - laneOffset;

      d = `
    M ${fromRightX} ${fromRect.top + fromRect.height / 2 - canvasRect.top}
    L ${fromRightX + gap} ${fromRect.top + fromRect.height / 2 - canvasRect.top}
    L ${fromRightX + gap} ${laneY}
    L ${toLeftX - gap} ${laneY}
    L ${toLeftX - gap} ${toRect.top + toRect.height / 2 - canvasRect.top}
    L ${toLeftX} ${toRect.top + toRect.height / 2 - canvasRect.top}
  `;
    } else {
      const startX = fromCenterX;
      const startY = fromBottomY + 4;
      const endX = toCenterX;
      const endY = toTopY - 4;
      const laneY = startY + laneOffset;

      d = `
    M ${startX} ${startY}
    L ${startX} ${laneY}
    L ${endX} ${laneY}
    L ${endX} ${endY}
  `;
    }

    path.setAttribute("d", d);
    //   path.setAttribute(
    //     "d",
    //     `
    //   M ${startX} ${startY}
    //   C ${startX + sideOffset} ${startY + Math.min(36, verticalDistance / 2)},
    //     ${endX + sideOffset} ${endY - Math.min(36, verticalDistance / 2)},
    //     ${endX} ${endY}
    // `,
    //   );
    // path.setAttribute("marker-end", "url(#arrowhead)");
    svg.appendChild(path);
    if (relationship.label) {
      const labelGroup = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g",
      );

      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );

      text.setAttribute("class", "relationship-label");

      const pathLength = path.getTotalLength();
      const labelPoint = path.getPointAtLength(pathLength * 0.5);

      text.setAttribute("x", labelPoint.x);
      text.setAttribute("y", labelPoint.y - 8);

      text.textContent = relationship.label;

      labelGroup.appendChild(text);

      svg.appendChild(labelGroup);

      const bbox = text.getBBox();

      const rect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      );

      rect.setAttribute("x", bbox.x - 6);
      rect.setAttribute("y", bbox.y - 2);
      rect.setAttribute("width", bbox.width + 12);
      rect.setAttribute("height", bbox.height + 4);
      rect.setAttribute("rx", 6);

      rect.setAttribute("class", "relationship-label-bg");

      labelGroup.insertBefore(rect, text);
    }
  });
}
async function init(showMessage = true) {
  if (isLoadingData) return;

  isLoadingData = true;
  showLoadingOverlay();

  try {
    DATA = await loadData();
    statusEl.textContent =
      window.APP_CONFIG.runtime === "drive-json"
        ? "Datos Google Sheets de Drive cargados"
        : "Datos Locales";
    // statusEl.textContent =
    //   window.APP_CONFIG.runtime === "local-json"
    //     ? "Datos locales cargados"
    //     : "Datos Google Sheets API v4 actualizados";
  } catch (e) {
    console.error(e);

    const response = await fetch("./data/app-data.json");
    DATA = await response.json();

    statusEl.textContent = "Datos locales cargados";
  } finally {
    isLoadingData = false;
    hideLoadingOverlay();
  }

  syncDataSourceToggle();
  render();
}
function openDataSource() {
  if (window.APP_CONFIG.runtime === "apps-script") {
    google.script.run
      .withSuccessHandler((url) => window.open(url, "_blank"))
      .getSpreadsheetUrl();

    return;
  }

  const spreadsheetId = window.APP_CONFIG.googleSheetsApi?.spreadsheetId;

  if (!spreadsheetId || spreadsheetId.includes("REPLACE")) {
    alert("Spreadsheet ID no configurado.");
    return;
  }

  window.open(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    "_blank",
  );
}
function syncDataSourceToggle() {
  const toggle = document.getElementById("dataSourceToggle");
  if (!toggle) return;

  toggle.checked = window.APP_CONFIG.runtime === "drive-json";
}
/* dashboard inspired*/
function rcsEsc(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function rcsNormalizeStatus(s) {
  const v = String(s || "planned")
    .toLowerCase()
    .trim();

  return (
    {
      ok: "on-track",
      green: "on-track",
      on_track: "on-track",
      "on track": "on-track",

      "componente desarrollado": "on-track",
      "diseño liberado": "done",
      "n/a": "pending",
      na: "pending",

      risk: "at-risk",
      amber: "at-risk",
      at_risk: "at-risk",
      "at risk": "at-risk",
      red: "blocked",
      blocker: "blocked",
      blocked: "blocked",
      planned: "planned",
      planificado: "planned",
      done: "done",
      closed: "done",
      completed: "done",
      pending: "pending",
    }[v] || v.replaceAll("_", "-")
  );
}

function rcsStatusLabel(s) {
  return (
    {
      "on-track": "OK",
      "at-risk": "Riesgo",
      blocked: "Bloqueado",
      planned: "Planificado",
      done: "Hecho",
      pending: "Pendiente",
    }[rcsNormalizeStatus(s)] ||
    s ||
    "-"
  );
}

function renderProjectsView(programId) {
  const p = DATA.programs.find((x) => x.id === programId);

  view.innerHTML = "";
  view.append(tpl("#projects-template"));
  view.insertAdjacentHTML("afterbegin", renderCountrySelector());

  setHead(
    `${p?.name || "Programa"}`,
    `Projects and initiatives · ${selectedCountry}`,
    `Retail Client Solutions > ${p?.name || programId} > Executive Summary`,
  );

  const backButton = document.querySelector(".back-to-program-btn");
  if (backButton) {
    backButton.dataset.route = `program/${programId}`;
    backButton.textContent = `← Volver a ${p?.name || "programa"}`;
  }

  renderProjectsList(programId);
  view.insertAdjacentHTML(
    "beforeend",
    `
    <section id="msas" class="panel projects-panel">
      <div class="section-header">
        <h3>MSAs</h3>
      </div>
    </section>
    <section id="msaDetail" class="panel project-detail-panel" hidden></section>
  `,
  );

  renderMsasList(programId);
}

function getProgramProjects(programId) {
  return (DATA.projects || []).filter(
    (p) =>
      p.programId === programId &&
      (!p.country || p.country === selectedCountry),
  );
}

function getProjectPhases(projectId) {
  return (DATA.projectPhases || [])
    .filter((p) => p.projectId === projectId)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function renderProjectsList(programId) {
  const container = document.querySelector("#projects");
  const detail = document.querySelector("#projectDetail");
  if (!container) return;

  if (detail) {
    detail.hidden = true;
    detail.innerHTML = "";
  }

  container.hidden = false;

  const projects = getProgramProjects(programId);

  container.innerHTML = `
    <h3>Proyectos</h3>

    <div class="project-list">
      ${
        projects.length
          ? projects
              .map((p) => {
                const status = rcsNormalizeStatus(p.status);

                return `
                  <article
                    class="project-card clickable-card"
                    data-project-id="${rcsEsc(p.id)}"
                    tabindex="0"
                    role="button"
                  >
                    <div class="project-card-main">
                      <div>
                        <div class="project-name">${rcsEsc(p.name)}</div>
                        <div class="project-summary">${rcsEsc(p.summary)}</div>
                      </div>

                      <div class="project-progress">${rcsEsc(p.progress || 0)}%</div>
                    </div>

                    <div class="project-meta">
                      <span class="status-pill status-${status}">
                        ${rcsStatusLabel(status)}
                      </span>
                      <span>Owner: ${rcsEsc(p.owner || "-")}</span>
                      <span>
                        Hito: ${rcsEsc(p.nextMilestoneTitle || "-")}
                        · ${rcsEsc(formatDate(p.nextMilestoneDate) || "-")}
                      </span>
                    </div>

                    <div class="project-card-action">Ver detalle →</div>
                  </article>
                `;
              })
              .join("")
          : `<p class="empty-state">No hay proyectos informados para este país.</p>`
      }
    </div>
  `;

  document
    .querySelectorAll(".project-card.clickable-card[data-project-id]")
    .forEach((card) => {
      const open = () =>
        renderProjectDetailView(programId, card.dataset.projectId);

      card.addEventListener("click", open);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    });
}

function renderProjectDetailView(programId, projectId) {
  const list = document.querySelector("#projects");
  const detail = document.querySelector("#projectDetail");

  if (!detail) return;

  const project = getProgramProjects(programId).find((p) => p.id === projectId);

  if (!project) {
    detail.hidden = false;
    detail.innerHTML = `
      <button class="ghost-button" type="button" onclick="renderProjectsList('${programId}')">
        ← Volver a proyectos
      </button>
      <h3>Proyecto no encontrado</h3>
    `;
    return;
  }

  const phases = getProjectPhases(project.id);
  const status = rcsNormalizeStatus(project.status);

  if (list) list.hidden = true;
  detail.hidden = false;

  detail.innerHTML = `
    <div class="project-detail-header">
      <button class="ghost-button" type="button" onclick="renderProjectsList('${programId}')">
        ← Volver a proyectos
      </button>

      <div>
        <h3>${rcsEsc(project.name)}</h3>
        <p>${rcsEsc(project.description || project.summary)}</p>
      </div>

      <span class="status-pill status-${status}">
        ${rcsStatusLabel(status)}
      </span>
    </div>

    <div class="project-detail-grid">
      <article class="detail-card">
        <span>Owner</span>
        <strong>${rcsEsc(project.owner || "-")}</strong>
      </article>

      <article class="detail-card">
        <span>Avance global</span>
        <strong>${rcsEsc(project.progress || 0)}%</strong>
      </article>

      <article class="detail-card">
        <span>Siguiente hito</span>
        <strong>${rcsEsc(project.nextMilestoneTitle || "-")}</strong>
        <small>${rcsEsc(formatDate(project.nextMilestoneDate) || "")}</small>
      </article>

      <article class="detail-card">
        <span>Última actualización</span>
        <strong>${rcsEsc(formatDate(project.lastUpdate) || "-")}</strong>
      </article>
    </div>

    <section class="phase-section">
      <h3>Avance por fases</h3>

      <div class="phase-roadmap">
        ${
          phases.length
            ? phases
                .map((phase) => {
                  const phaseStatus = rcsNormalizeStatus(phase.status);
                  const progress = Math.max(
                    0,
                    Math.min(100, Number(phase.progress || 0)),
                  );

                  return `
                    <article class="phase-card">
                      <div class="phase-card-head">
                        <h4>${rcsEsc(phase.phaseName)}</h4>
                        <span class="status-pill status-${phaseStatus}">
                          ${rcsStatusLabel(phaseStatus)}
                        </span>
                      </div>

                      <div class="phase-bar">
                        <span style="width:${progress}%"></span>
                      </div>

                      <div class="phase-meta">
                        <strong>${progress}%</strong>
                        <span>
                          Marco:
                          ${rcsEsc(formatDate(phase.startDate))}
                          →
                          ${rcsEsc(formatDate(phase.endDate))}
                        </span>
                      </div>

                      <div class="phase-delivery">
                        🚩 Entrega: ${rcsEsc(formatDate(phase.targetDate))}
                      </div>

                      <p>${rcsEsc(phase.comments || "")}</p>
                    </article>
                  `;
                })
                .join("")
            : `<p class="empty-state">No hay fases informadas para este proyecto.</p>`
        }
      </div>
      <div id="phaseTimeline"></div>
    </section>

    <section class="project-detail-notes">
      <article>
        <h3>Objetivo estratégico</h3>
        <p>${rcsEsc(project.strategicGoal || "No informado.")}</p>
      </article>

      <article>
        <h3>Valor de negocio</h3>
        <p>${rcsEsc(project.businessValue || "No informado.")}</p>
      </article>

      <article>
        <h3>Riesgos principales</h3>
        <p>${rcsEsc(project.mainRisks || "No informado.")}</p>
      </article>

      <article>
        <h3>Dependencias</h3>
        <p>${rcsEsc(project.dependencies || "No informado.")}</p>
      </article>
    </section>
  `;
  const timelineContainer = document.getElementById("phaseTimeline");

  renderPhaseTimeline(phases, timelineContainer);
}
/* dashboard inspired*/
/*MSAs*/
function getProgramMsas(programId) {
  return (DATA.msas || []).filter(
    (m) =>
      m.programId === programId &&
      (!m.country || m.country === selectedCountry),
  );
}

function getMsaPhases(msaId) {
  return (DATA.msaPhases || [])
    .filter((p) => p.msaId === msaId)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function renderMsasView(programId) {
  const p = DATA.programs.find((x) => x.id === programId);

  view.innerHTML = "";
  view.append(tpl("#msas-template"));
  view.insertAdjacentHTML("afterbegin", renderCountrySelector());

  setHead(
    `${p?.name || "Programa"} · MSAs`,
    `Acuerdos y aprobaciones · ${selectedCountry}`,
    `Retail Client Solutions > ${p?.name || programId} > MSAs`,
  );

  const backButton = document.querySelector(".back-to-program-btn");

  if (backButton) {
    backButton.dataset.route = `program/${programId}`;
    backButton.textContent = `← Volver a ${p?.name || "programa"}`;
  }

  renderMsasList(programId);
}

function renderMsasList(programId) {
  const container = document.querySelector("#msas");
  const detail = document.querySelector("#msaDetail");

  if (!container) return;

  if (detail) {
    detail.hidden = true;
    detail.innerHTML = "";
  }

  container.hidden = false;

  const msas = getProgramMsas(programId);

  container.innerHTML = `
    <div class="section-header">
      <h3>MSAs</h3>
    </div>

    <div class="project-list">
      ${
        msas.length
          ? msas
              .map((msa) => {
                const status = rcsNormalizeStatus(msa.status);

                return `
                  <article
                    class="project-card msa-clickable-card"
                    data-msa-id="${rcsEsc(msa.id)}"
                    tabindex="0"
                    role="button"
                  >
                    <div class="project-card-main">
                      <div>
                        <div class="project-name">${rcsEsc(msa.name)}</div>
                        <div class="project-summary">${rcsEsc(msa.summary)}</div>
                      </div>

                      <div class="project-progress">${rcsEsc(msa.progress || 0)}%</div>
                    </div>

                    <div class="project-meta">
                      <span class="status-pill status-${status}">
                        ${rcsStatusLabel(status)}
                      </span>
                      <span>Owner: ${rcsEsc(msa.owner || "-")}</span>
                      <span>
                        Hito: ${rcsEsc(msa.nextMilestoneTitle || "-")}
                        · ${rcsEsc(msa.nextMilestoneDate || "-")}
                      </span>
                    </div>

                    <div class="project-card-action">Ver detalle →</div>
                  </article>
                `;
              })
              .join("")
          : `<p class="empty-state">No hay MSAs informados para este país.</p>`
      }
    </div>
  `;

  document
    .querySelectorAll(".msa-clickable-card[data-msa-id]")
    .forEach((card) => {
      card.addEventListener("click", () => {
        renderMsaDetailView(programId, card.dataset.msaId);
      });
    });
}
function renderMsaDetailView(programId, msaId) {
  const list = document.querySelector("#msas");
  const detail = document.querySelector("#msaDetail");

  if (!detail) return;

  const msa = getProgramMsas(programId).find((item) => item.id === msaId);

  if (!msa) {
    detail.hidden = false;
    detail.innerHTML = `
      <button class="ghost-button" type="button" onclick="renderMsasList('${programId}')">
        ← Volver a MSAs
      </button>
      <h3>MSA no encontrado</h3>
    `;
    return;
  }

  const phases = getMsaPhases(msa.id);
  const status = rcsNormalizeStatus(msa.status);

  if (list) list.hidden = true;
  detail.hidden = false;

  detail.innerHTML = `
    <div class="project-detail-header">
      <button class="ghost-button" type="button" onclick="renderMsasList('${programId}')">
        ← Volver a MSAs
      </button>

      <div>
        <h3>${rcsEsc(msa.name)}</h3>
        <p>${rcsEsc(msa.description || msa.summary)}</p>
      </div>

      <span class="status-pill status-${status}">
        ${rcsStatusLabel(status)}
      </span>
    </div>

    <div class="project-detail-grid">
      <article class="detail-card">
        <span>Owner</span>
        <strong>${rcsEsc(msa.owner || "-")}</strong>
      </article>

      <article class="detail-card">
        <span>Avance global</span>
        <strong>${rcsEsc(msa.progress || 0)}%</strong>
      </article>

      <article class="detail-card">
        <span>Siguiente hito</span>
        <strong>${rcsEsc(msa.nextMilestoneTitle || "-")}</strong>
        <small>${rcsEsc(msa.nextMilestoneDate || "")}</small>
      </article>

      <article class="detail-card">
        <span>Última actualización</span>
        <strong>${rcsEsc(msa.lastUpdate || "-")}</strong>
      </article>
    </div>

    <section class="phase-section">
      <h3>Avance por fases</h3>

      <div class="phase-roadmap">
        ${
          phases.length
            ? phases
                .map((phase) => {
                  const phaseStatus = rcsNormalizeStatus(phase.status);
                  const progress = Math.max(
                    0,
                    Math.min(100, Number(phase.progress || 0)),
                  );

                  return `
                    <article class="phase-card">
                      <div class="phase-card-head">
                        <h4>${rcsEsc(phase.phaseName)}</h4>
                        <span class="status-pill status-${phaseStatus}">
                          ${rcsStatusLabel(phaseStatus)}
                        </span>
                      </div>

                      <div class="phase-bar">
                        <span style="width:${progress}%"></span>
                      </div>

                      <div class="phase-meta">
                        <strong>${progress}%</strong>
                        <span>
                          ${rcsEsc(formatDate(phase.startDate) || "-")}
                          →
                          ${rcsEsc(formatDate(phase.targetDate || phase.endDate))}
                        </span>
                      </div>

                      <p>${rcsEsc(phase.comments || "")}</p>
                    </article>
                  `;
                })
                .join("")
            : `<p class="empty-state">No hay fases informadas para este MSA.</p>`
        }
      </div>
    </section>

    <section class="project-detail-notes">
      <article>
        <h3>Objetivo estratégico</h3>
        <p>${rcsEsc(msa.strategicGoal || "No informado.")}</p>
      </article>

      <article>
        <h3>Valor de negocio</h3>
        <p>${rcsEsc(msa.businessValue || "No informado.")}</p>
      </article>

      <article>
        <h3>Riesgos principales</h3>
        <p>${rcsEsc(msa.mainRisks || "No informado.")}</p>
      </article>

      <article>
        <h3>Dependencias</h3>
        <p>${rcsEsc(msa.dependencies || "No informado.")}</p>
      </article>
    </section>
  `;
}
/*MSAs*/

/* sample data */
loadSampleData().then((data) => {
  console.log(data);
});
/* sample data */

/* loading overlay */
function showLoadingOverlay(
  message = "Actualizando la información del cockpit...",
) {
  const overlay = document.querySelector("#loadingOverlay");

  if (!overlay) return;

  const text = overlay.querySelector("p");
  if (text) text.textContent = message;

  overlay.hidden = false;
}

function hideLoadingOverlay() {
  const overlay = document.querySelector("#loadingOverlay");

  if (!overlay) return;

  overlay.hidden = true;
}

/* loading overlay */
/* executive summary by Q */
function getQuarterOrder(quarter) {
  return (
    {
      Q1: 1,
      Q2: 2,
      Q3: 3,
      Q4: 4,
    }[quarter] || 99
  );
}

function getExecutiveItems(programId) {
  const projects = getProgramProjects(programId).map((item) => ({
    ...item,
    itemType: "project",
    itemTypeLabel: "Proyecto",
  }));

  const msas = getProgramMsas(programId).map((item) => ({
    ...item,
    itemType: "msa",
    itemTypeLabel: "MSA",
  }));

  return [...projects, ...msas]
    .filter((item) => item.quarter)
    .sort((a, b) => {
      const quarterDiff =
        getQuarterOrder(a.quarter) - getQuarterOrder(b.quarter);

      if (quarterDiff !== 0) return quarterDiff;

      return Number(a.priority || 999) - Number(b.priority || 999);
    });
}
function renderExecutiveQuarterView(programId) {
  const container = document.querySelector("#executiveQuarterView");
  if (!container) return;

  const allItems = getExecutiveItems(programId);

  const visibleItems =
    executiveQuarter === "ALL"
      ? allItems
      : allItems.filter((item) => item.quarter === executiveQuarter);

  const groupedByQuarter = visibleItems.reduce((acc, item) => {
    const quarter = item.quarter || "Sin trimestre";

    if (!acc[quarter]) acc[quarter] = [];

    acc[quarter].push(item);

    return acc;
  }, {});

  const quartersToRender =
    executiveQuarter === "ALL"
      ? ["Q1", "Q2", "Q3", "Q4"].filter((q) => groupedByQuarter[q])
      : [executiveQuarter];

  if (!visibleItems.length) {
    container.innerHTML = `
      <p class="empty-state">
        No hay proyectos ni MSAs para esta selección.
      </p>
    `;
    return;
  }

  container.innerHTML = quartersToRender
    .map(
      (quarter) => `
        <section class="executive-quarter-group">
          <h4>${quarter}</h4>

          <div class="executive-quarter-grid">
            ${(groupedByQuarter[quarter] || [])
              .map((item) => {
                const status = rcsNormalizeStatus(item.status);

                return `
                  <article
                    class="executive-item-card"
                    data-executive-item-type="${item.itemType}"
                    data-executive-item-id="${rcsEsc(item.id)}"
                    role="button"
                    tabindex="0"
                  >
                    <div class="executive-item-top">
                      <span class="status-pill status-${status}">
                        ${rcsStatusLabel(status)}
                      </span>

                      <span class="executive-item-type">
                        ${item.itemTypeLabel}
                      </span>
                    </div>

                    <h5>${rcsEsc(item.name)}</h5>

                    <p>${rcsEsc(item.summary || "")}</p>

                    <div class="executive-item-meta">
                      <span>${rcsEsc(item.quarter)}</span>
                      <span>Prioridad ${rcsEsc(item.priority || "-")}</span>
                      <span>${rcsEsc(item.progress || 0)}%</span>
                    </div>
                  </article>
                `;
              })
              .join("")}
          </div>
        </section>
      `,
    )
    .join("");
}
/* executive summery by Q */
/* calendar */
function getPhaseStartDate(phase) {
  return parseValidDate(
    phase.startDate || phase.start_date || phase.start || phase.beginDate,
  );
}

function getPhaseEndDate(phase) {
  return parseValidDate(phase.endDate);
}

function getPhaseTargetDate(phase) {
  return parseValidDate(phase.targetDate || phase.target_date);
}

function parseValidDate(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const text = String(value).trim();

  const ddmmyyyy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;

    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) return null;

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function renderPhaseTimeline(phases, container) {
  if (!container || !Array.isArray(phases) || !phases.length) return;

  const validPhases = phases
    .map((phase) => ({
      ...phase,
      _start: getPhaseStartDate(phase),
      _end: getPhaseEndDate(phase),
      _target: getPhaseTargetDate(phase),
    }))
    .filter((phase) => phase._start && phase._end);

  if (!validPhases.length) {
    container.innerHTML = `
      <p class="empty-state">
        No hay fechas válidas para pintar el calendario.
      </p>
    `;
    return;
  }

  const minDate = new Date(
    Math.min(...validPhases.map((phase) => phase._start.getTime())),
  );

  const maxDate = new Date(
    Math.max(
      ...validPhases.map((phase) =>
        Math.max(
          phase._end.getTime(),
          phase._target ? phase._target.getTime() : phase._end.getTime(),
        ),
      ),
    ),
  );

  const months = [];
  const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);

  while (current <= maxDate) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }

  container.innerHTML = `
    <div class="phase-timeline-wrap">
      <h4>Calendario por meses</h4>

      <div class="phase-timeline" style="--month-count:${months.length}">
        ${buildTimeline(months, validPhases)}
      </div>
    </div>
  `;
}

function buildTimeline(months, phases) {
  let html = `<div class="timeline-header">Fase</div>`;

  months.forEach((month) => {
    html += `
      <div class="timeline-month">
        ${month.toLocaleDateString("es-ES", {
          month: "short",
          year: "numeric",
        })}
      </div>
    `;
  });

  phases.forEach((phase) => {
    html += `
      <div class="timeline-phase-name">
        <strong>${rcsEsc(phase.phaseName || phase.name || "-")}</strong>
          <small>
            Marco: ${formatDate(phase.startDate)} → ${formatDate(phase.endDate)}
            Entrega: ${formatDate(phase.targetDate)}
          </small>
      </div>
    `;

    months.forEach((month) => {
      html += buildMonthCell(phase, month);
    });
  });

  return html;
}

function buildMonthCell(phase, month) {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const overlaps = phase._start <= monthEnd && phase._end >= monthStart;
  const targetInMonth =
    phase._target &&
    phase._target.getFullYear() === month.getFullYear() &&
    phase._target.getMonth() === month.getMonth();

  if (!overlaps && !targetInMonth) {
    return `<div class="timeline-cell"></div>`;
  }

  const status = rcsNormalizeStatus(phase.status);
  let barHtml = "";

  if (overlaps) {
    const visibleStart = phase._start > monthStart ? phase._start : monthStart;
    const visibleEnd = phase._end < monthEnd ? phase._end : monthEnd;

    const daysInMonth = monthEnd.getDate();
    const startDay = visibleStart.getDate();
    const endDay = visibleEnd.getDate();

    const left = ((startDay - 1) / daysInMonth) * 100;
    const width = ((endDay - startDay + 1) / daysInMonth) * 100;

    barHtml = `<span class="timeline-bar" style="left:${left}%; width:${width}%"></span>`;
  }

  let targetHtml = "";

  if (targetInMonth) {
    const daysInMonth = monthEnd.getDate();
    const targetDay = phase._target.getDate();
    const left = Math.min(((targetDay - 1) / daysInMonth) * 100, 96);

    const isNearEnd = targetDay >= daysInMonth - 2;
    const safeLeft = isNearEnd ? 96 : left;

    targetHtml = `
          <span
            class="timeline-target ${isNearEnd ? "is-near-end" : ""}"
            style="left:${safeLeft}%"
          >
            <em>🚩 ${formatDate(phase._target)}</em>
          </span>
        `;
  }

  return `
    <div class="timeline-cell timeline-${status}">
      ${barHtml}
      ${targetHtml}
    </div>
  `;
}

function formatDate(value) {
  const date = value instanceof Date ? value : parseValidDate(value);

  if (!date) return "-";

  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
/* calendar */

document.addEventListener("click", (event) => {
  const quarterButton = event.target.closest("[data-executive-quarter]");

  if (!quarterButton) return;

  executiveQuarter = quarterButton.dataset.executiveQuarter;

  render();
});
document.addEventListener("click", (event) => {
  const card = event.target.closest("[data-executive-item-type]");

  if (!card) return;

  const type = card.dataset.executiveItemType;
  const id = card.dataset.executiveItemId;

  const hash = location.hash.replace("#", "");
  const [, programId] = hash.split("/");

  if (type === "project") {
    route(`projects/${programId}`);
    requestAnimationFrame(() => {
      renderProjectDetailView(programId, id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (type === "msa") {
    route(`msas/${programId}`);
    requestAnimationFrame(() => {
      renderMsaDetailView(programId, id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
});
document
  .getElementById("dataSourceToggle")
  ?.addEventListener("change", async (e) => {
    window.APP_CONFIG.runtime = e.target.checked
      ? "google-sheets-api"
      : "local-json";
    window.APP_CONFIG.useGoogleSheets = e.target.checked ? false : true;

    await init(false);
  });
document
  .getElementById("refreshDataBtn")
  ?.addEventListener("click", async () => {
    const button = document.getElementById("refreshDataBtn");

    if (button) {
      button.disabled = true;
      button.textContent = "Actualizando...";
    }

    try {
      await init(false);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Actualizar datos";
      }
    }
  });
document.getElementById("backlogHeader")?.scrollIntoView({
  behavior: "smooth",
  block: "start",
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-route]");
  if (b) route(b.dataset.route);
});
document.addEventListener("click", (e) => {
  const countryButton = e.target.closest("[data-country]");

  if (!countryButton) return;

  selectedCountry = countryButton.dataset.country;

  render();
});

document
  .getElementById("openDataSourceBtn")
  ?.addEventListener("click", openDataSource);

document.addEventListener("click", (e) => {
  const productButton = e.target.closest("[data-system-product]");

  if (!productButton) return;

  selectedSystemProduct = productButton.dataset.systemProduct;

  render();
});
document.addEventListener("click", (event) => {
  const feature = event.target.closest("[data-feature]");

  if (!feature) return;

  const featureKey = feature.dataset.feature;

  selectedCapability = selectedCapability === featureKey ? null : featureKey;
  selectedArchitectureGap = null;
  render();
});
document.addEventListener("click", (event) => {
  const componentButton = event.target.closest("[data-system-component]");

  if (!componentButton) return;

  const componentName = componentButton.dataset.systemComponent;

  selectedSystemComponent =
    selectedSystemComponent === componentName ? null : componentName;

  render();
});
document.addEventListener("click", (event) => {
  const gapButton = event.target.closest("[data-architecture-gap]");

  if (!gapButton) return;

  const gapKey = gapButton.dataset.architectureGap;

  selectedArchitectureGap = selectedArchitectureGap === gapKey ? null : gapKey;
  selectedCapability = null;
  render();
});
document.addEventListener("click", (event) => {
  const expandButton = event.target.closest("#expandSystemMapBtn");

  if (!expandButton) return;

  isSystemMapExpanded = !isSystemMapExpanded;

  render();
});
document.addEventListener("click", (event) => {
  const button = event.target.closest("#localismsToggleBtn");

  if (!button) return;

  showProgramLocalisms = !showProgramLocalisms;

  render();
});
document.addEventListener("click", (event) => {
  const expandButton = event.target.closest("#expandToBeMapBtn");

  if (!expandButton) return;

  isToBeMapExpanded = !isToBeMapExpanded;

  render();
});
window.addEventListener("hashchange", render);
init();
