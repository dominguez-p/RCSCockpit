(() => {
  const COUNTRY_IDS = ["ES", "MX", "PE", "CO", "HL"];

  const COUNTRY_ALIASES = {
    ES: "ES",
    ESP: "ES",
    SPN: "ES",
    MX: "MX",
    MEX: "MX",
    PE: "PE",
    PER: "PE",
    CO: "CO",
    COL: "CO",
    HL: "HL",
    HLD: "HL",
  };
  const PRODUCT_SELECTION = new Map();

  function normalizeDashboardProductId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getStaffingAvailableProducts(programId) {
    const dataset = STAFFING_DATA_CACHE.get(String(programId || "").trim());

    if (!dataset || !Array.isArray(dataset.products)) {
      return [];
    }

    return dataset.products
      .map((product) => {
        const id = normalizeDashboardProductId(product?.productId);

        return {
          id,

          label: productLabel(id),

          product,
        };
      })
      .filter((item) => item.id);
  }

  function getStaffingProductSelection(programId, originProductId = "") {
    const normalizedProgramId = String(programId || "").trim();

    const normalizedOrigin = normalizeDashboardProductId(originProductId);

    const available = getStaffingAvailableProducts(normalizedProgramId);

    const availableIds = available.map((item) => item.id);

    const signature = availableIds.join("|");

    let state = PRODUCT_SELECTION.get(normalizedProgramId);

    const contextChanged = !state || state.originProductId !== normalizedOrigin;

    if (contextChanged) {
      const selected = new Set();

      if (normalizedOrigin && availableIds.includes(normalizedOrigin)) {
        selected.add(normalizedOrigin);
      } else {
        availableIds.forEach((id) => selected.add(id));
      }

      state = {
        originProductId: normalizedOrigin,

        signature,

        selected,
      };

      PRODUCT_SELECTION.set(normalizedProgramId, state);

      return {
        available,
        state,
      };
    }

    if (state.signature !== signature) {
      state.signature = signature;

      state.selected = new Set(
        [...state.selected].filter((id) => availableIds.includes(id)),
      );

      if (!state.selected.size) {
        if (normalizedOrigin && availableIds.includes(normalizedOrigin)) {
          state.selected.add(normalizedOrigin);
        } else {
          availableIds.forEach((id) => state.selected.add(id));
        }
      }
    }

    return {
      available,
      state,
    };
  }

  function getSelectedStaffingProductIds(programId) {
    const current = PRODUCT_SELECTION.get(String(programId || "").trim());

    return current ? new Set(current.selected) : new Set();
  }

  function getSelectedStaffingProductLabels(programId) {
    const { available, state } = getStaffingProductSelection(
      programId,
      PRODUCT_SELECTION.get(String(programId || "").trim())?.originProductId ||
        "",
    );

    return available
      .filter((product) => state.selected.has(product.id))
      .map((product) => product.label);
  }

  function renderStaffingProductSelector(programId, originProductId = "") {
    const container = document.querySelector("#teamsProductSelector");

    if (!container) {
      return;
    }

    const { available, state } = getStaffingProductSelection(
      programId,
      originProductId,
    );

    if (available.length <= 1) {
      container.innerHTML = available.length
        ? `
          <span
            class="staffing-product-selector__label"
          >
            PRODUCTO
          </span>

          <button
            class="
              staffing-product-btn
              active
            "
            type="button"
            disabled
          >
            ${rcsEsc(available[0].label)}
          </button>
        `
        : "";

      return;
    }

    const allSelected = available.every((product) =>
      state.selected.has(product.id),
    );

    container.innerHTML = `
    <span
      class="staffing-product-selector__label"
    >
      PRODUCTOS
    </span>

    <button
      class="
        staffing-product-btn
        ${allSelected ? "active" : ""}
      "
      type="button"
      data-staffing-product="ALL"
    >
      Todos
    </button>

    ${available
      .map(
        (product) => `
          <button
            class="
              staffing-product-btn
              ${state.selected.has(product.id) ? "active" : ""}
            "
            type="button"
            data-staffing-product="${product.id}"
          >
            ${state.selected.has(product.id) ? "✓ " : ""}${rcsEsc(
              product.label,
            )}
          </button>
        `,
      )
      .join("")}
  `;
  }

  function fold(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function countryId(country) {
    const code = String(country?.code || "")
      .trim()
      .toUpperCase();

    if (COUNTRY_ALIASES[code]) {
      return COUNTRY_ALIASES[code];
    }

    const label = fold(country?.label);

    if (label.includes("holding")) {
      return "HL";
    }

    if (label.includes("espana")) {
      return "ES";
    }

    if (label.includes("mexico")) {
      return "MX";
    }

    if (label.includes("peru")) {
      return "PE";
    }

    if (label.includes("colombia")) {
      return "CO";
    }

    return code;
  }

  function isInternalCompany(name) {
    const value = fold(name);

    return value === "bbva" || value.includes("banco bilbao vizcaya");
  }

  function companies(position) {
    if (Array.isArray(position?.companies) && position.companies.length) {
      return position.companies;
    }

    return (position?.assignments || [])
      .filter((item) => item.company)
      .map((item) => ({
        name: item.company,

        fte: Number(item.fte || 0),
      }));
  }

  function productLabel(productId) {
    return (
      getAIxBankerProduct(productId)?.label ||
      String(productId || "")
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    );
  }

  function selectedPeriods(programId) {
    const normalizedProgramId = String(programId || "").trim();

    const dataset = STAFFING_DATA_CACHE.get(normalizedProgramId);

    if (!dataset?.products?.length) {
      return [];
    }

    const selectedProducts = getSelectedStaffingProductIds(normalizedProgramId);

    return dataset.products
      .filter((product) => {
        const productId = normalizeDashboardProductId(product.productId);

        return !selectedProducts.size || selectedProducts.has(productId);
      })
      .map((product) => {
        const periods = Array.isArray(product.periods) ? product.periods : [];

        const period =
          selectedTeamQuarter === "ALL"
            ? getStaffingLatestPeriod(normalizedProgramId, product.productId)
            : [...periods]
                .filter(
                  (item) =>
                    String(item?.quarter || "").trim() === selectedTeamQuarter,
                )
                .sort(
                  (left, right) =>
                    Number(right?.period || 0) - Number(left?.period || 0),
                )[0];

        if (!period) {
          return null;
        }

        const productId = normalizeDashboardProductId(product.productId);

        return {
          productId,

          productLabel: productLabel(productId),

          period,
        };
      })
      .filter(Boolean);
  }

  function positions(programId, filterCountry = true) {
    const rows = selectedPeriods(programId).flatMap((entry) =>
      (entry.period.scrums || []).flatMap((scrum) =>
        (scrum.positionDetails || []).map((position) => ({
          ...position,

          _productId: entry.productId,

          _productLabel: entry.productLabel,

          _scrum: String(scrum.name || scrum.id || "Sin Scrum").trim(),
        })),
      ),
    );

    if (!filterCountry) {
      return rows;
    }

    return rows.filter(
      (position) => countryId(position.country) === selectedCountry,
    );
  }

  function metrics(rows) {
    let totalFte = 0;
    let internalFte = 0;
    let externalFte = 0;

    const positionIds = new Set();

    const scrums = new Set();

    rows.forEach((position) => {
      totalFte += Number(position.demandFte || 0);

      if (position.id) {
        positionIds.add(String(position.id));
      }

      scrums.add(`${position._productId}::${position._scrum}`);

      companies(position).forEach((company) => {
        const fte = Number(company.fte || 0);

        if (!Number.isFinite(fte) || fte <= 0) {
          return;
        }

        if (isInternalCompany(company.name)) {
          internalFte += fte;

          return;
        }

        if (!fold(company.name).startsWith("sin ")) {
          externalFte += fte;
        }
      });
    });

    return {
      totalFte,

      internalFte,

      externalFte,

      unassignedFte: Math.max(0, totalFte - internalFte - externalFte),

      positions: positionIds.size,

      scrums: scrums.size,
    };
  }

  function scrumGroups(rows) {
    const groups = new Map();

    rows.forEach((position) => {
      const key = `${position._productId}::${position._scrum}`;

      if (!groups.has(key)) {
        groups.set(key, {
          name: position._scrum,

          productLabel: position._productLabel,

          positions: [],
        });
      }

      groups.get(key).positions.push(position);
    });

    return [...groups.values()].sort(
      (left, right) =>
        metrics(right.positions).totalFte - metrics(left.positions).totalFte,
    );
  }

  function breakdown(rows, type) {
    const result = new Map();

    const add = (name, fte) => {
      const key = String(name || "Sin informar").trim() || "Sin informar";

      result.set(key, (result.get(key) || 0) + Number(fte || 0));
    };

    rows.forEach((position) => {
      if (type === "role") {
        add(position.role, position.demandFte);
      }

      if (type === "profile") {
        add(position.profile || position.demandProfile, position.demandFte);
      }

      if (type === "company") {
        companies(position).forEach((company) =>
          add(company.name, company.fte),
        );
      }
    });

    return [...result.entries()]
      .map(([name, fte]) => ({
        name,
        fte,
      }))
      .sort((left, right) => right.fte - left.fte);
  }

  function renderKpis(rows) {
    const data = metrics(rows);

    const items = [
      ["⏱", "FTE total", data.totalFte],
      ["🏦", "FTE interno", data.internalFte],
      ["🤝", "FTE externo", data.externalFte],
      ["○", "Sin asignar", data.unassignedFte],
      ["▦", "Scrums", data.scrums],
      ["#", "Posiciones", data.positions],
    ];

    document.querySelector("#teamsKpis").innerHTML = items
      .map(
        ([icon, label, value]) => `
            <article
              class="kpi-card"
            >
              <div
                class="kpi-icon"
              >
                ${icon}
              </div>

              <div>
                <h3>
                  ${rcsEsc(label)}
                </h3>

                <strong>
                  ${formatFte(value)}
                </strong>
              </div>
            </article>
          `,
      )
      .join("");
  }

  function renderBars(rows) {
    const groups = scrumGroups(rows);

    const max = Math.max(
      1,
      ...groups.map((group) => metrics(group.positions).totalFte),
    );

    document.querySelector("#teamsByProduct").innerHTML = groups.length
      ? groups
          .map((group) => {
            const total = metrics(group.positions).totalFte;

            const percentage = Math.max(3, (total / max) * 100);

            return `
                  <div
                    class="team-bar-row"
                  >
                    <div
                      class="team-bar-head"
                    >
                      <strong>
                        ${rcsEsc(group.name)}
                      </strong>

                      <span>
                        ${formatFte(total)}
                        FTE
                      </span>
                    </div>

                    <div
                      class="team-bar"
                    >
                      <span
                        style="
                          width:
                          ${percentage}%
                        "
                      ></span>
                    </div>
                  </div>
                `;
          })
          .join("")
      : `
          <p class="empty-state">
            No hay Staffing para esta selección.
          </p>
        `;
  }

  function renderMatrix(programId) {
    const groups = scrumGroups(positions(programId, false));

    const table = document.querySelector("#teamsProductCountryMatrix");

    table.innerHTML = `
      <thead>
        <tr>
          <th>
            Scrum
          </th>

          ${COUNTRY_IDS.map((id) => `<th>${id}</th>`).join("")}
        </tr>
      </thead>

      <tbody>
        ${groups
          .map((group) => {
            const values = Object.fromEntries(COUNTRY_IDS.map((id) => [id, 0]));

            group.positions.forEach((position) => {
              const id = countryId(position.country);

              if (id in values) {
                values[id] += Number(position.demandFte || 0);
              }
            });

            return `
                <tr>
                  <td>
                    <strong>
                      ${rcsEsc(group.name)}
                    </strong>
                  </td>

                  ${COUNTRY_IDS.map(
                    (id) => `
                        <td
                          class="${
                            id === selectedCountry ? "matrix-active-cell" : ""
                          }"
                        >
                          ${formatFte(values[id])}
                        </td>
                      `,
                  ).join("")}
                </tr>
              `;
          })
          .join("")}
      </tbody>
    `;
  }

  function miniList(title, rows) {
    return `
      <div
        class="staffing-breakdown"
      >
        <strong>
          ${rcsEsc(title)}
        </strong>

        ${rows
          .slice(0, 4)
          .map(
            (row) => `
              <div>
                <span
                  title="${rcsEsc(row.name)}"
                >
                  ${rcsEsc(row.name)}
                </span>

                <b>
                  ${formatFte(row.fte)}
                </b>
              </div>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function renderCards(rows) {
    const groups = scrumGroups(rows);

    document.querySelector("#teamsScrumCards").innerHTML = groups.length
      ? groups
          .map((group) => {
            const data = metrics(group.positions);

            return `
                  <article
                    class="scrum-card"
                  >
                    <div
                      class="scrum-card-header"
                    >
                      <div>
                        <h3>
                          ${rcsEsc(group.name)}
                        </h3>

                        ${renderProductPill(group.productLabel)}
                      </div>

                      <span
                        class="status-pill"
                      >
                        ${formatFte(data.totalFte)}
                        FTE
                      </span>
                    </div>

                    <div
                      class="scrum-kpis"
                    >
                      <div
                        class="scrum-kpi"
                      >
                        <span
                          class="scrum-kpi-label"
                        >
                          Posiciones
                        </span>

                        <strong>
                          ${data.positions}
                        </strong>
                      </div>

                      <div
                        class="scrum-kpi"
                      >
                        <span
                          class="scrum-kpi-label"
                        >
                          Interno
                        </span>

                        <strong>
                          ${formatFte(data.internalFte)}
                        </strong>
                      </div>

                      <div
                        class="scrum-kpi"
                      >
                        <span
                          class="scrum-kpi-label"
                        >
                          Externo
                        </span>

                        <strong>
                          ${formatFte(data.externalFte)}
                        </strong>
                      </div>

                      <div
                        class="scrum-kpi"
                      >
                        <span
                          class="scrum-kpi-label"
                        >
                          Sin asignar
                        </span>

                        <strong>
                          ${formatFte(data.unassignedFte)}
                        </strong>
                      </div>
                    </div>

                    <div
                      class="staffing-breakdown-grid"
                    >
                      ${miniList("Roles", breakdown(group.positions, "role"))}

                      ${miniList(
                        "Perfiles",
                        breakdown(group.positions, "profile"),
                      )}

                      ${miniList(
                        "Empresas",
                        breakdown(group.positions, "company"),
                      )}
                    </div>
                  </article>
                `;
          })
          .join("")
      : `
          <p class="empty-state">
            No hay scrums informados para este país.
          </p>
        `;
  }

  async function render(programId, originProductId = "") {
    const id = String(programId || "").trim();

    const normalizedOrigin = normalizeDashboardProductId(originProductId);

    const program = (DATA.programs || []).find((item) => item.id === id);

    const country = COUNTRIES.find((item) => item.id === selectedCountry);

    view.innerHTML = "";

    view.append(tpl("#teams-template"));

    view.insertAdjacentHTML(
      "afterbegin",
      `
      <div
        class="staffing-filter-toolbar"
      >
        ${renderTeamsQuarterSelector()}

        <div
          id="teamsProductSelector"
          class="staffing-product-selector"
        >
        </div>
      </div>
    `,
    );

    const backButton = document.querySelector(".back-to-program-btn");

    if (backButton) {
      backButton.dataset.route = getFlightDeckReturnRoute(id);

      backButton.textContent = `← Volver a ${program?.name || "programa"}`;
    }

    const status = document.querySelector("#teamsDashboardStatus");

    if (status) {
      status.textContent = "Cargando Staffing...";
    }

    try {
      await loadStaffingData(id);

      const route = String(location.hash || "")
        .replace(/^#\/?/, "")
        .split("/");

      if (route[0] !== "teams" || route[1] !== id) {
        return;
      }

      getStaffingProductSelection(id, normalizedOrigin);

      renderStaffingProductSelector(id, normalizedOrigin);

      const currentRows = positions(id, true);

      const periods = selectedPeriods(id);

      const periodLabel = [
        ...new Set(
          periods.map(
            (entry) => `${entry.period.quarter} ${entry.period.year}`,
          ),
        ),
      ].join(" · ");

      const productLabels = getSelectedStaffingProductLabels(id);

      const productLabelText = productLabels.join(" + ");

      renderKpis(currentRows);

      renderBars(currentRows);

      renderMatrix(id);

      renderCards(currentRows);

      if (status) {
        status.textContent = [
          periodLabel || "Sin periodo",

          productLabelText || "Sin producto",
        ].join(" · ");
      }

      setHead(
        `${program?.name || id} · Teams`,

        [
          "Staffing",

          country?.label || selectedCountry,

          periodLabel || "Sin periodo",

          productLabelText,
        ]
          .filter(Boolean)
          .join(" · "),

        `Retail Client Solutions > ${program?.name || id} > ${
          productLabelText || "Staffing"
        } > Teams`,
      );
    } catch (error) {
      console.error("[Staffing Dashboard]", error);

      if (status) {
        status.textContent = "No se pudo cargar Staffing.";
      }
    }
  }
  function handleStaffingProductSelectionClick(event) {
    const button = event.target.closest("[data-staffing-product]");

    if (!button) {
      return;
    }

    const routeParts = String(location.hash || "")
      .replace(/^#\/?/, "")
      .split("/");

    if (routeParts[0] !== "teams") {
      return;
    }

    const programId = String(routeParts[1] || "").trim();

    const originProductId = String(routeParts[2] || "").trim();

    const { available, state } = getStaffingProductSelection(
      programId,
      originProductId,
    );

    const productId = String(button.dataset.staffingProduct || "").trim();

    if (productId === "ALL") {
      state.selected = new Set(available.map((product) => product.id));
    } else {
      const normalizedProductId = normalizeDashboardProductId(productId);

      if (state.selected.has(normalizedProductId)) {
        /*
         * Nunca dejamos la vista
         * sin productos.
         */
        if (state.selected.size > 1) {
          state.selected.delete(normalizedProductId);
        }
      } else {
        state.selected.add(normalizedProductId);
      }
    }

    PRODUCT_SELECTION.set(programId, state);

    window.RCS_STAFFING_DASHBOARD.render(programId, originProductId);
  }

  function handleFlightDeckStaffingNavigation(event) {
    const button = event.target.closest("#flightDeckTeamPlanning");

    if (!button) {
      return;
    }

    const routeParts = String(location.hash || "")
      .replace(/^#\/?/, "")
      .split("/");

    if (routeParts[0] !== "program") {
      return;
    }

    const programId = String(routeParts[1] || "").trim();

    const productId = normalizeDashboardProductId(
      routeParts[2] || (programId === "blue" ? "blue" : ""),
    );

    if (!programId || !productId) {
      return;
    }

    event.preventDefault();

    event.stopPropagation();

    sessionStorage.setItem(
      "flightDeckReturnRoute",
      `program/${programId}/${productId}`,
    );

    route(`teams/${programId}/${productId}`);
  }
  document.addEventListener("click", handleStaffingProductSelectionClick);

  document.addEventListener("click", handleFlightDeckStaffingNavigation, true);
  window.RCS_STAFFING_DASHBOARD = {
    render,
  };
})();
