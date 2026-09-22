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
  let SELECTED_STAFFING_DOMAIN = "";

  let SELECTED_STAFFING_POOL = "";
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

      (position.assignments || []).forEach((assignment) => {
        const fte = Number(assignment.fte || 0);

        if (!Number.isFinite(fte) || fte <= 0) {
          return;
        }

        const type = fold(assignment.type);

        if (type.includes("interno")) {
          internalFte += fte;

          return;
        }

        if (type.includes("externo")) {
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
  function staffingReportingDomain(position) {
    const domainCode = String(position?.domain?.code || "")
      .trim()
      .toUpperCase();

    const domainLabel = fold(position?.domain?.label);

    const poolLabel = fold(position?.pool?.label);

    /*
     * =====================================================
     * RCS ENGINEERING
     * =====================================================
     *
     * Estos Pools pertenecen funcionalmente a RCS
     * aunque en Staffing puedan venir bajo dominio ENG.
     */

    const rcsEngineeringPools = [
      "sw eng - deliv. retail rcs",
      "architecture at rcs",
      "sw eng - retail",
      "business",
      "design, marketing & be",
    ];

    if (
      rcsEngineeringPools.some(
        (pool) => poolLabel === pool || poolLabel.includes(pool),
      )
    ) {
      return "RCS Engineering";
    }

    /*
     * =====================================================
     * DATA
     * =====================================================
     */

    const dataPools = [
      "ai factory",
      "data engineer",
      "architecture at data",
      "data scientist",
      "data team",
    ];

    if (
      dataPools.some((pool) => poolLabel === pool || poolLabel.includes(pool))
    ) {
      return "Data";
    }

    /*
     * =====================================================
     * FALLBACK POR DOMINIO
     * =====================================================
     */

    if (
      domainCode === "RCS" ||
      domainLabel === "rcs" ||
      domainLabel.includes("retail client solutions")
    ) {
      return "RCS Engineering";
    }

    if (domainCode === "DAT" || domainLabel === "data") {
      return "Data";
    }

    /*
     * ENG sin Pool reconocido no se asigna
     * automáticamente a Data.
     *
     * Así evitamos volver a clasificar erróneamente
     * Pools de RCS Engineering.
     */

    return "Sin dominio";
  }

  function staffingPoolLabel(position) {
    const label = String(position?.pool?.label || "").trim();

    if (label) {
      return label;
    }

    const code = String(position?.pool?.code || "").trim();

    if (code) {
      return code;
    }

    return "Sin Pool";
  }

  function staffingPoolMetrics(rows) {
    const pools = new Map();

    rows.forEach((position) => {
      const domain = staffingReportingDomain(position);

      const pool = staffingPoolLabel(position);

      const key = `${domain}::${pool}`;

      if (!pools.has(key)) {
        pools.set(key, {
          domain,

          pool,

          totalFte: 0,

          internalFte: 0,

          externalFte: 0,

          unassignedFte: 0,

          positions: new Set(),
        });
      }

      const metric = pools.get(key);

      const demandFte = Number(position.demandFte || 0);

      metric.totalFte += demandFte;

      if (position.id) {
        metric.positions.add(String(position.id));
      }

      let positionInternalFte = 0;

      let positionExternalFte = 0;

      (position.assignments || []).forEach((assignment) => {
        const fte = Number(assignment.fte || 0);

        if (!Number.isFinite(fte) || fte <= 0) {
          return;
        }

        const assignmentType = fold(assignment.type);

        if (assignmentType.includes("interno")) {
          positionInternalFte += fte;

          return;
        }

        if (assignmentType.includes("externo")) {
          positionExternalFte += fte;
        }
      });

      metric.internalFte += positionInternalFte;

      metric.externalFte += positionExternalFte;

      metric.unassignedFte += Math.max(
        0,
        demandFte - positionInternalFte - positionExternalFte,
      );
    });

    return [...pools.values()]
      .map((pool) => ({
        ...pool,

        positions: pool.positions.size,
      }))
      .sort(
        (left, right) =>
          left.domain.localeCompare(right.domain, "es") ||
          right.totalFte - left.totalFte ||
          left.pool.localeCompare(right.pool, "es"),
      );
  }

  function staffingDomainMetrics(rows) {
    const domains = new Map();

    staffingPoolMetrics(rows).forEach((pool) => {
      if (!domains.has(pool.domain)) {
        domains.set(pool.domain, {
          domain: pool.domain,

          totalFte: 0,

          internalFte: 0,

          externalFte: 0,

          unassignedFte: 0,

          positions: 0,

          pools: 0,
        });
      }

      const metric = domains.get(pool.domain);

      metric.totalFte += pool.totalFte;

      metric.internalFte += pool.internalFte;

      metric.externalFte += pool.externalFte;

      metric.unassignedFte += pool.unassignedFte;

      metric.positions += pool.positions;

      metric.pools += 1;
    });

    const preferredOrder = ["Data", "RCS Engineering", "Sin dominio"];

    return [...domains.values()].sort((left, right) => {
      const leftIndex = preferredOrder.indexOf(left.domain);

      const rightIndex = preferredOrder.indexOf(right.domain);

      return (
        (leftIndex >= 0 ? leftIndex : 99) -
          (rightIndex >= 0 ? rightIndex : 99) ||
        left.domain.localeCompare(right.domain, "es")
      );
    });
  }
  function staffingPoolDetailPositions(rows, domainName, poolName) {
    return rows
      .filter(
        (position) =>
          staffingReportingDomain(position) === domainName &&
          staffingPoolLabel(position) === poolName,
      )
      .map((position) => {
        let internalFte = 0;

        let externalFte = 0;

        const companies = new Set();

        const people = [];

        (position.assignments || []).forEach((assignment) => {
          const fte = Number(assignment.fte || 0);

          if (Number.isFinite(fte) && fte > 0) {
            const assignmentType = fold(assignment.type);

            if (assignmentType.includes("interno")) {
              internalFte += fte;
            } else if (assignmentType.includes("externo")) {
              externalFte += fte;
            }
          }

          const company = String(assignment.company || "").trim();

          if (company && !fold(company).startsWith("sin ")) {
            companies.add(company);
          }

          const personName = String(assignment.personName || "").trim();

          if (personName) {
            people.push({
              name: personName,
              fte,
              type: String(assignment.type || "").trim(),
              company,
            });
          }
        });

        const demandFte = Number(position.demandFte || 0);

        const unassignedFte = Math.max(
          0,
          demandFte - internalFte - externalFte,
        );

        let assignmentLabel = "Sin asignar";

        if (internalFte > 0 && externalFte > 0) {
          assignmentLabel = "Mixto";
        } else if (internalFte > 0) {
          assignmentLabel = "Interno";
        } else if (externalFte > 0) {
          assignmentLabel = "Externo";
        }

        return {
          id: String(position.id || ""),

          people,

          scrum: String(position._scrum || position.scrum || "Sin Scrum"),

          role: String(position.role || "Sin rol"),

          profile: String(position.profile || "Sin perfil"),

          country: String(
            position?.country?.label || position?.country?.code || "Sin país",
          ),

          demandFte,

          internalFte,

          externalFte,

          unassignedFte,

          assignmentLabel,

          companies: [...companies],
        };
      })
      .sort(
        (left, right) =>
          right.demandFte - left.demandFte ||
          left.role.localeCompare(right.role, "es"),
      );
  }
  function renderKpis(rows) {
    const container = document.querySelector("#teamsKpis");

    if (!container) {
      return;
    }

    const domains = staffingDomainMetrics(rows);

    const pools = staffingPoolMetrics(rows);

    const availableDomains = domains.filter(
      (domain) =>
        domain.domain === "Data" || domain.domain === "RCS Engineering",
    );

    if (
      SELECTED_STAFFING_DOMAIN &&
      !availableDomains.some(
        (domain) => domain.domain === SELECTED_STAFFING_DOMAIN,
      )
    ) {
      SELECTED_STAFFING_DOMAIN = "";

      SELECTED_STAFFING_POOL = "";
    }

    const selectedPools = SELECTED_STAFFING_DOMAIN
      ? pools.filter((pool) => pool.domain === SELECTED_STAFFING_DOMAIN)
      : [];

    if (
      SELECTED_STAFFING_POOL &&
      !selectedPools.some((pool) => pool.pool === SELECTED_STAFFING_POOL)
    ) {
      SELECTED_STAFFING_POOL = "";
    }

    container.className = "";

    const domainCardsHtml = `
    <section
      style="
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      "
    >
      ${availableDomains
        .map((domain) => {
          const isActive = domain.domain === SELECTED_STAFFING_DOMAIN;

          return `
            <article
              data-staffing-domain="${rcsEsc(domain.domain)}"
              role="button"
              tabindex="0"
              aria-pressed="${isActive ? "true" : "false"}"
              style="
                display: grid;
                gap: 14px;
                min-height: 190px;
                padding: 24px 26px;

                border:
                  ${isActive ? "2px" : "1px"}
                  solid
                  ${isActive ? "var(--blue)" : "var(--line)"};

                border-radius: 20px;

                background:
                  ${isActive ? "#f4f7ff" : "#ffffff"};

                box-shadow:
                  ${
                    isActive
                      ? "0 12px 30px rgba(7, 26, 140, 0.10)"
                      : "var(--shadow)"
                  };

                color: inherit;

                text-align: left;
                cursor: pointer;
              "
            >
              <div
                style="
                  display: flex;
                  align-items: flex-start;
                  justify-content: space-between;
                  gap: 16px;
                "
              >
                <div>
                  <span
                    style="
                      display: block;
                      margin-bottom: 6px;

                      color: var(--muted);

                      font-size: 11px;
                      font-weight: 900;
                      letter-spacing: 0.08em;
                      text-transform: uppercase;
                    "
                  >
                    Dominio
                  </span>

                  <strong
                    style="
                      display: block;

                      color: var(--blue);

                      font-family: Georgia, serif;
                      font-size: 24px;
                      line-height: 1.1;
                    "
                  >
                    ${rcsEsc(domain.domain)}
                  </strong>
                </div>

                <span
                  style="
                    display: grid;

                    width: 36px;
                    height: 36px;

                    place-items: center;

                    border-radius: 999px;

                    background:
                      ${isActive ? "var(--blue)" : "#edf3ff"};

                    color:
                      ${isActive ? "#ffffff" : "var(--blue)"};

                    font-size: 18px;
                    font-weight: 900;
                  "
                >
                  ${isActive ? "−" : "+"}
                </span>
              </div>

              <div>
                <strong
                  style="
                    display: block;

                    color: var(--blue);

                    font-family: Georgia, serif;
                    font-size: 44px;
                    line-height: 1;
                  "
                >
                  ${formatFte(domain.totalFte)}
                </strong>

                <span
                  style="
                    display: block;
                    margin-top: 4px;

                    color: var(--blue);

                    font-size: 14px;
                    font-weight: 900;
                  "
                >
                  FTE
                </span>
              </div>

              <div
                style="
                  display: flex;
                  align-items: center;
                  gap: 14px;

                  padding-top: 12px;

                  border-top: 1px solid var(--line);

                  color: var(--muted);

                  font-size: 12px;
                  font-weight: 700;
                "
              >
                <span>
                  ${domain.pools}
                  ${domain.pools === 1 ? "Pool" : "Pools"}
                </span>

                <span>
                  ${domain.positions}
                  posiciones
                </span>
              </div>
            </article>
          `;
        })
        .join("")}
    </section>
  `;

    const poolsHtml = !SELECTED_STAFFING_DOMAIN
      ? `
      <div
        style="
          margin-top: 16px;
          padding: 14px 4px 0;

          color: var(--muted);

          font-size: 13px;
          text-align: center;
        "
      >
        Selecciona un dominio para ver sus Pools.
      </div>
    `
      : `
      <section
        style="
          margin-top: 24px;
        "
      >
        <div
          style="
            display: flex;
            align-items: end;
            justify-content: space-between;
            gap: 16px;

            margin-bottom: 12px;
          "
        >
          <div>
            <span
              style="
                display: block;
                margin-bottom: 4px;

                color: var(--muted);

                font-size: 10px;
                font-weight: 900;
                letter-spacing: 0.08em;
                text-transform: uppercase;
              "
            >
              ${rcsEsc(SELECTED_STAFFING_DOMAIN)}
            </span>

            <strong
              style="
                color: var(--blue);

                font-family: Georgia, serif;
                font-size: 22px;
              "
            >
              Pools
            </strong>
          </div>

          <span
            style="
              color: var(--muted);

              font-size: 12px;
              font-weight: 700;
            "
          >
            ${selectedPools.length}
            ${selectedPools.length === 1 ? "Pool" : "Pools"}
          </span>
        </div>

        <div
          style="
            display: grid;

            grid-template-columns:
              repeat(auto-fit, minmax(250px, 1fr));

            gap: 12px;
          "
        >
          ${selectedPools
            .map((pool) => {
              const isActive = pool.pool === SELECTED_STAFFING_POOL;

              return `
                <article
                  data-staffing-pool="${rcsEsc(pool.pool)}"
                  role="button"
                  tabindex="0"
                  aria-pressed="${isActive ? "true" : "false"}"

                  style="
                    display: grid;
                    gap: 14px;

                    min-width: 0;
                    padding: 18px;

                    border:
                      ${isActive ? "2px" : "1px"}
                      solid
                      ${isActive ? "var(--blue)" : "var(--line)"};

                    border-radius: 16px;

                    background:
                      ${isActive ? "#f4f7ff" : "#ffffff"};

                    color: inherit;

                    text-align: left;
                    cursor: pointer;

                    box-shadow:
                      ${
                        isActive ? "0 8px 22px rgba(7, 26, 140, 0.08)" : "none"
                      };
                  "
                >
                  <div
                    style="
                      display: flex;
                      align-items: flex-start;
                      justify-content: space-between;
                      gap: 14px;
                    "
                  >
                    <div
                      style="
                        min-width: 0;
                      "
                    >
                      <span
                        style="
                          display: block;
                          margin-bottom: 4px;

                          color: var(--muted);

                          font-size: 10px;
                          font-weight: 900;
                          letter-spacing: 0.08em;
                          text-transform: uppercase;
                        "
                      >
                        Pool
                      </span>

                      <strong
                        style="
                          display: block;

                          color: var(--blue);

                          font-size: 15px;
                          line-height: 1.25;
                        "
                      >
                        ${rcsEsc(pool.pool)}
                      </strong>
                    </div>

                    <div
                      style="
                        flex: 0 0 auto;
                        text-align: right;
                      "
                    >
                      <strong
                        style="
                          display: block;

                          color: var(--blue);

                          font-family: Georgia, serif;
                          font-size: 26px;
                          line-height: 1;
                        "
                      >
                        ${formatFte(pool.totalFte)}
                      </strong>

                      <span
                        style="
                          color: var(--muted);

                          font-size: 10px;
                          font-weight: 900;
                        "
                      >
                        FTE
                      </span>
                    </div>
                  </div>

                  <div
                    style="
                      display: grid;

                      grid-template-columns:
                        repeat(3, minmax(0, 1fr));

                      gap: 8px;

                      padding-top: 12px;

                      border-top: 1px solid var(--line);
                    "
                  >
                    <div>
                      <span
                        style="
                          display: block;

                          color: var(--muted);

                          font-size: 10px;
                        "
                      >
                        Interno
                      </span>

                      <strong
                        style="
                          color: var(--blue);

                          font-size: 14px;
                        "
                      >
                        ${formatFte(pool.internalFte)}
                      </strong>
                    </div>

                    <div>
                      <span
                        style="
                          display: block;

                          color: var(--muted);

                          font-size: 10px;
                        "
                      >
                        Externo
                      </span>

                      <strong
                        style="
                          color: var(--blue);

                          font-size: 14px;
                        "
                      >
                        ${formatFte(pool.externalFte)}
                      </strong>
                    </div>

                    <div>
                      <span
                        style="
                          display: block;

                          color: var(--muted);

                          font-size: 10px;
                        "
                      >
                        Sin asignar
                      </span>

                      <strong
                        style="
                          color: var(--blue);

                          font-size: 14px;
                        "
                      >
                        ${formatFte(pool.unassignedFte)}
                      </strong>
                    </div>
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      </section>
    `;

    let detailHtml = "";

    if (SELECTED_STAFFING_DOMAIN && SELECTED_STAFFING_POOL) {
      const selectedPoolMetric = selectedPools.find(
        (pool) => pool.pool === SELECTED_STAFFING_POOL,
      );

      const detailPositions = staffingPoolDetailPositions(
        rows,
        SELECTED_STAFFING_DOMAIN,
        SELECTED_STAFFING_POOL,
      );

      const assignments = detailPositions.flatMap((position) => {
        if (!position.people.length) {
          return [
            {
              personName: "Sin asignar",

              scrum: position.scrum,

              role: position.role,

              country: position.country,

              fte: position.unassignedFte || position.demandFte,

              assignmentLabel: "Sin asignar",

              company: "—",
            },
          ];
        }

        return position.people.map((person) => {
          const assignmentType = fold(person.type);

          let assignmentLabel = "Asignado";

          if (assignmentType.includes("interno")) {
            assignmentLabel = "Interno";
          } else if (assignmentType.includes("externo")) {
            assignmentLabel = "Externo";
          }

          return {
            personName: person.name,

            scrum: position.scrum,

            role: position.role,

            country: position.country,

            fte: person.fte,

            assignmentLabel,

            company:
              person.company && !fold(person.company).startsWith("sin ")
                ? person.company
                : "—",
          };
        });
      });

      detailHtml = `
      <section
        style="
          margin-top: 18px;

          border: 1px solid var(--line);
          border-radius: 18px;

          background: #ffffff;

          overflow: hidden;
        "
      >
        <div
          style="
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;

            padding: 20px 22px;

            background: #f7f9ff;

            border-bottom: 1px solid var(--line);
          "
        >
          <div>
            <span
              style="
                display: block;
                margin-bottom: 5px;

                color: var(--muted);

                font-size: 10px;
                font-weight: 900;
                letter-spacing: 0.08em;
                text-transform: uppercase;
              "
            >
              ${rcsEsc(SELECTED_STAFFING_DOMAIN)} · Pool
            </span>

            <h3
              style="
                margin: 0;

                color: var(--blue);

                font-family: Georgia, serif;
                font-size: 24px;
              "
            >
              ${rcsEsc(SELECTED_STAFFING_POOL)}
            </h3>
          </div>

          <div
            style="
              text-align: right;
            "
          >
            <strong
              style="
                display: block;

                color: var(--blue);

                font-family: Georgia, serif;
                font-size: 32px;
                line-height: 1;
              "
            >
              ${formatFte(selectedPoolMetric?.totalFte || 0)}
            </strong>

            <span
              style="
                color: var(--muted);

                font-size: 11px;
                font-weight: 900;
              "
            >
              FTE
            </span>
          </div>
        </div>

        <div
          style="
            display: grid;

            grid-template-columns:
              repeat(4, minmax(0, 1fr));

            border-bottom: 1px solid var(--line);
          "
        >
          ${[
            ["Interno", selectedPoolMetric?.internalFte || 0],
            ["Externo", selectedPoolMetric?.externalFte || 0],
            ["Sin asignar", selectedPoolMetric?.unassignedFte || 0],
            ["Posiciones", selectedPoolMetric?.positions || 0],
          ]
            .map(
              ([label, value], index) => `
                <div
                  style="
                    padding: 14px 18px;

                    ${index ? "border-left: 1px solid var(--line);" : ""}
                  "
                >
                  <span
                    style="
                      display: block;
                      margin-bottom: 3px;

                      color: var(--muted);

                      font-size: 10px;
                    "
                  >
                    ${rcsEsc(label)}
                  </span>

                  <strong
                    style="
                      color: var(--blue);

                      font-size: 16px;
                    "
                  >
                    ${label === "Posiciones" ? value : formatFte(value)}
                  </strong>
                </div>
              `,
            )
            .join("")}
        </div>

        <div
          style="
            padding: 18px 22px 22px;
          "
        >
          <div
            style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;

              margin-bottom: 12px;
            "
          >
            <strong
              style="
                color: var(--blue);

                font-family: Georgia, serif;
                font-size: 18px;
              "
            >
              FTEs
            </strong>

            <span
              style="
                color: var(--muted);

                font-size: 12px;
              "
            >
              ${assignments.length}
            </span>
          </div>

          <div
            style="
              overflow-x: auto;
            "
          >
            <table
              style="
                width: 100%;

                border-collapse: collapse;

                font-size: 12px;
              "
            >
              <thead>
                <tr
                  style="
                    background: #f4f7fb;
                  "
                >
                  ${[
                    "Persona",
                    "Scrum",
                    "Rol",
                    "País",
                    "FTE",
                    "Asignación",
                    "Empresa",
                  ]
                    .map(
                      (label) => `
                        <th
                          style="
                            padding: 10px 12px;

                            border-bottom: 1px solid var(--line);

                            color: var(--blue);

                            text-align: left;
                            white-space: nowrap;
                          "
                        >
                          ${rcsEsc(label)}
                        </th>
                      `,
                    )
                    .join("")}
                </tr>
              </thead>

              <tbody>
                ${assignments
                  .map(
                    (assignment) => `
                      <tr>
                        <td
                          style="
                            padding: 10px 12px;

                            border-bottom: 1px solid var(--line);

                            color: var(--blue);

                            font-weight: 800;
                          "
                        >
                          ${rcsEsc(assignment.personName)}
                        </td>

                        <td
                          style="
                            padding: 10px 12px;
                            border-bottom: 1px solid var(--line);
                          "
                        >
                          ${rcsEsc(assignment.scrum)}
                        </td>

                        <td
                          style="
                            padding: 10px 12px;
                            border-bottom: 1px solid var(--line);
                          "
                        >
                          ${rcsEsc(assignment.role)}
                        </td>

                        <td
                          style="
                            padding: 10px 12px;
                            border-bottom: 1px solid var(--line);
                          "
                        >
                          ${rcsEsc(assignment.country)}
                        </td>

                        <td
                          style="
                            padding: 10px 12px;

                            border-bottom: 1px solid var(--line);

                            color: var(--blue);

                            font-weight: 900;
                          "
                        >
                          ${formatFte(assignment.fte)}
                        </td>

                        <td
                          style="
                            padding: 10px 12px;
                            border-bottom: 1px solid var(--line);
                          "
                        >
                          ${rcsEsc(assignment.assignmentLabel)}
                        </td>

                        <td
                          style="
                            padding: 10px 12px;
                            border-bottom: 1px solid var(--line);
                          "
                        >
                          ${rcsEsc(assignment.company)}
                        </td>
                      </tr>
                    `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
    }

    container.innerHTML = `
    ${domainCardsHtml}

    ${poolsHtml}

    ${detailHtml}
  `;

    const domainCards = container.querySelectorAll("[data-staffing-domain]");

    domainCards.forEach((card) => {
      card.addEventListener("click", () => {
        const domain = String(card.dataset.staffingDomain || "").trim();

        if (SELECTED_STAFFING_DOMAIN === domain) {
          SELECTED_STAFFING_DOMAIN = "";

          SELECTED_STAFFING_POOL = "";
        } else {
          SELECTED_STAFFING_DOMAIN = domain;

          SELECTED_STAFFING_POOL = "";
        }

        renderKpis(rows);
      });
    });

    const poolCards = container.querySelectorAll("[data-staffing-pool]");

    poolCards.forEach((card) => {
      card.addEventListener("click", (event) => {
        event.stopPropagation();

        const pool = String(card.dataset.staffingPool || "").trim();

        SELECTED_STAFFING_POOL = SELECTED_STAFFING_POOL === pool ? "" : pool;

        renderKpis(rows);
      });
    });
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
