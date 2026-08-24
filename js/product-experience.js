(function productExperienceFeature() {
  const PROGRAM_ID = "aixbanker";
  const HOLDING_COUNTRY_ID = "HL";

  const PRODUCT_RETURN_ROUTE_KEY = "productExperienceReturnRoute";

  function pxClean(value) {
    return String(value ?? "")
      .replace(/\\</g, "<")
      .trim();
  }

  function pxEsc(value) {
    if (typeof rcsEsc === "function") {
      return rcsEsc(pxClean(value));
    }

    return pxClean(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function pxNormalizeId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replaceAll("_", "-")
      .replace(/\s+/g, "-");
  }

  function pxBoolean(value) {
    if (typeof value === "boolean") {
      return value;
    }

    return !["false", "0", "no", "off", "disabled", "inactivo"].includes(
      String(value || "")
        .trim()
        .toLowerCase(),
    );
  }

  function pxRows(collectionName) {
    return Array.isArray(DATA?.[collectionName]) ? DATA[collectionName] : [];
  }

  function pxList(value) {
    if (Array.isArray(value)) {
      return value.map(pxClean).filter(Boolean);
    }

    return String(value || "")
      .split(/\r?\n|\|/)
      .map((item) => pxClean(item).replace(/^\s*[-•–—*]\s*/, ""))
      .filter(Boolean);
  }

  function pxExcerpt(value, maxLength = 220) {
    const text = pxClean(value);

    if (text.length <= maxLength) {
      return text;
    }

    const shortened = text.slice(0, maxLength + 1);

    const lastSpace = shortened.lastIndexOf(" ");

    const safeEnd = lastSpace > maxLength * 0.7 ? lastSpace : maxLength;

    return `${shortened.slice(0, safeEnd).trim()}…`;
  }

  function pxSafeUrl(value) {
    const raw = String(value || "").trim();

    if (!raw) {
      return "";
    }

    try {
      const url = new URL(raw, window.location.href);

      if (!["http:", "https:"].includes(url.protocol)) {
        return "";
      }

      return url.href;
    } catch {
      return "";
    }
  }

  function pxRoute() {
    const parts = String(location.hash || "")
      .replace(/^#\/?/, "")
      .split("/")
      .map((part) => {
        try {
          return decodeURIComponent(part);
        } catch {
          return part;
        }
      });

    const routeName = parts[0] || "landing";

    return {
      routeName,

      programId: parts[1] || "",

      productId: parts[2] || "",

      capabilityId: routeName === "capability" ? parts[3] || "" : "",

      countryId:
        routeName === "product"
          ? parts[3] || ""
          : routeName === "capability"
            ? parts[4] || ""
            : "",
    };
  }

  function pxTypeLabel(value) {
    const type = String(value || "capability")
      .trim()
      .toLowerCase();

    return (
      {
        agent: "Agente",
        capability: "Capacidad",
        subproduct: "Subproducto",
        "sub-product": "Subproducto",
        feature: "Funcionalidad",
      }[type] || "Capacidad"
    );
  }

  function pxCatalog() {
    return pxRows("productCatalog")
      .filter((product) => {
        const programId = String(product.programId || PROGRAM_ID).trim();

        return programId === PROGRAM_ID && pxBoolean(product.enabled);
      })
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  }

  function pxFeatures(productId = null) {
    return pxRows("productFeatures").filter((feature) => {
      if (!productId) {
        return true;
      }

      return pxNormalizeId(feature.productId) === pxNormalizeId(productId);
    });
  }

  function pxFindProduct(productId) {
    const id = pxNormalizeId(productId);

    return pxCatalog().find(
      (product) => pxNormalizeId(product.productId) === id,
    );
  }

  function pxCapabilities(productId) {
    const result = new Map();

    pxFeatures(productId).forEach((feature) => {
      const id = pxNormalizeId(feature.capabilityId);

      if (!id) {
        return;
      }

      if (!result.has(id)) {
        result.set(id, {
          id,

          name: feature.capabilityName || id,

          type: feature.capabilityType || "capability",

          overview: feature.capabilityOverview || "",

          deliverables: [],
        });
      }

      result.get(id).deliverables.push(feature);
    });

    return [...result.values()];
  }

  function pxFindCapability(productId, capabilityId) {
    const id = pxNormalizeId(capabilityId);

    return pxCapabilities(productId).find((capability) => capability.id === id);
  }
  function pxFeatureCountryIds(feature) {
    const raw = feature?.country ?? feature?.countries ?? "";

    return [
      ...new Set(
        String(raw || "")
          .split(/[|,;\n]+/)
          .map((value) =>
            String(value || "")
              .trim()
              .toUpperCase(),
          )
          .filter(
            (value) => value && value !== HOLDING_COUNTRY_ID && value !== "ALL",
          ),
      ),
    ];
  }

  function pxCountryDefinition(countryId) {
    const normalized = String(countryId || "")
      .trim()
      .toUpperCase();

    return pxCountries().find(
      (country) =>
        String(country.id || "")
          .trim()
          .toUpperCase() === normalized,
    );
  }

  function pxCountryBadge(countryId) {
    const country = pxCountryDefinition(countryId);

    const label = country?.label || countryId;

    const flagSrc = String(country?.flagSrc || "").trim();

    return `
    <span
      class="
        product-experience-country-badge
      "
      title="${pxEsc(label)}"
    >
      ${
        flagSrc
          ? `
            <img
              src="${pxEsc(flagSrc)}"
              alt=""
              aria-hidden="true"
            />
          `
          : ""
      }

      <span>
        ${pxEsc(countryId)}
      </span>
    </span>
  `;
  }

  function pxDeliverableGeography(deliverable) {
    const countryIds = pxFeatureCountryIds(deliverable);

    if (!countryIds.length) {
      return `
      <span
        class="
          product-experience-country-unassigned
        "
      >
        Sin geografía
      </span>
    `;
    }

    return `
    <div
      class="
        product-experience-deliverable-countries
      "
      aria-label="
        Geografías del caso funcional
      "
    >
      ${countryIds.map(pxCountryBadge).join("")}
    </div>
  `;
  }
  function pxCapabilityCountryIds(capability) {
    const deliverables = Array.isArray(capability?.deliverables)
      ? capability.deliverables
      : [];

    const result = new Set();

    deliverables.forEach((deliverable) => {
      pxFeatureCountryIds(deliverable).forEach((countryId) => {
        result.add(
          String(countryId || "")
            .trim()
            .toUpperCase(),
        );
      });
    });

    const countryOrder = pxCountries().map((country) =>
      String(country.id || "")
        .trim()
        .toUpperCase(),
    );

    return [...result].sort((left, right) => {
      const leftIndex = countryOrder.indexOf(left);

      const rightIndex = countryOrder.indexOf(right);

      if (leftIndex === -1 && rightIndex === -1) {
        return left.localeCompare(right);
      }

      if (leftIndex === -1) {
        return 1;
      }

      if (rightIndex === -1) {
        return -1;
      }

      return leftIndex - rightIndex;
    });
  }

  function pxGlobalCapabilityCard(capability, productId) {
    const countryIds = pxCapabilityCountryIds(capability);

    const countriesMarkup = countryIds.length
      ? countryIds.map(pxCountryBadge).join("")
      : `
          <span
            class="
              product-experience-country-unassigned
            "
          >
            Sin geografía
          </span>
        `;

    return `
    <article
      class="
        product-experience-capability-card
      "
      data-route="${pxEsc(pxCapabilityRoute(productId, capability.id))}"
      tabindex="0"
      role="link"
    >
      <div
        class="
          product-experience-capability-topline
        "
      >
        <span>
          ${pxEsc(pxTypeLabel(capability.type))}
        </span>

        <small>
          ${capability.deliverables.length}
          ${
            capability.deliverables.length === 1
              ? "caso funcional"
              : "casos funcionales"
          }
        </small>
      </div>

      <div
        class="
          product-experience-capability-availability
        "
      >
        <span>
          Disponible en
        </span>

        <div
          class="
            product-experience-deliverable-countries
          "
        >
          ${countriesMarkup}
        </div>
      </div>

      <h3>
        ${pxEsc(capability.name)}
      </h3>

      <p>
        ${pxEsc(
          capability.overview ||
            capability.deliverables[0]?.overview ||
            "Descripción no informada.",
        )}
      </p>

      <strong>
        Explorar capacidad →
      </strong>
    </article>
  `;
  }
  function pxDeliverableWithGeography(
    deliverable,
    index,
    showGeography = false,
  ) {
    return pxDeliverable(deliverable, index, {
      showGeography,
    });
  }

  function pxCapabilityRoute(productId, capabilityId, countryId = "") {
    const product = pxNormalizeId(productId);

    const capability = pxNormalizeId(capabilityId);

    const country = pxValidCountryId(countryId);

    const parts = ["capability", PROGRAM_ID, product, capability];

    if (country && country !== HOLDING_COUNTRY_ID) {
      parts.push(country);
    }

    return parts.join("/");
  }

  function pxCapabilityDeliverables(capability, countryId = "") {
    const all = Array.isArray(capability?.deliverables)
      ? capability.deliverables
      : [];

    const country = pxValidCountryId(countryId);

    if (!country || country === HOLDING_COUNTRY_ID) {
      /*
       * Holding:
       * agregado completo.
       *
       * Los casos todavía sin
       * geografía siguen visibles
       * como control de calidad.
       */
      return all;
    }

    return all.filter((deliverable) =>
      pxFeatureCountryIds(deliverable).includes(country),
    );
  }

  function pxCapabilityExecutionSection(productId, capability, countryId) {
    const stats = pxCapabilityLocalStats(productId, capability.id, countryId);

    if (!stats.itemCount) {
      return "";
    }

    const views = [
      {
        id: "summary",

        title: "Resumen",

        description: "Carriles funcional y técnico " + "de la capacidad.",
      },

      {
        id: "timeline",

        title: "Cronograma",

        description: "Planificación temporal " + "de la capacidad.",
      },

      {
        id: "backlog",

        title: "Backlog",

        description: "Elementos todavía " + "sin planificación.",
      },
    ];

    return `
    <section
      class="
        product-experience-section
      "
    >
      <header
        class="
          product-experience-section-header
        "
      >
        <div>
          <span
            class="
              product-experience-eyebrow
            "
          >
            Ejecución
          </span>

          <h2>
            Seguimiento de
            ${pxEsc(capability.name)}
          </h2>
        </div>

        <p>
          ${stats.itemCount}
          ${stats.itemCount === 1 ? "elemento" : "elementos"}
          de roadmap asociados
          a esta capacidad.
        </p>
      </header>

      <div
        class="
          product-experience-roadmap-grid
        "
      >
        ${views
          .map(
            (item) => `
              <article
                class="
                  product-experience-roadmap-card
                "
                data-route="${pxEsc(
                  pxCapabilityRoadmapRoute(
                    productId,
                    capability.id,
                    countryId,
                    item.id,
                  ),
                )}"
                tabindex="0"
                role="link"
              >
                <span
                  class="
                    product-experience-eyebrow
                  "
                >
                  Roadmap
                </span>

                <h3>
                  ${pxEsc(item.title)}
                </h3>

                <p>
                  ${pxEsc(item.description)}
                </p>

                <strong>
                  Abrir ${pxEsc(item.title.toLowerCase())} →
                </strong>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
  }
  function pxExternalLink(value, label) {
    const url = pxSafeUrl(value);

    if (!url) {
      return "";
    }

    return `
      <a
        class="product-experience-external-link"
        href="${pxEsc(url)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        ${pxEsc(label)} ↗
      </a>
    `;
  }

  function pxBulletList(value, numbered = false) {
    const items = pxList(value);

    if (!items.length) {
      return `
        <p
          class="
            product-experience-empty-copy
          "
        >
          Información no disponible.
        </p>
      `;
    }

    return `
      <div
        class="
          product-experience-bullet-list
          ${numbered ? "is-numbered" : ""}
        "
      >
        ${items
          .map(
            (item, index) => `
              <div
                class="
                  product-experience-bullet-item
                "
              >
                <span
                  aria-hidden="true"
                >
                  ${numbered ? String(index + 1).padStart(2, "0") : "✓"}
                </span>

                <p>
                  ${pxEsc(item)}
                </p>
              </div>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function pxPickBullet(items, patterns, fallbackIndex = 0) {
    const values = pxList(items);

    const match = values.find((item) =>
      patterns.some((pattern) =>
        pattern.test(String(item || "").toLowerCase()),
      ),
    );

    return match || values[fallbackIndex] || values[0] || "";
  }

  function pxQuickRead(deliverable) {
    const functional = pxList(deliverable.functionalBullets);

    const experience = pxList(deliverable.experienceBullets);

    const objective = pxPickBullet(
      functional,
      [/calidad/, /estandariz/, /interacci/, /objetiv/],
      0,
    );

    const efficiency = pxPickBullet(
      functional,
      [/tiempo/, /minut/, /eficien/, /coste/, /latencia/],
      1,
    );

    const information = pxPickBullet(
      functional,
      [/informaci/, /fuente/, /dato/, /ada/, /cirbe/, /web/, /transacc/],
      2,
    );

    const userExperience = pxPickBullet(
      experience,
      [/escritorio/, /integraci/, /visualiz/, /informe/, /acceso/],
      0,
    );

    const cards = [
      {
        number: "01",
        label: "Objetivo",
        value: objective,
      },
      {
        number: "02",
        label: "Eficiencia",
        value: efficiency,
      },
      {
        number: "03",
        label: "Información",
        value: information,
      },
      {
        number: "04",
        label: "Experiencia",
        value: userExperience,
      },
    ].filter((item) => item.value);

    return `
      <div
        class="
          product-experience-quick-grid
        "
      >
        ${cards
          .map(
            (item) => `
              <article
                class="
                  product-experience-quick-card
                "
              >
                <div>
                  <span
                    class="
                      product-experience-quick-number
                    "
                  >
                    ${item.number}
                  </span>

                  <span
                    class="
                      product-experience-eyebrow
                    "
                  >
                    ${pxEsc(item.label)}
                  </span>
                </div>

                <p>
                  ${pxEsc(pxExcerpt(item.value, 145))}
                </p>
              </article>
            `,
          )
          .join("")}
      </div>
    `;
  }

  /*
   * =======================================================
   * COUNTRY / ROLLOUT
   * =======================================================
   */

  function pxCountries() {
    if (Array.isArray(COUNTRIES)) {
      return COUNTRIES.filter(
        (country) => String(country.id || "").trim() !== HOLDING_COUNTRY_ID,
      );
    }

    return [
      {
        id: "ES",
        label: "España",
      },
      {
        id: "MX",
        label: "México",
      },
      {
        id: "PE",
        label: "Perú",
      },
      {
        id: "CO",
        label: "Colombia",
      },
    ];
  }

  function pxAllRoadmapItems() {
    if (typeof roadmapWorkspaceAllItems === "function") {
      return roadmapWorkspaceAllItems() || [];
    }

    return pxRows("roadmapItems");
  }

  function pxRoadmapProductId(item) {
    if (typeof roadmapWorkspaceNormalizeProduct === "function") {
      return roadmapWorkspaceNormalizeProduct(item?.product);
    }

    if (typeof normalizeRoadmapProduct === "function") {
      return normalizeRoadmapProduct(item?.product);
    }

    return pxNormalizeId(item?.product);
  }

  function pxRoadmapStatus(item) {
    if (typeof roadmapWorkspaceStatus === "function") {
      return roadmapWorkspaceStatus(item);
    }

    if (typeof rcsNormalizeStatus === "function") {
      return rcsNormalizeStatus(item?.status);
    }

    return String(item?.status || "")
      .trim()
      .toLowerCase()
      .replaceAll("_", "-")
      .replaceAll(" ", "-");
  }

  function pxRoadmapIsRisk(item) {
    if (typeof roadmapWorkspaceIsRisk === "function") {
      return roadmapWorkspaceIsRisk(item);
    }

    return ["at-risk", "blocked"].includes(pxRoadmapStatus(item));
  }

  function pxRoadmapProgress(item) {
    const value = Number(item?.progress);

    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(0, Math.min(100, value));
  }
  function pxCapabilityScopeId(value) {
    const raw = String(value || "").trim();

    if (!raw || raw.toUpperCase() === "ALL") {
      return "ALL";
    }

    return pxNormalizeId(raw);
  }

  function pxValidCountryId(value) {
    const raw = String(value || "")
      .trim()
      .toUpperCase();

    if (!raw) {
      return "";
    }

    const validCountries = new Set([
      HOLDING_COUNTRY_ID,
      ...pxCountries().map((country) =>
        String(country.id || "")
          .trim()
          .toUpperCase(),
      ),
    ]);

    return validCountries.has(raw) ? raw : "";
  }

  function pxRoadmapCapabilityIds(item) {
    const source = item?.source || {};

    const value =
      item?.capabilityIds ??
      item?.capabilityId ??
      source?.capabilityIds ??
      source?.capabilityId ??
      source?.capability_ids ??
      source?.capability_id ??
      "";

    if (Array.isArray(value)) {
      return [
        ...new Set(
          value.map(pxCapabilityScopeId).filter((id) => id && id !== "ALL"),
        ),
      ];
    }

    return [
      ...new Set(
        String(value || "")
          .split(/[|,;\n]+/)
          .map(pxCapabilityScopeId)
          .filter((id) => id && id !== "ALL"),
      ),
    ];
  }

  function pxFilterRoadmapItemsByCapability(items, state) {
    const capabilityId = pxCapabilityScopeId(state?.capabilityId);

    if (capabilityId === "ALL") {
      return Array.isArray(items) ? items : [];
    }

    return (Array.isArray(items) ? items : []).filter((item) =>
      pxRoadmapCapabilityIds(item).includes(capabilityId),
    );
  }

  function pxLocalProductRoute(productId, countryId) {
    return [
      "product",
      PROGRAM_ID,
      pxNormalizeId(productId),
      pxValidCountryId(countryId),
    ].join("/");
  }

  function pxLocalProductRoadmapItems(productId, countryId) {
    const normalizedProductId = pxNormalizeId(productId);

    const normalizedCountryId = pxValidCountryId(countryId);

    return pxProductRoadmapItems(normalizedProductId).filter(
      (item) =>
        String(item?.country || "")
          .trim()
          .toUpperCase() === normalizedCountryId,
    );
  }

  function pxCapabilityLocalStats(productId, capabilityId, countryId) {
    const normalizedCapabilityId = pxCapabilityScopeId(capabilityId);

    const items = pxLocalProductRoadmapItems(productId, countryId).filter(
      (item) => pxRoadmapCapabilityIds(item).includes(normalizedCapabilityId),
    );

    const riskCount = items.filter(pxRoadmapIsRisk).length;

    const averageProgress = items.length
      ? Math.round(
          items.reduce((total, item) => total + pxRoadmapProgress(item), 0) /
            items.length,
        )
      : 0;

    return {
      itemCount: items.length,

      riskCount,

      averageProgress,

      items,
    };
  }

  function pxCapabilityRoadmapRoute(
    productId,
    capabilityId,
    countryId,
    viewName = "summary",
  ) {
    const product = pxNormalizeId(productId);

    const capability = pxCapabilityScopeId(capabilityId);

    const country = pxValidCountryId(countryId);

    const ambition =
      typeof ROADMAP_AMBITION_ALL !== "undefined"
        ? ROADMAP_AMBITION_ALL
        : "ALL";

    if (typeof roadmapWorkspaceRoute === "function") {
      return roadmapWorkspaceRoute(
        PROGRAM_ID,
        viewName,
        product,
        "ALL",
        ambition,
        capability,
        country,
      );
    }

    return [
      "roadmap",
      PROGRAM_ID,
      viewName,
      product,
      "ALL",
      ambition,
      capability,
      country,
    ].join("/");
  }

  function pxLocalCapabilityCard(capability, productId, countryId) {
    const stats = pxCapabilityLocalStats(productId, capability.id, countryId);

    const hasExecution = stats.itemCount > 0;

    const routeValue = hasExecution
      ? pxCapabilityRoute(productId, capability.id, countryId)
      : "";

    return `
    <article
      class="
        product-experience-capability-card
        ${hasExecution ? "" : "is-pending is-disabled"}
      "
      ${
        hasExecution
          ? `
            data-route="${pxEsc(routeValue)}"
            tabindex="0"
            role="link"
          `
          : `
            aria-disabled="true"
          `
      }
    >
      <div
        class="
          product-experience-capability-topline
        "
      >
        <span>
          ${pxEsc(pxTypeLabel(capability.type))}
        </span>

        <small>
          ${
            hasExecution
              ? `
                ${stats.itemCount}
                ${stats.itemCount === 1 ? "elemento" : "elementos"}
                de roadmap
              `
              : "Sin ejecución"
          }
        </small>
      </div>

      <h3>
        ${pxEsc(capability.name)}
      </h3>

      <p>
        ${pxEsc(
          capability.overview ||
            capability.deliverables[0]?.overview ||
            "Descripción no informada.",
        )}
      </p>

      <p>
        ${
          hasExecution
            ? `
              ${stats.averageProgress}%
              avance medio ·
              ${stats.riskCount}
              en riesgo
            `
            : `
              Esta capacidad forma
              parte del producto global,
              pero no tiene ejecución
              informada en esta geografía.
            `
        }
      </p>

      <strong>
        ${hasExecution ? "Explorar capacidad →" : "Sin ejecución informada"}
      </strong>
    </article>
  `;
  }

  function pxRoadmapPlanningSource(item) {
    const source = item?.source || {};
    const value = String(
      item?.planningSource ||
        source?.planningSource ||
        source?.planning_source ||
        "",
    )
      .trim()
      .toLowerCase();

    return value === "jira" ? "jira" : "internal";
  }

  function pxJiraBoolean(value) {
    if (typeof value === "boolean") {
      return value;
    }

    return ["true", "1", "yes", "si", "sí"].includes(
      String(value || "")
        .trim()
        .toLowerCase(),
    );
  }

  function pxJiraStatusToken(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");
  }

  function pxJiraRoadmapStatus(value) {
    const status = pxJiraStatusToken(value);

    if (["deployed", "accepted", "done", "closed"].includes(status)) {
      return "done";
    }

    if (status === "blocked") {
      return "blocked";
    }

    if (["in progress", "analysing", "ready to verify"].includes(status)) {
      return "on-track";
    }

    if (["new", "backlog", "to do"].includes(status)) {
      return "planned";
    }

    return "pending";
  }

  function pxJiraPriority(value) {
    const priority = pxJiraStatusToken(value);
    return (
      {
        blocker: 10,
        highest: 20,
        high: 30,
        medium: 40,
        low: 50,
        lowest: 60,
      }[priority] || 999
    );
  }

  function pxJiraRoadmapItems() {
    return pxRows("jiraWorkspaceFeatures")
      .filter(
        (row) => String(row.programId || PROGRAM_ID).trim() === PROGRAM_ID,
      )
      .map((row) => {
        const jiraKey = pxClean(row.jiraKey || row.id);

        const statusRaw = pxClean(row.statusRaw || row.status);

        const workspaceKey = pxClean(row.workspaceKey);

        const workspaceType = pxClean(row.workspaceType).toUpperCase();

        const product = pxNormalizeId(row.product);

        const country = String(row.country || "UNASSIGNED")
          .trim()
          .toUpperCase();

        return {
          ...row,

          id:
            pxClean(row.id) ||
            ["jira", workspaceKey, jiraKey, product, country].join("::"),

          programId: pxClean(row.programId) || PROGRAM_ID,

          country,

          countrySource: pxClean(row.countrySource),

          deliveryScope: pxClean(row.deliveryScope),

          deliveryScopeSource: pxClean(row.deliveryScopeSource),

          product,

          type: "feature",

          typeLabel: "Feature",

          track: "functional",

          planningSource: "jira",

          title: pxClean(row.name || row.summary || jiraKey),

          initiative: jiraKey || pxClean(row.name || row.summary),

          summary: pxClean(row.summary || row.name),

          description: pxClean(row.description),

          status: pxJiraRoadmapStatus(statusRaw),

          progress: null,

          priority: pxJiraPriority(row.priority),

          roadmapOrder: 999,

          owner: pxClean(row.assignee),

          startDate: pxClean(row.startDate),

          endDate: pxClean(row.endDate),

          targetDate: pxClean(row.targetDate),

          lastUpdate: pxClean(row.updatedAt || row.lastUpdate),

          documentUrl: pxSafeUrl(row.jiraUrl),

          documentLabel: "Abrir en JIRA",

          jiraKey,

          jiraUrl: pxSafeUrl(row.jiraUrl),

          jiraStatusRaw: statusRaw,

          jiraDiscarded: pxJiraBoolean(row.jiraDiscarded),

          workspaceKey,

          workspaceType,

          programIncrement: pxClean(row.programIncrement),

          piEstimate: pxClean(row.piEstimate),

          sprintEstimate: pxClean(row.sprintEstimate),

          commitment: pxClean(row.commitment),

          deliveryType: pxClean(row.deliveryType),

          sdaE2E: pxClean(row.sdaE2E),

          sdaName: pxClean(row.sdaName),

          deliverable: pxClean(row.deliverable),

          analysisId: pxClean(row.analysisId),

          analysisStatus: pxClean(row.analysisStatus),

          updatedAt: pxClean(row.updatedAt || row.lastUpdate),

          source: row,
        };
      })
      .filter((item) => item.id && item.jiraKey && item.product);
  }

  function pxJiraScopeItems(productId, countryId) {
    const normalizedProductId = pxNormalizeId(productId);

    const normalizedCountryId = pxValidCountryId(countryId);

    const candidates = pxJiraRoadmapItems()
      .filter((item) => {
        const itemCountry = String(item.country || "UNASSIGNED")
          .trim()
          .toUpperCase();

        if (pxNormalizeId(item.product) !== normalizedProductId) {
          return false;
        }

        if (itemCountry === "UNASSIGNED") {
          return false;
        }

        /*
         * Para la ficha producto-país
         * utilizamos el país de ejecución.
         *
         * No utilizamos deliveryScope
         * para decidir si una Feature
         * pertenece al país.
         */
        return itemCountry === normalizedCountryId;
      })
      .sort((left, right) =>
        String(right.updatedAt || "").localeCompare(
          String(left.updatedAt || ""),
        ),
      );

    const unique = new Map();

    candidates.forEach((item) => {
      const key = [item.workspaceKey, item.jiraKey].join("::");

      if (!unique.has(key)) {
        unique.set(key, item);
      }
    });

    return [...unique.values()];
  }
  function pxJiraFeatureAgeDays(item) {
    const value = pxClean(item?.updatedAt || item?.lastUpdate);
    const updatedAt = value ? new Date(value) : null;

    if (!updatedAt || Number.isNaN(updatedAt.getTime())) {
      return null;
    }

    return Math.max(
      0,
      Math.floor((Date.now() - updatedAt.getTime()) / (24 * 60 * 60 * 1000)),
    );
  }

  function pxJiraExecutionStats(items) {
    const all = Array.isArray(items) ? items : [];
    const discarded = all.filter(
      (item) =>
        item.jiraDiscarded === true ||
        pxJiraStatusToken(item.jiraStatusRaw) === "discarded",
    );
    const effective = all.filter((item) => !discarded.includes(item));
    const done = effective.filter((item) =>
      ["deployed", "accepted", "done", "closed"].includes(
        pxJiraStatusToken(item.jiraStatusRaw),
      ),
    );
    const active = effective.filter((item) => !done.includes(item));
    const blocked = effective.filter(
      (item) => pxJiraStatusToken(item.jiraStatusRaw) === "blocked",
    );
    const deployed = effective.filter(
      (item) => pxJiraStatusToken(item.jiraStatusRaw) === "deployed",
    );
    const committed = effective.filter(
      (item) => pxJiraStatusToken(item.commitment) === "committed",
    );
    const stretch = effective.filter(
      (item) => pxJiraStatusToken(item.commitment) === "stretch",
    );
    const stale = active.filter((item) => {
      const days = pxJiraFeatureAgeDays(item);
      return Number.isFinite(days) && days > 14;
    });
    const withoutPi = effective.filter(
      (item) => !pxClean(item.programIncrement || item.piEstimate),
    );

    const workspaceStats = ["DATA", "ENGINEERING"].map((workspaceType) => {
      const workspaceItems = effective.filter(
        (item) => item.workspaceType === workspaceType,
      );
      return {
        workspaceType,
        total: workspaceItems.length,
        active: workspaceItems.filter((item) => !done.includes(item)).length,
        blocked: workspaceItems.filter(
          (item) => pxJiraStatusToken(item.jiraStatusRaw) === "blocked",
        ).length,
      };
    });

    return {
      all,
      effective,
      total: all.length,
      scope: effective.length,
      discarded: discarded.length,
      active: active.length,
      blocked: blocked.length,
      deployed: deployed.length,
      committed: committed.length,
      stretch: stretch.length,
      stale: stale.length,
      withoutPi: withoutPi.length,
      workspaceStats,
    };
  }

  function pxJiraWorkspaceLabel(item) {
    return item.workspaceType === "DATA" ? "Data" : "Engineering";
  }

  function pxJiraScopeLabel(item, countryId) {
    const country = String(item?.country || "UNASSIGNED")
      .trim()
      .toUpperCase();

    if (country === HOLDING_COUNTRY_ID) {
      return "Global";
    }

    if (country === pxValidCountryId(countryId)) {
      return "País";
    }

    if (country === "UNASSIGNED") {
      return "Sin ámbito JIRA";
    }

    return country || "Sin ámbito JIRA";
  }

  function pxRenderJiraExecutionSection(productId, countryId, countryLabel) {
    const items = pxJiraScopeItems(productId, countryId);
    const stats = pxJiraExecutionStats(items);

    const workspaceCards = stats.workspaceStats
      .map(
        (workspace) => `
          <article class="product-experience-roadmap-card">
            <span class="product-experience-eyebrow">
              Workspace
            </span>
            <h3>
              ${workspace.workspaceType === "DATA" ? "Data" : "Engineering"}
            </h3>
            <p>
              ${workspace.total} Features ·
              ${workspace.active} activas ·
              ${workspace.blocked} bloqueadas.
            </p>
          </article>
        `,
      )
      .join("");

    const featureCards = [...items]
      .sort((left, right) => {
        const leftBlocked = pxJiraStatusToken(left.jiraStatusRaw) === "blocked";
        const rightBlocked =
          pxJiraStatusToken(right.jiraStatusRaw) === "blocked";
        if (leftBlocked !== rightBlocked) {
          return leftBlocked ? -1 : 1;
        }

        const leftDone = ["deployed", "accepted", "done", "closed"].includes(
          pxJiraStatusToken(left.jiraStatusRaw),
        );
        const rightDone = ["deployed", "accepted", "done", "closed"].includes(
          pxJiraStatusToken(right.jiraStatusRaw),
        );
        if (leftDone !== rightDone) {
          return leftDone ? 1 : -1;
        }

        return String(right.updatedAt || "").localeCompare(
          String(left.updatedAt || ""),
        );
      })
      .map((item) => {
        const ageDays = pxJiraFeatureAgeDays(item);
        const meta = [
          pxJiraWorkspaceLabel(item),
          pxJiraScopeLabel(item, countryId),
          item.programIncrement ? `PI ${item.programIncrement}` : "Sin PI",
          item.sprintEstimate || "Sin sprint",
          item.commitment || "Sin commitment",
        ].filter(Boolean);

        const traceability = [
          item.analysisId
            ? `${item.analysisId}${item.analysisStatus ? ` · ${item.analysisStatus}` : ""}`
            : "",
          item.sdaE2E ? `SDA ${item.sdaE2E}` : "",
        ].filter(Boolean);

        return `
          <article class="product-experience-roadmap-card">
            <span class="product-experience-eyebrow">
              ${pxEsc(item.jiraKey)} · ${pxEsc(pxJiraWorkspaceLabel(item))}
            </span>
            <h3>${pxEsc(item.title)}</h3>
            <p>${pxEsc(meta.join(" · "))}</p>
            <p>
              Estado: <strong>${pxEsc(item.jiraStatusRaw || "-")}</strong>
              ${Number.isFinite(ageDays) ? ` · ${ageDays}d desde actualización` : ""}
            </p>
            ${traceability.length ? `<p>${pxEsc(traceability.join(" · "))}</p>` : ""}
            ${item.deliverable ? `<p>${pxEsc(pxExcerpt(item.deliverable, 130))}</p>` : ""}
            ${pxExternalLink(item.jiraUrl, "Abrir JIRA")}
          </article>
        `;
      })
      .join("");

    return `
      <section class="product-experience-section">
        <header class="product-experience-section-header">
          <div>
            <span class="product-experience-eyebrow">
              Seguimiento de ejecución
            </span>
            <h2>Foto oficial JIRA · ${pxEsc(countryLabel)}</h2>
          </div>
          <p>
            Agregado de los workspaces Data y Engineering.
            Incluye Features con ámbito ${pxEsc(countryLabel)} y Features globales
            asociadas al producto.
          </p>
        </header>
        <div class="product-experience-quick-grid">
          <article class="product-experience-quick-card">
            <div>
              <span class="product-experience-quick-number">${stats.total}</span>
              <span class="product-experience-eyebrow">Features JIRA</span>
            </div>
            <p>${stats.scope} en scope · ${stats.discarded} descartadas.</p>
          </article>
          <article class="product-experience-quick-card">
            <div>
              <span class="product-experience-quick-number">${stats.active}</span>
              <span class="product-experience-eyebrow">En ejecución</span>
            </div>
            <p>Features todavía no cerradas ni desplegadas.</p>
          </article>
          <article class="product-experience-quick-card">
            <div>
              <span class="product-experience-quick-number">${stats.blocked}</span>
              <span class="product-experience-eyebrow">Bloqueadas</span>
            </div>
            <p>Atención inmediata en la foto oficial.</p>
          </article>
          <article class="product-experience-quick-card">
            <div>
              <span class="product-experience-quick-number">${stats.deployed}</span>
              <span class="product-experience-eyebrow">Deployed</span>
            </div>
            <p>Features que JIRA informa como desplegadas.</p>
          </article>
        </div>
        <div class="product-experience-roadmap-grid">
          ${workspaceCards}
          <article class="product-experience-roadmap-card">
            <span class="product-experience-eyebrow">Planificación</span>
            <h3>Salud del scope</h3>
            <p>
              ${stats.committed} Committed ·
              ${stats.stretch} Stretch ·
              ${stats.withoutPi} sin PI ·
              ${stats.stale} activas con más de 14d sin actualización.
            </p>
          </article>
        </div>
        <details class="product-experience-functional-detail">
          <summary>
            <span>Features oficiales</span>
            <strong>${stats.total}</strong>
          </summary>
          <div class="product-experience-roadmap-grid">
            ${
              featureCards ||
              `<p class="product-experience-empty-copy">No hay Features JIRA asociadas a este producto.</p>`
            }
          </div>
        </details>
      </section>
    `;
  }

  function pxFunctionalPlanSource(programId, state = null) {
    const workspaceState =
      typeof roadmapWorkspaceState === "function"
        ? roadmapWorkspaceState(programId)
        : null;
    const requested = String(
      state?.functionalPlanSource ||
        workspaceState?.functionalPlanSource ||
        "internal",
    )
      .trim()
      .toLowerCase();
    const source = requested === "jira" ? "jira" : "internal";

    if (workspaceState) {
      workspaceState.functionalPlanSource = source;
    }

    return source;
  }

  function pxRenderFunctionalPlanSourceSelector(programId, items, state) {
    const selected = pxFunctionalPlanSource(programId, state);
    const filtered =
      typeof roadmapWorkspaceFilteredItems === "function"
        ? roadmapWorkspaceFilteredItems(items, state)
        : Array.isArray(items)
          ? items
          : [];
    const internalCount = filtered.filter(
      (item) =>
        roadmapWorkspaceTrack(item) === "functional" &&
        pxRoadmapPlanningSource(item) === "internal" &&
        roadmapWorkspaceHasPlanning(item),
    ).length;
    const jiraCount = filtered.filter(
      (item) =>
        roadmapWorkspaceTrack(item) === "functional" &&
        pxRoadmapPlanningSource(item) === "jira" &&
        item.jiraDiscarded !== true,
    ).length;

    return `
      <section class="aixbanker-roadmap-filters" aria-label="Fuente del carril funcional">
        <div class="aixbanker-roadmap-filter-group">
          <span class="aixbanker-roadmap-filter-label">Fuente funcional</span>
          <nav class="executive-filter-row" aria-label="Seleccionar fuente del cronograma funcional">
            <button
              class="quarter-btn ${selected === "internal" ? "active" : ""}"
              type="button"
              data-functional-plan-source="internal"
              data-program-id="${pxEsc(programId)}"
              aria-pressed="${selected === "internal" ? "true" : "false"}"
            >
              Plan interno · ${internalCount}
            </button>
            <button
              class="quarter-btn ${selected === "jira" ? "active" : ""}"
              type="button"
              data-functional-plan-source="jira"
              data-program-id="${pxEsc(programId)}"
              aria-pressed="${selected === "jira" ? "true" : "false"}"
              ${jiraCount ? "" : "disabled"}
            >
              JIRA oficial · ${jiraCount}
            </button>
          </nav>
        </div>
      </section>
    `;
  }

  function pxRenderJiraFeatureUndatedItems(items) {
    if (!items.length) {
      return "";
    }

    return `
      <section class="aixbanker-roadmap-undated">
        <div class="section-header">
          <div>
            <h3>Features JIRA sin PI planificado</h3>
            <p class="empty-state">
              Se mantienen en la foto de ejecución, pero no se dibujan en el cronograma.
            </p>
          </div>
          <span class="status-pill status-pending">${items.length}</span>
        </div>
        <div class="aixbanker-roadmap-undated-grid">
          ${items
            .map(
              (item) => `
                <article class="project-card">
                  <div class="project-card-main">
                    <div>
                      <div class="project-name">${pxEsc(item.jiraKey)}</div>
                      <div class="project-summary">${pxEsc(item.title)}</div>
                    </div>
                    <span class="status-pill status-${pxEsc(item.status)}">
                      ${pxEsc(item.jiraStatusRaw || "-")}
                    </span>
                  </div>
                  <div class="project-meta">
                    <span>${pxEsc(pxJiraWorkspaceLabel(item))}</span>
                    <span>${pxEsc(item.commitment || "Sin commitment")}</span>
                    <span>${pxEsc(item.sprintEstimate || "Sin sprint")}</span>
                  </div>
                </article>
              `,
            )
            .join("")}
        </div>
      </section>
    `;
  }

  function pxRenderJiraFunctionalTimelineLane(items, state) {
    const period = getRoadmapPeriod(state.quarter);
    const today = roadmapWorkspaceTodayContext(state.quarter);
    const planned = [];
    const undated = [];

    roadmapWorkspaceSort(items).forEach((item) => {
      const layout = getRoadmapItemLayout(item, period);

      if (!layout.hasDates) {
        undated.push(item);
        return;
      }

      if (layout.isVisible) {
        planned.push({ item, layout });
      }
    });

    return `
      <section
        class="roadmap-workspace-timeline-lane ${today.visible ? "has-today" : ""}"
        style="--roadmap-workspace-today:${today.position}%;"
      >
        <header class="roadmap-workspace-lane-header">
          <div>
            <span>Carril funcional</span>
            <h3>Features oficiales JIRA</h3>
          </div>
          <strong>${planned.length + undated.length}</strong>
        </header>
        <p class="empty-state">
          La barra representa la ventana oficial de Program Increment.
          No se calcula un porcentaje de avance artificial.
        </p>
        <section class="aixbanker-roadmap-board">
          <div class="aixbanker-roadmap-scale">
            <div class="aixbanker-roadmap-scale-title">Feature JIRA</div>
            <div
              class="aixbanker-roadmap-month-grid"
              style="--roadmap-month-count:${period.months.length};"
            >
              ${renderRoadmapMonths(period)}
            </div>
          </div>
          <div class="aixbanker-roadmap-rows">
            ${
              planned.length
                ? planned
                    .map(({ item, layout }) => {
                      const status = pxJiraRoadmapStatus(item.jiraStatusRaw);
                      const url = pxSafeUrl(item.jiraUrl || item.documentUrl);
                      const bar = url
                        ? `
                            <a
                              class="aixbanker-roadmap-bar roadmap-type-project"
                              href="${pxEsc(url)}"
                              target="_blank"
                              rel="noopener noreferrer"
                              style="left:${layout.left}%;width:${layout.width}%;"
                              title="${pxEsc(
                                `${item.jiraKey} · ${item.title}: ${formatDate(
                                  layout.startDate,
                                )} → ${formatDate(layout.endDate)}`,
                              )}"
                            >
                              <span class="aixbanker-roadmap-bar-label">
                                ${pxEsc(item.jiraStatusRaw || "JIRA")}
                              </span>
                            </a>
                          `
                        : `
                            <span
                              class="aixbanker-roadmap-bar roadmap-type-project"
                              style="left:${layout.left}%;width:${layout.width}%;"
                            >
                              <span class="aixbanker-roadmap-bar-label">
                                ${pxEsc(item.jiraStatusRaw || "JIRA")}
                              </span>
                            </span>
                          `;

                      return `
                        <article
                          class="aixbanker-roadmap-row aixbanker-roadmap-initiative-row"
                          style="--roadmap-sublane-count:1;"
                        >
                          <div class="aixbanker-roadmap-item-info">
                            <div class="aixbanker-roadmap-item-top">
                              <span class="status-pill status-${pxEsc(status)}">
                                ${pxEsc(item.jiraStatusRaw || "-")}
                              </span>
                              <span class="aixbanker-roadmap-type">
                                JIRA · ${pxEsc(pxJiraWorkspaceLabel(item))}
                              </span>
                            </div>
                            <strong class="aixbanker-roadmap-item-title">
                              ${pxEsc(item.jiraKey)} · ${pxEsc(item.title)}
                            </strong>
                            <div class="aixbanker-roadmap-item-meta">
                              <span>${pxEsc(item.programIncrement || "Sin PI")}</span>
                              <span>${pxEsc(item.sprintEstimate || "Sin sprint")}</span>
                              <span>${pxEsc(item.commitment || "Sin commitment")}</span>
                            </div>
                          </div>
                          <div class="aixbanker-roadmap-track aixbanker-roadmap-group-track">
                            <div
                              class="aixbanker-roadmap-sublane"
                              style="--roadmap-sublane-index:0;"
                            >
                              <span class="aixbanker-roadmap-sublane-label">Feature</span>
                              ${bar}
                              ${
                                layout.targetPosition !== null
                                  ? `
                                      <span
                                        class="aixbanker-roadmap-milestone aixbanker-roadmap-sublane-milestone"
                                        style="left:${layout.targetPosition}%;"
                                        title="Objetivo PI: ${pxEsc(formatDate(layout.targetDate))}"
                                      >
                                        <span aria-hidden="true">◆</span>
                                        <em>${pxEsc(formatDate(layout.targetDate))}</em>
                                      </span>
                                    `
                                  : ""
                              }
                              <span class="aixbanker-roadmap-sublane-status status-${pxEsc(status)}">
                                ${pxEsc(item.jiraStatusRaw || "-")}
                              </span>
                            </div>
                          </div>
                        </article>
                      `;
                    })
                    .join("")
                : `
                    <div class="aixbanker-roadmap-empty">
                      No hay Features JIRA con PI dentro del periodo seleccionado.
                    </div>
                  `
            }
          </div>
        </section>
        ${pxRenderJiraFeatureUndatedItems(undated)}
      </section>
    `;
  }

  function pxInstallJiraExecutionExperience() {
    if (pxInstallJiraExecutionExperience.installed) {
      return true;
    }

    if (
      typeof roadmapWorkspaceItemsForProgram !== "function" ||
      typeof roadmapWorkspaceRenderTimeline !== "function" ||
      typeof roadmapWorkspaceRenderTimelineLane !== "function"
    ) {
      return false;
    }

    const baseItemsForProgram = roadmapWorkspaceItemsForProgram;

    roadmapWorkspaceItemsForProgram =
      function roadmapWorkspaceItemsForProgramWithJira(programId) {
        const baseItems = baseItemsForProgram(programId);

        const context =
          typeof roadmapWorkspaceParseRoute === "function"
            ? roadmapWorkspaceParseRoute()
            : null;

        if (
          context?.routeName !== "roadmap" ||
          context?.viewName !== "timeline"
        ) {
          return baseItems;
        }

        const normalizedProgramId = String(programId || "").trim();

        const countryId =
          pxValidCountryId(context?.countryId || selectedCountry) ||
          HOLDING_COUNTRY_ID;

        const jiraItems = pxJiraRoadmapItems().filter((item) => {
          if (String(item.programId || "").trim() !== normalizedProgramId) {
            return false;
          }

          const itemCountry = String(item.country || "UNASSIGNED")
            .trim()
            .toUpperCase();

          /*
           * Las Features sin ámbito explícito
           * nunca entran en una vista geográfica.
           */
          if (itemCountry === "UNASSIGNED") {
            return false;
          }

          /*
           * Holding:
           *
           * permite ver todo el universo
           * geográficamente asignado.
           */
          if (countryId === HOLDING_COUNTRY_ID) {
            return true;
          }

          /*
           * País:
           *
           * - Feature explícita del país;
           * - Feature explícitamente global.
           */
          return (
            itemCountry === countryId || itemCountry === HOLDING_COUNTRY_ID
          );
        });

        const itemsByKey = new Map();

        [...baseItems, ...jiraItems].forEach((item) => {
          itemsByKey.set(`${item.programId}::${item.type}::${item.id}`, item);
        });

        return [...itemsByKey.values()];
      };

    const baseRenderTimeline = roadmapWorkspaceRenderTimeline;

    roadmapWorkspaceRenderTimeline =
      function roadmapWorkspaceRenderTimelineWithJiraSource(
        programId,
        items,
        state = {},
      ) {
        const source = pxFunctionalPlanSource(programId, state);

        const effectiveState = {
          ...state,
          functionalPlanSource: source,
        };

        const allItems = Array.isArray(items) ? items : [];

        const selector = pxRenderFunctionalPlanSourceSelector(
          programId,
          allItems,
          effectiveState,
        );

        /*
         * ===================================================
         * PLAN INTERNO
         * ===================================================
         *
         * Se mantiene exactamente el renderer existente.
         */
        if (source === "internal") {
          const internalItems = allItems.filter(
            (item) => pxRoadmapPlanningSource(item) !== "jira",
          );

          return `${selector}${baseRenderTimeline(
            programId,
            internalItems,
            effectiveState,
          )}`;
        }

        /*
         * ===================================================
         * JIRA OFICIAL
         * ===================================================
         */

        const filtered =
          typeof roadmapWorkspaceFilteredItems === "function"
            ? roadmapWorkspaceFilteredItems(allItems, effectiveState)
            : allItems;

        const jiraFunctional = filtered.filter(
          (item) =>
            roadmapWorkspaceTrack(item) === "functional" &&
            pxRoadmapPlanningSource(item) === "jira" &&
            item.jiraDiscarded !== true &&
            String(item.country || "UNASSIGNED")
              .trim()
              .toUpperCase() !== "UNASSIGNED",
        );

        /*
         * El carril técnico siempre sigue
         * siendo el cronograma interno.
         */
        const technicalInternal = filtered.filter(
          (item) =>
            roadmapWorkspaceTrack(item) === "technical" &&
            pxRoadmapPlanningSource(item) !== "jira",
        );

        return `
        ${selector}

        <section
          class="
            roadmap-workspace-view
            roadmap-workspace-timeline-view
          "
        >
          <section
            class="
              aixbanker-roadmap-legend
            "
            aria-label="
              Tipos de elemento
            "
          >
            <span
              class="
                aixbanker-roadmap-legend-item
              "
            >
              <i
                class="
                  roadmap-type-project
                "
              ></i>

              Feature JIRA
            </span>

            <span
              class="
                aixbanker-roadmap-legend-item
              "
            >
              <i
                class="
                  roadmap-type-msa
                "
              ></i>

              MSA / técnico interno
            </span>
          </section>

          ${pxRenderJiraFunctionalTimelineLane(jiraFunctional, effectiveState)}

          ${roadmapWorkspaceRenderTimelineLane(
            "technical",
            technicalInternal,
            effectiveState,
          )}
        </section>
      `;
      };

    document.addEventListener(
      "click",
      (event) => {
        const button = event.target.closest("[data-functional-plan-source]");

        if (!button) {
          return;
        }

        const source =
          button.dataset.functionalPlanSource === "jira" ? "jira" : "internal";

        const programId = pxClean(button.dataset.programId || PROGRAM_ID);

        const state = roadmapWorkspaceState(programId);

        state.functionalPlanSource = source;

        event.preventDefault();
        event.stopImmediatePropagation();

        const currentRoute = pxRoute();

        if (
          currentRoute.routeName === "product" &&
          currentRoute.programId === PROGRAM_ID
        ) {
          pxRenderLocalProduct(currentRoute.productId, currentRoute.countryId);

          return;
        }

        if (currentRoute.routeName === "roadmap") {
          const context = roadmapWorkspaceParseRoute();

          renderRoadmapWorkspace(context.programId, context);
        }
      },
      true,
    );

    pxInstallJiraExecutionExperience.installed = true;

    return true;
  }

  function pxRenderLocalProduct(productId, countryId) {
    const normalizedCountryId = pxValidCountryId(countryId);

    const product = pxFindProduct(productId);
    if (
      !product ||
      !normalizedCountryId ||
      normalizedCountryId === HOLDING_COUNTRY_ID
    ) {
      pxNotFound(
        "Producto local no disponible",
        "No existe una ficha local válida para este producto y geografía.",
        `program/${PROGRAM_ID}`,
      );

      return;
    }

    selectedCountry = normalizedCountryId;
    const country = pxCountries().find(
      (candidate) =>
        String(candidate.id || "")
          .trim()
          .toUpperCase() === normalizedCountryId,
    );

    const countryLabel = country?.label || normalizedCountryId;

    const capabilities = pxCapabilities(productId);

    const internalRoadmapItems = pxLocalProductRoadmapItems(
      productId,
      normalizedCountryId,
    ).filter((item) => pxRoadmapPlanningSource(item) !== "jira");
    const jiraRoadmapItems = pxJiraScopeItems(productId, normalizedCountryId);
    const roadmapItemsByKey = new Map();

    [...internalRoadmapItems, ...jiraRoadmapItems].forEach((item) => {
      roadmapItemsByKey.set(`${item.type}::${item.id}`, item);
    });

    const roadmapItems = [...roadmapItemsByKey.values()];
    const linkedItems = internalRoadmapItems.filter(
      (item) => pxRoadmapCapabilityIds(item).length > 0,
    );
    const unassignedItems = internalRoadmapItems.length - linkedItems.length;

    const riskCount = internalRoadmapItems.filter(pxRoadmapIsRisk).length;

    const averageProgress = internalRoadmapItems.length
      ? Math.round(
          internalRoadmapItems.reduce(
            (total, item) => total + pxRoadmapProgress(item),
            0,
          ) / internalRoadmapItems.length,
        )
      : 0;
    const jiraStats = pxJiraExecutionStats(jiraRoadmapItems);
    const functionalPlanSource = pxFunctionalPlanSource(PROGRAM_ID);

    /*
     * El periodo del cronograma de producto
     * es independiente del selector global
     * del workspace.
     *
     * Se conserva por producto y país
     * durante la sesión.
     */
    const selectedTimelineQuarter = pxProductTimelineQuarter(
      productId,
      normalizedCountryId,
    );

    const timelineState = {
      view: "timeline",

      productId: pxNormalizeId(productId),

      quarter: selectedTimelineQuarter,

      summaryMetric: "functional:all",
      ambitionId:
        typeof ROADMAP_AMBITION_ALL !== "undefined"
          ? ROADMAP_AMBITION_ALL
          : "ALL",

      capabilityId: "ALL",

      countryId: normalizedCountryId,
      functionalPlanSource,
    };
    const timeline =
      roadmapItems.length &&
      typeof roadmapWorkspaceRenderTimeline === "function"
        ? roadmapWorkspaceRenderTimeline(
            PROGRAM_ID,
            roadmapItems,
            timelineState,
          )
        : `
        <p
          class="
            product-experience-empty-copy
          "
        >
          No hay elementos
          de roadmap informados
          para este producto
          en ${pxEsc(countryLabel)}.
        </p>
      `;
    const fullRoadmapRoute = pxCapabilityRoadmapRoute(
      productId,
      "ALL",
      normalizedCountryId,
      "timeline",
    );

    const timelineSummary =
      functionalPlanSource === "jira"
        ? `${jiraStats.scope} Features oficiales · ${jiraStats.active} activas · ${jiraStats.blocked} bloqueadas · ${jiraStats.deployed} deployed.`
        : `${internalRoadmapItems.length} elementos · ${linkedItems.length} vinculados a capacidades · ${unassignedItems} sin capacidad asignada · ${averageProgress}% avance medio · ${riskCount} en riesgo.`;

    setHead(
      `${product.productName} · ${countryLabel}`,

      product.tagline || `Visión local de ${product.productName}`,

      [
        "Retail Client Solutions",
        "AIxBanker",
        countryLabel,
        product.productName,
      ].join(" > "),
    );
    view.innerHTML = `
    <section
      class="
        product-experience
        product-experience-product-view
      "
      data-product-experience-view="local-product"
      data-product-experience-product="${pxEsc(productId)}"
      data-product-experience-country="${pxEsc(normalizedCountryId)}"
    >
      <button
        class="
          ghost-button
          navigation-back-button
          product-experience-back
        "
        type="button"
        data-route="program/${PROGRAM_ID}"
        aria-label="Volver"
      >
        ← Volver
      </button>
      <section
        class="
          product-experience-overview-panel
        "
      >
        <div
          class="
            product-experience-overview-copy
          "
        >
          <span
            class="
              product-experience-eyebrow
            "
          >
            Qué es
          </span>

          <h2>
            Visión del producto
          </h2>
          <p>
            ${pxEsc(
              product.overview || "Descripción de producto no informada.",
            )}
          </p>
        </div>

        <aside
          class="
            product-experience-product-summary
          "
        >
          <article>
            <span>
              País
            </span>

            <strong>
              ${pxEsc(countryLabel)}
            </strong>
          </article>
          <article>
            <span>
              Capacidades
            </span>

            <strong>
              ${capabilities.length}
            </strong>
          </article>

          <article>
            <span>
              Elementos roadmap
            </span>

            <strong>
              ${internalRoadmapItems.length}
            </strong>
          </article>
        </aside>
      </section>
      <section
        class="
          product-experience-value-panel
        "
      >
        <div>
          <span
            class="
              product-experience-eyebrow
            "
          >
            Propuesta de valor
          </span>

          <h3>
            Qué aporta
          </h3>
        </div>

        <p>
          ${pxEsc(
            product.valueProposition || "Propuesta de valor no informada.",
          )}
        </p>
      </section>
      <section
        class="
          product-experience-section
        "
      >
        <header
          class="
            product-experience-section-header
          "
        >
          <div>
            <span
              class="
                product-experience-eyebrow
              "
            >
              Capacidades
            </span>
            <h2>
              Qué contiene
              ${pxEsc(product.productName)}
              en
              ${pxEsc(countryLabel)}
            </h2>
          </div>

          <p>
            Definición global del
            producto y situación
            de ejecución de cada
            capacidad en
            ${pxEsc(countryLabel)}.
          </p>
        </header>
        <div
          class="
            product-experience-capability-grid
          "
        >
          ${
            capabilities.length
              ? capabilities
                  .map((capability) =>
                    pxLocalCapabilityCard(
                      capability,
                      productId,
                      normalizedCountryId,
                    ),
                  )
                  .join("")
              : `
                  <p
                    class="
                      product-experience-empty-copy
                    "
                  >
                    No hay capacidades
                    informadas para este
                    producto.
                  </p>
                `
          }
        </div>
      </section>
      ${pxRenderJiraExecutionSection(
        productId,
        normalizedCountryId,
        countryLabel,
      )}
      <section
        class="
          product-experience-section
        "
      >
        <header
          class="
            product-experience-section-header
            product-experience-timeline-header
          "
        >
          <div>
            <span
              class="
                product-experience-eyebrow
              "
            >
              Roadmap del producto
            </span>
            <h2>
              Cronograma de
              ${pxEsc(product.productName)}
            </h2>
          </div>

          <p>
            ${pxEsc(timelineSummary)}
          </p>
        </header>
        ${pxProductTimelinePeriodSelector(
          productId,
          normalizedCountryId,
          selectedTimelineQuarter,
        )}

        ${timeline}
        <button
          class="
            ghost-button
          "
          type="button"
          data-route="${pxEsc(fullRoadmapRoute)}"
        >
          Abrir roadmap completo →
        </button>
      </section>
    </section>
  `;
  }

  function pxProductRoadmapItems(productId) {
    const normalizedProductId = pxNormalizeId(productId);

    return pxAllRoadmapItems().filter((item) => {
      const programId = String(item?.programId || PROGRAM_ID).trim();

      return (
        programId === PROGRAM_ID &&
        pxNormalizeId(pxRoadmapProductId(item)) === normalizedProductId
      );
    });
  }

  function pxProductCountryStats(productId) {
    const items = pxProductRoadmapItems(productId);

    return pxCountries().map((country) => {
      const countryId = String(country.id || "").trim();

      const countryItems = items.filter(
        (item) => String(item?.country || "").trim() === countryId,
      );

      const averageProgress = countryItems.length
        ? Math.round(
            countryItems.reduce(
              (total, item) => total + pxRoadmapProgress(item),
              0,
            ) / countryItems.length,
          )
        : 0;

      const riskCount = countryItems.filter(pxRoadmapIsRisk).length;

      return {
        id: countryId,

        label: country.label || countryId,

        itemCount: countryItems.length,

        averageProgress,

        riskCount,
      };
    });
  }

  function pxCountryRoadmapRoute(productId) {
    const quarter =
      typeof getCurrentQuarter === "function" ? getCurrentQuarter() : "ALL";

    if (typeof roadmapWorkspaceRoute === "function") {
      return roadmapWorkspaceRoute(
        PROGRAM_ID,
        "timeline",
        pxNormalizeId(productId),
        quarter,
      );
    }

    return [
      "roadmap",
      PROGRAM_ID,
      "timeline",
      pxNormalizeId(productId),
      quarter,
    ].join("/");
  }

  function pxCountryCard(country, productId) {
    const hasRoadmap = country.itemCount > 0;

    const routeValue = pxLocalProductRoute(productId, country.id);

    return `
    <article
      class="
        product-experience-program-card
        ${hasRoadmap ? "" : "is-pending"}
      "
      data-route="${pxEsc(routeValue)}"
      tabindex="0"
      role="link"
    >
      <div
        class="
          product-experience-program-card-topline
        "
      >
        <span>
          País
        </span>

        <small>
          ${pxEsc(country.id)}
        </small>
      </div>

      <div>
        <h3>
          ${pxEsc(country.label)}
        </h3>

        <p>
          ${
            hasRoadmap
              ? `
                ${country.itemCount}
                ${country.itemCount === 1 ? "elemento" : "elementos"}
                de roadmap para
                este producto.
              `
              : `
                Sin elementos de
                roadmap informados
                para este producto.
              `
          }
        </p>
      </div>

      <footer>
        <span>
          ${
            hasRoadmap
              ? `
                ${country.averageProgress}%
                avance medio ·
                ${country.riskCount}
                en riesgo
              `
              : `
                Sin ejecución
                informada
              `
          }
        </span>

        <strong>
          Abrir producto →
        </strong>
      </footer>
    </article>
  `;
  }

  function pxCountrySection(product) {
    const productId = pxNormalizeId(product.productId);

    const countries = pxProductCountryStats(productId);

    return `
      <section
        class="
          product-experience-section
        "
      >
        <header
          class="
            product-experience-section-header
          "
        >
          <div>
            <span
              class="
                product-experience-eyebrow
              "
            >
              Implantación
            </span>

            <h2>
              Visión por países
            </h2>
          </div>

          <p>
            Situación de la ejecución
            de ${pxEsc(product.productName)}
            a partir del roadmap
            informado en cada
            geografía.
          </p>
        </header>

        <div
          class="
            program-home-product-grid
            product-experience-program-grid
          "
        >
          ${countries
            .map((country) => pxCountryCard(country, productId))
            .join("")}
        </div>
      </section>
    `;
  }

  /*
   * =======================================================
   * PROGRAM LANDING / PRODUCT
   * =======================================================
   */

  function pxLandingProducts() {
    return pxCatalog()
      .map((product) => ({
        ...product,

        productId: pxNormalizeId(product.productId),
      }))
      .filter((product) => product.productId);
  }

  function pxSelectedCountryId() {
    return String(selectedCountry || HOLDING_COUNTRY_ID).trim();
  }

  function pxSelectedCountryLabel() {
    const countryId = pxSelectedCountryId();

    if (countryId === HOLDING_COUNTRY_ID) {
      return "Holding";
    }

    const country = pxCountries().find(
      (candidate) => String(candidate.id || "").trim() === countryId,
    );

    return country?.label || countryId;
  }

  function pxProductDefinitionStats(productId) {
    const features = pxFeatures(productId);

    const capabilityCount = new Set(
      features
        .map((feature) => pxNormalizeId(feature.capabilityId))
        .filter(Boolean),
    ).size;

    const deliverableCount = features.filter((feature) =>
      pxClean(feature.deliverableName),
    ).length;

    return {
      capabilityCount,
      deliverableCount,
    };
  }

  function pxHoldingProductCard(product) {
    const productId = pxNormalizeId(product.productId);

    const { capabilityCount, deliverableCount } =
      pxProductDefinitionStats(productId);

    return `
    <article
      class="
        product-experience-program-card
      "
      data-route="product/${PROGRAM_ID}/${pxEsc(productId)}"
    >
      <div
        class="
          product-experience-program-card-topline
        "
      >
        <span>
          Producto global
        </span>

        <small>
          Holding
        </small>
      </div>

      <div
        class="
          product-experience-program-card-heading
        "
      >
        <span
          class="
            product-experience-product-icon
          "
          aria-hidden="true"
        >
          ${pxEsc(product.icon || "◇")}
        </span>

        <div>
          <h3>
            ${pxEsc(product.productName || productId)}
          </h3>

          <p>
            ${pxEsc(product.tagline || product.overview || "")}
          </p>
        </div>
      </div>

      <footer>
        <span>
          ${capabilityCount}
          ${capabilityCount === 1 ? "capacidad" : "capacidades"}
          ·
          ${deliverableCount}
          ${deliverableCount === 1 ? "caso funcional" : "casos funcionales"}
        </span>

        <strong>
          Explorar producto →
        </strong>
      </footer>
    </article>
  `;
  }

  function pxLocalProductStats(productId, countryId) {
    const normalizedProductId = pxNormalizeId(productId);

    const normalizedCountryId = String(countryId || "").trim();

    const roadmapItems = pxProductRoadmapItems(normalizedProductId).filter(
      (item) => String(item?.country || "").trim() === normalizedCountryId,
    );

    const systems = pxRows("systems").filter((item) => {
      const programId = String(item?.programId || PROGRAM_ID).trim();

      const itemCountry = String(
        item?.country || item?.["RtC Anchor Country"] || "",
      ).trim();

      const itemProduct = pxNormalizeId(item?.product);

      return (
        programId === PROGRAM_ID &&
        itemCountry === normalizedCountryId &&
        itemProduct === normalizedProductId
      );
    });

    const riskCount = roadmapItems.filter(pxRoadmapIsRisk).length;

    const averageProgress = roadmapItems.length
      ? Math.round(
          roadmapItems.reduce(
            (total, item) => total + pxRoadmapProgress(item),
            0,
          ) / roadmapItems.length,
        )
      : 0;

    return {
      roadmapCount: roadmapItems.length,

      systemsCount: systems.length,

      riskCount,

      averageProgress,
    };
  }

  function pxLocalProductCard(product) {
    const productId = pxNormalizeId(product.productId);

    const countryId = pxSelectedCountryId();

    const countryLabel = pxSelectedCountryLabel();

    const stats = pxLocalProductStats(productId, countryId);

    const hasExecution = stats.roadmapCount > 0;

    const routeValue = pxLocalProductRoute(productId, countryId);

    return `
    <article
      class="
        product-experience-program-card
        ${hasExecution ? "" : "is-pending"}
      "
      data-route="${pxEsc(routeValue)}"
      tabindex="0"
      role="link"
    >
      <div
        class="
          product-experience-program-card-topline
        "
      >
        <span>
          Producto global
        </span>

        <small>
          ${pxEsc(countryLabel)}
        </small>
      </div>

      <div
        class="
          product-experience-program-card-heading
        "
      >
        <span
          class="
            product-experience-product-icon
          "
          aria-hidden="true"
        >
          ${pxEsc(product.icon || "◇")}
        </span>

        <div>
          <h3>
            ${pxEsc(product.productName || productId)}
          </h3>

          <p>
            ${pxEsc(product.tagline || product.overview || "")}
          </p>
        </div>
      </div>

      <footer>
        <span>
          ${stats.roadmapCount}
          ${stats.roadmapCount === 1 ? "elemento" : "elementos"}
          de roadmap
          ·
          ${stats.systemsCount}
          ${stats.systemsCount === 1 ? "elemento" : "elementos"}
          de sistema

          ${
            hasExecution
              ? `
                ·
                ${stats.averageProgress}%
                avance
                ·
                ${stats.riskCount}
                en riesgo
              `
              : ""
          }
        </span>

        <strong>
          Explorar producto →
        </strong>
      </footer>
    </article>
  `;
  }

  function pxEnhanceProgramLanding() {
    const currentRoute = pxRoute();

    if (
      currentRoute.routeName !== "program" ||
      currentRoute.programId !== PROGRAM_ID
    ) {
      return;
    }

    const home = view.querySelector(".program-home");

    if (!home) {
      return;
    }

    const section = [
      ...home.querySelectorAll(":scope > .program-home-section"),
    ].find(
      (candidate) =>
        candidate
          .querySelector(":scope > .program-home-section-header span")
          ?.textContent?.trim() === "Productos",
    );

    if (!section) {
      return;
    }

    const header = section.querySelector(
      ":scope > .program-home-section-header",
    );

    const grid = section.querySelector(":scope > .program-home-product-grid");

    if (!header || !grid) {
      return;
    }

    const countryId = pxSelectedCountryId();

    /*
     * El render base genera una sección
     * nueva cuando cambia el ámbito.
     *
     * Este marcador evita volver a
     * modificar continuamente el mismo
     * DOM desde el MutationObserver.
     */
    if (section.dataset.productExperienceEnhanced === countryId) {
      return;
    }

    const products = pxLandingProducts();

    const isHolding = countryId === HOLDING_COUNTRY_ID;

    const countryLabel = pxSelectedCountryLabel();

    header.innerHTML = `
    <div>
      <span>
        Productos
      </span>

      <h2>
        ${
          isHolding
            ? "Visión global de producto"
            : "Visión local del producto global"
        }
      </h2>
    </div>

    <p>
      ${
        isHolding
          ? `
              Productos, capacidades
              y casos funcionales
              a nivel global.
            `
          : `
              Ejecución en
              ${pxEsc(countryLabel)}
              de los productos
              globales de AIxBanker.
            `
      }
    </p>
  `;

    grid.classList.add("product-experience-program-grid");

    if (!products.length) {
      grid.innerHTML = `
      <p
        class="
          product-experience-empty-copy
        "
      >
        No hay productos
        informados.
      </p>
    `;
    } else if (isHolding) {
      grid.innerHTML = products.map(pxHoldingProductCard).join("");
    } else {
      grid.innerHTML = products.map(pxLocalProductCard).join("");
    }

    section.dataset.productExperienceEnhanced = countryId;
  }

  /*
   * =======================================================
   * PRODUCT
   * =======================================================
   */

  function pxNotFound(titleText, message, backRoute) {
    setHead(
      titleText,
      message,
      "Retail Client Solutions > AIxBanker > Producto",
    );

    view.innerHTML = `
      <section
        class="
          product-experience
          product-experience-empty-view
        "
      >
        <button
          class="
            ghost-button
            navigation-back-button
          "
          type="button"
          data-route="${pxEsc(backRoute)}"
          aria-label="Volver"
        >
          ← Volver
        </button>

        <article
          class="
            product-experience-empty-panel
          "
        >
          <span>
            Visión global
          </span>

          <h2>
            ${pxEsc(titleText)}
          </h2>

          <p>
            ${pxEsc(message)}
          </p>
        </article>
      </section>
    `;
  }

  function pxRenderProduct(productId) {
    selectedCountry = HOLDING_COUNTRY_ID;

    const product = pxFindProduct(productId);

    if (!product) {
      pxNotFound(
        "Producto no disponible",
        "No existe una ficha global para este producto.",
        `program/${PROGRAM_ID}`,
      );

      return;
    }

    const capabilities = pxCapabilities(productId);

    const deliverableCount = capabilities.reduce(
      (total, capability) => total + capability.deliverables.length,
      0,
    );

    setHead(
      `${product.productName} · Producto`,
      product.tagline || "Visión global de producto",
      ["Retail Client Solutions", "AIxBanker", product.productName].join(" > "),
    );

    view.innerHTML = `
    <section
      class="
        product-experience
        product-experience-product-view
      "
      data-product-experience-view="product"
      data-product-experience-product="${pxEsc(productId)}"
    >
      <button
        class="
          ghost-button
          navigation-back-button
          product-experience-back
        "
        type="button"
        data-route="program/${PROGRAM_ID}"
        aria-label="Volver"
      >
        ← Volver
      </button>

      <section
        class="
          product-experience-overview-panel
        "
      >
        <div
          class="
            product-experience-overview-copy
          "
        >
          <span
            class="
              product-experience-eyebrow
            "
          >
            Qué es
          </span>

          <h2>
            Visión del producto
          </h2>

          <p>
            ${pxEsc(
              product.overview || "Descripción de producto no informada.",
            )}
          </p>
        </div>

        <aside
          class="
            product-experience-product-summary
          "
        >
          <article>
            <span>
              Usuarios
            </span>

            <strong>
              ${pxEsc(product.targetUsers || "No informado")}
            </strong>
          </article>

          <article>
            <span>
              Capacidades
            </span>

            <strong>
              ${capabilities.length}
            </strong>
          </article>

          <article>
            <span>
              Casos funcionales
            </span>

            <strong>
              ${deliverableCount}
            </strong>
          </article>
        </aside>
      </section>

      <section
        class="
          product-experience-value-panel
        "
      >
        <div>
          <span
            class="
              product-experience-eyebrow
            "
          >
            Propuesta de valor
          </span>

          <h3>
            Qué aporta
          </h3>
        </div>

        <p>
          ${pxEsc(
            product.valueProposition || "Propuesta de valor no informada.",
          )}
        </p>
      </section>

      <section
        class="
          product-experience-section
        "
      >
        <header
          class="
            product-experience-section-header
          "
        >
          <div>
            <span
              class="
                product-experience-eyebrow
              "
            >
              Capacidades
            </span>

            <h2>
              Qué contiene
              ${pxEsc(product.productName)}
            </h2>
          </div>

          <p>
            Agentes, subproductos y
            capacidades que forman parte
            de la experiencia global,
            junto con las geografías
            donde están disponibles.
          </p>
        </header>

        <div
          class="
            product-experience-capability-grid
          "
        >
          ${
            capabilities.length
              ? capabilities
                  .map((capability) =>
                    pxGlobalCapabilityCard(capability, productId),
                  )
                  .join("")
              : `
                  <p
                    class="
                      product-experience-empty-copy
                    "
                  >
                    No hay capacidades
                    informadas para este
                    producto.
                  </p>
                `
          }
        </div>
      </section>

      ${pxCountrySection(product)}
    </section>
  `;
  }

  /*
   * =======================================================
   * CAPABILITY
   * =======================================================
   */

  function pxRequirements(deliverable) {
    const functional = pxList(deliverable.functionalRequirements);

    const nonFunctional = pxList(deliverable.nonFunctionalRequirements);

    if (!functional.length && !nonFunctional.length) {
      return "";
    }

    return `
      <details
        class="
          product-experience-requirements
        "
      >
        <summary>
          <span>
            Requerimientos y
            condicionantes
          </span>

          <strong
            class="
              product-experience-when-closed
            "
          >
            Ver detalle +
          </strong>

          <strong
            class="
              product-experience-when-open
            "
          >
            Ocultar −
          </strong>
        </summary>

        <div
          class="
            product-experience-requirements-grid
          "
        >
          <section>
            <span
              class="
                product-experience-eyebrow
              "
            >
              Funcionales
            </span>

            ${pxBulletList(functional)}
          </section>

          <section>
            <span
              class="
                product-experience-eyebrow
              "
            >
              No funcionales
            </span>

            ${pxBulletList(nonFunctional)}
          </section>
        </div>
      </details>
    `;
  }

  function pxDeliverable(deliverable, index, options = {}) {
    const showGeography = options?.showGeography === true;

    const documentLink = pxExternalLink(
      deliverable.documentUrl,
      "Abrir documento funcional",
    );

    const figmaLink = pxExternalLink(
      deliverable.figmaUrl,
      "Abrir diseño en Figma",
    );

    const geographyMarkup = showGeography
      ? `
          <div
            class="
              product-experience-deliverable-card-availability
            "
          >
            <span>
              Disponible en
            </span>

            ${pxDeliverableGeography(deliverable)}
          </div>
        `
      : "";

    return `
    <details
      class="
        product-experience-deliverable
      "
    >
      <summary>
        <div
          class="
            product-experience-deliverable-index
          "
        >
          ${String(index + 1).padStart(2, "0")}
        </div>

        <div
          class="
            product-experience-deliverable-summary-copy
          "
        >
          <div
            class="
              product-experience-deliverable-summary-meta
            "
          >
            <span>
              Caso funcional
            </span>

            ${geographyMarkup}
          </div>

          <h3>
            ${pxEsc(deliverable.deliverableName || "Caso funcional")}
          </h3>

          <p>
            ${pxEsc(
              pxExcerpt(deliverable.overview || "Descripción no informada."),
            )}
          </p>
        </div>

        <strong
          class="
            product-experience-deliverable-action
            product-experience-when-closed
          "
        >
          Ver detalle +
        </strong>

        <strong
          class="
            product-experience-deliverable-action
            product-experience-when-open
          "
        >
          Ocultar −
        </strong>
      </summary>

      <div
        class="
          product-experience-deliverable-body
        "
      >
        <section
          class="
            product-experience-quick-read
          "
        >
          <div
            class="
              product-experience-quick-read-header
            "
          >
            <span
              class="
                product-experience-eyebrow
              "
            >
              Lectura rápida
            </span>

            <h4>
              Qué cambia para el gestor
            </h4>
          </div>

          ${pxQuickRead(deliverable)}
        </section>

        <details
          class="
            product-experience-functional-detail
          "
        >
          <summary>
            <span>
              Detalle funcional y experiencia
            </span>

            <strong
              class="
                product-experience-when-closed
              "
            >
              Ver detalle +
            </strong>

            <strong
              class="
                product-experience-when-open
              "
            >
              Ocultar −
            </strong>
          </summary>

          <div
            class="
              product-experience-functional-detail-body
            "
          >
            <section
              class="
                product-experience-deliverable-overview
              "
            >
              <span
                class="
                  product-experience-eyebrow
                "
              >
                Resumen ejecutivo
              </span>

              <p>
                ${pxEsc(deliverable.overview || "Descripción no informada.")}
              </p>
            </section>

            <div
              class="
                product-experience-detail-grid
              "
            >
              <section
                class="
                  product-experience-detail-panel
                "
              >
                <span
                  class="
                    product-experience-eyebrow
                  "
                >
                  Funcionalidad
                </span>

                <h4>
                  Capacidades funcionales
                </h4>

                ${pxBulletList(deliverable.functionalBullets)}
              </section>

              <section
                class="
                  product-experience-detail-panel
                "
              >
                <span
                  class="
                    product-experience-eyebrow
                  "
                >
                  Experiencia
                </span>

                <h4>
                  Experiencia del gestor
                </h4>

                ${pxBulletList(deliverable.experienceBullets, true)}
              </section>
            </div>
          </div>
        </details>

        ${pxRequirements(deliverable)}

        ${
          documentLink || figmaLink
            ? `
                <footer
                  class="
                    product-experience-deliverable-links
                  "
                >
                  ${documentLink}
                  ${figmaLink}
                </footer>
              `
            : ""
        }
      </div>
    </details>
  `;
  }
  function pxRenderCapability(productId, capabilityId, countryId = "") {
    const country = pxValidCountryId(countryId);

    const isLocal = Boolean(country) && country !== HOLDING_COUNTRY_ID;

    selectedCountry = isLocal ? country : HOLDING_COUNTRY_ID;

    const product = pxFindProduct(productId);

    const capability = pxFindCapability(productId, capabilityId);

    if (!product || !capability) {
      pxNotFound(
        "Capacidad no disponible",
        "No existe una ficha funcional para esta capacidad.",
        isLocal
          ? pxLocalProductRoute(productId, country)
          : `product/${PROGRAM_ID}/${productId}`,
      );

      return;
    }

    const countryDefinition = isLocal ? pxCountryDefinition(country) : null;

    const countryLabel = countryDefinition?.label || country;

    const deliverables = pxCapabilityDeliverables(capability, country);

    const backRoute = isLocal
      ? pxLocalProductRoute(productId, country)
      : `product/${PROGRAM_ID}/${productId}`;

    setHead(
      isLocal
        ? `${capability.name} · ${countryLabel}`
        : `${capability.name} · ${product.productName}`,

      isLocal
        ? `${pxTypeLabel(
            capability.type,
          )} de ${product.productName} en ${countryLabel}`
        : `${pxTypeLabel(capability.type)} de ${product.productName}`,

      isLocal
        ? [
            "Retail Client Solutions",
            "AIxBanker",
            countryLabel,
            product.productName,
            capability.name,
          ].join(" > ")
        : [
            "Retail Client Solutions",
            "AIxBanker",
            product.productName,
            capability.name,
          ].join(" > "),
    );

    view.innerHTML = `
    <section
      class="
        product-experience
        product-experience-capability-view
      "
      data-product-experience-view="capability"
      data-product-experience-product="${pxEsc(productId)}"
      data-product-experience-capability="${pxEsc(capabilityId)}"
      data-product-experience-country="${pxEsc(
        isLocal ? country : HOLDING_COUNTRY_ID,
      )}"
    >
      <button
        class="
          ghost-button
          navigation-back-button
          product-experience-back
        "
        type="button"
        data-route="${pxEsc(backRoute)}"
        aria-label="Volver"
      >
        ← Volver
      </button>

      <section
        class="
          product-experience-overview-panel
          product-experience-capability-overview
        "
      >
        <div
          class="
            product-experience-overview-copy
          "
        >
          <div
            class="
              product-experience-kicker-row
            "
          >
            <span>
              ${pxEsc(pxTypeLabel(capability.type))}
            </span>

            <span>
              ${pxEsc(product.productName)}
            </span>

            <span>
              ${isLocal ? pxEsc(countryLabel) : "Holding · agregado"}
            </span>
          </div>

          <h2>
            Qué hace
          </h2>

          <p>
            ${pxEsc(capability.overview || "Descripción no informada.")}
          </p>
        </div>

        <aside
          class="
            product-experience-capability-stat
          "
        >
          <span>
            Casos funcionales
          </span>

          <strong>
            ${deliverables.length}
          </strong>
        </aside>
      </section>

      <section
        class="
          product-experience-section
        "
      >
        <header
          class="
            product-experience-section-header
          "
        >
          <div>
            <span
              class="
                product-experience-eyebrow
              "
            >
              Casos funcionales
            </span>

            <h2>
              ${
                isLocal
                  ? `
                    Disponibles en
                    ${pxEsc(countryLabel)}
                  `
                  : "Cómo se materializa"
              }
            </h2>
          </div>

          <p>
            ${
              isLocal
                ? `
                  Casos funcionales
                  disponibles para esta
                  capacidad en
                  ${pxEsc(countryLabel)}.
                `
                : `
                  Holding agrega los casos
                  funcionales disponibles
                  en las distintas
                  geografías.
                `
            }
          </p>
        </header>

        <div
          class="
            product-experience-deliverable-list
          "
        >
          ${
            deliverables.length
              ? deliverables
                  .map((deliverable, index) =>
                    pxDeliverableWithGeography(deliverable, index, !isLocal),
                  )
                  .join("")
              : `
                <p
                  class="
                    product-experience-empty-copy
                  "
                >
                  No hay casos funcionales
                  informados para esta
                  capacidad
                  ${isLocal ? `en ${pxEsc(countryLabel)}` : ""}.
                </p>
              `
          }
        </div>
      </section>

      ${
        isLocal
          ? pxCapabilityExecutionSection(productId, capability, country)
          : ""
      }
    </section>
  `;
  }
  /*
   * =======================================================
   * ROUTING
   * =======================================================
   */

  function pxRenderSpecialRoute() {
    const currentRoute = pxRoute();

    if (
      currentRoute.programId !== PROGRAM_ID ||
      !["product", "capability"].includes(currentRoute.routeName)
    ) {
      return false;
    }

    if (currentRoute.routeName === "product") {
      const countryId = pxValidCountryId(currentRoute.countryId);

      const isLocal = countryId && countryId !== HOLDING_COUNTRY_ID;

      const existing = view.querySelector(
        isLocal
          ? '[data-product-experience-view="local-product"]'
          : '[data-product-experience-view="product"]',
      );

      const needsRender =
        !existing ||
        existing.dataset.productExperienceProduct !== currentRoute.productId ||
        (isLocal && existing.dataset.productExperienceCountry !== countryId);

      if (needsRender) {
        if (isLocal) {
          pxRenderLocalProduct(currentRoute.productId, countryId);
        } else {
          pxRenderProduct(currentRoute.productId);
        }
      }

      return true;
    }

    const countryId = pxValidCountryId(currentRoute.countryId);

    const expectedCountry =
      countryId && countryId !== HOLDING_COUNTRY_ID
        ? countryId
        : HOLDING_COUNTRY_ID;

    const existing = view.querySelector(
      '[data-product-experience-view="capability"]',
    );

    const needsRender =
      !existing ||
      existing.dataset.productExperienceProduct !== currentRoute.productId ||
      existing.dataset.productExperienceCapability !==
        currentRoute.capabilityId ||
      existing.dataset.productExperienceCountry !== expectedCountry;

    if (needsRender) {
      pxRenderCapability(
        currentRoute.productId,
        currentRoute.capabilityId,
        countryId,
      );
    }

    return true;
  }

  function pxRefreshRoadmapBackButton() {
    const currentRoute = pxRoute();

    if (!String(currentRoute.routeName || "").startsWith("roadmap")) {
      return;
    }

    if (typeof roadmapWorkspaceParseRoute !== "function") {
      return;
    }

    const context = roadmapWorkspaceParseRoute();

    if (context.programId !== PROGRAM_ID) {
      return;
    }

    const productId = pxNormalizeId(context.productId);

    const capabilityId = pxCapabilityScopeId(context.capabilityId);

    const countryId = pxValidCountryId(context.countryId || selectedCountry);

    if (!productId || productId.toUpperCase() === "ALL") {
      return;
    }

    const product = pxFindProduct(productId);

    const country = pxCountryDefinition(countryId);

    const countryLabel = country?.label || countryId || "";

    const backButton =
      view.querySelector(".roadmap-workspace > .ghost-button") ||
      view.querySelector(".navigation-back-button");

    if (!backButton) {
      return;
    }

    const isCapabilityScope = capabilityId && capabilityId !== "ALL";

    let targetRoute;
    let targetText;
    let ariaLabel;

    /*
     * ROADMAP DE CAPACIDAD
     *
     * Knowledge Assistant · España
     *        ↓
     * Resumen / Cronograma / Backlog
     *
     * Volvemos a la ficha intermedia
     * de la capacidad.
     */
    if (isCapabilityScope) {
      const capability = pxFindCapability(productId, capabilityId);

      const capabilityName = capability?.name || capabilityId;

      targetRoute = pxCapabilityRoute(productId, capabilityId, countryId);

      targetText =
        `← Volver a ` +
        `${capabilityName}` +
        (countryLabel ? ` · ${countryLabel}` : "");

      ariaLabel = `Volver a la capacidad ` + `${capabilityName}`;
    } else {
      /*
       * ROADMAP GENERAL DEL PRODUCTO
       *
       * Si no existe una capacidad concreta,
       * mantenemos el comportamiento anterior:
       * volvemos a la ficha local del producto.
       */
      if (countryId && countryId !== HOLDING_COUNTRY_ID) {
        targetRoute = pxLocalProductRoute(productId, countryId);

        targetText =
          `← Volver a ` +
          `${product?.productName || productId}` +
          (countryLabel ? ` · ${countryLabel}` : "");
      } else {
        targetRoute = `product/${PROGRAM_ID}/${productId}`;

        targetText = `← Volver a ` + `${product?.productName || productId}`;
      }

      ariaLabel = "Volver al producto";
    }

    /*
     * El view está observado mediante
     * MutationObserver.
     *
     * Sólo modificamos atributos/texto
     * cuando realmente han cambiado para
     * evitar ciclos de render.
     */

    if (backButton.dataset.route !== targetRoute) {
      backButton.dataset.route = targetRoute;
    }

    if (backButton.textContent.trim() !== targetText) {
      backButton.textContent = targetText;
    }

    if (backButton.getAttribute("aria-label") !== ariaLabel) {
      backButton.setAttribute("aria-label", ariaLabel);
    }
  }
  function pxInstallCapabilityRoadmapScope() {
    if (pxInstallCapabilityRoadmapScope.installed) {
      return true;
    }

    if (
      typeof roadmapWorkspaceState !== "function" ||
      typeof roadmapWorkspaceParseRoute !== "function" ||
      typeof roadmapWorkspaceApplyRouteState !== "function" ||
      typeof roadmapWorkspaceRoute !== "function" ||
      typeof roadmapWorkspaceFilteredItems !== "function" ||
      typeof roadmapContextWorkspaceCopy !== "function" ||
      typeof roadmapContextRenderProductSelector !== "function"
    ) {
      return false;
    }

    pxInstallCapabilityRoadmapScope.installed = true;

    const baseState = roadmapWorkspaceState;

    roadmapWorkspaceState = function roadmapWorkspaceStateWithCapability(
      programId,
    ) {
      const state = baseState(programId);

      if (!state.capabilityId) {
        state.capabilityId = "ALL";
      }

      if (!state.countryId) {
        state.countryId =
          pxValidCountryId(selectedCountry) || HOLDING_COUNTRY_ID;
      }

      return state;
    };

    const baseParseRoute = roadmapWorkspaceParseRoute;

    roadmapWorkspaceParseRoute =
      function roadmapWorkspaceParseRouteWithCapability() {
        const context = baseParseRoute();

        const parts = String(location.hash || "")
          .replace(/^#\/?/, "")
          .split("/");

        if (context.routeName === "roadmap") {
          context.capabilityId = pxCapabilityScopeId(
            typeof roadmapWorkspaceDecode === "function"
              ? roadmapWorkspaceDecode(parts[6], "ALL")
              : parts[6] || "ALL",
          );

          context.countryId = pxValidCountryId(
            typeof roadmapWorkspaceDecode === "function"
              ? roadmapWorkspaceDecode(parts[7], "")
              : parts[7] || "",
          );

          return context;
        }

        const state = context.programId
          ? roadmapWorkspaceState(context.programId)
          : null;

        context.capabilityId = pxCapabilityScopeId(
          state?.capabilityId || "ALL",
        );

        context.countryId = pxValidCountryId(
          state?.countryId || selectedCountry,
        );

        return context;
      };

    const baseApplyRouteState = roadmapWorkspaceApplyRouteState;

    roadmapWorkspaceApplyRouteState =
      function roadmapWorkspaceApplyRouteStateWithCapability(
        programId,
        routeContext,
      ) {
        const requestedCountry = pxValidCountryId(routeContext?.countryId);

        if (requestedCountry) {
          selectedCountry = requestedCountry;
        }

        const state = baseApplyRouteState(programId, routeContext);

        state.capabilityId = pxCapabilityScopeId(
          routeContext?.capabilityId || "ALL",
        );

        state.countryId =
          requestedCountry ||
          pxValidCountryId(selectedCountry) ||
          HOLDING_COUNTRY_ID;

        return state;
      };

    const baseRoadmapRoute = roadmapWorkspaceRoute;

    roadmapWorkspaceRoute = function roadmapWorkspaceRouteWithCapability(
      programId,
      view,
      productId,
      quarter,
      ambitionId = null,
      capabilityId = null,
      countryId = null,
    ) {
      const state = roadmapWorkspaceState(programId);

      const capability =
        capabilityId === null || capabilityId === undefined
          ? pxCapabilityScopeId(state.capabilityId)
          : pxCapabilityScopeId(capabilityId);

      const country =
        pxValidCountryId(countryId) ||
        pxValidCountryId(state.countryId) ||
        pxValidCountryId(selectedCountry) ||
        HOLDING_COUNTRY_ID;

      const baseRoute = baseRoadmapRoute(
        programId,
        view,
        productId,
        quarter,
        ambitionId,
      );

      const encode =
        typeof roadmapWorkspaceEncode === "function"
          ? roadmapWorkspaceEncode
          : encodeURIComponent;

      return [baseRoute, encode(capability), encode(country)].join("/");
    };

    const baseFilteredItems = roadmapWorkspaceFilteredItems;

    roadmapWorkspaceFilteredItems =
      function roadmapWorkspaceFilteredItemsWithCapability(
        items,
        state,
        options = {},
      ) {
        const filtered = baseFilteredItems(items, state, options);

        return pxFilterRoadmapItemsByCapability(filtered, state);
      };

    if (typeof roadmapAmbitionScopeItems === "function") {
      const baseAmbitionScopeItems = roadmapAmbitionScopeItems;

      roadmapAmbitionScopeItems =
        function roadmapAmbitionScopeItemsWithCapability(
          items,
          state,
          options = {},
        ) {
          const filtered = baseAmbitionScopeItems(items, state, options);

          return pxFilterRoadmapItemsByCapability(filtered, state);
        };
    }

    const baseWorkspaceCopy = roadmapContextWorkspaceCopy;

    roadmapContextWorkspaceCopy =
      function roadmapContextWorkspaceCopyWithCapability(
        program,
        programId,
        state,
      ) {
        const copy = baseWorkspaceCopy(program, programId, state);

        const capabilityId = pxCapabilityScopeId(state?.capabilityId);

        if (capabilityId === "ALL") {
          return copy;
        }

        const capability = pxFindCapability(state.productId, capabilityId);

        const capabilityName = capability?.name || capabilityId;

        const productName =
          typeof roadmapContextProductName === "function"
            ? roadmapContextProductName(state)
            : roadmapWorkspaceProductLabel(state.productId);

        const geographyLabel =
          typeof roadmapContextGeographyLabel === "function"
            ? roadmapContextGeographyLabel()
            : roadmapWorkspaceCountryLabel();

        const viewLabel =
          typeof roadmapContextViewLabel === "function"
            ? roadmapContextViewLabel(state.view)
            : state.view;

        const programName = program?.name || programId;

        return {
          ...copy,

          scopeClass: `${copy.scopeClass || ""} ` + "is-capability-scope",

          pageTitle: `${capabilityName} · Roadmap`,

          pageSubtitle:
            `${viewLabel} · ` + `${productName} · ` + `${geographyLabel}`,

          breadcrumb: [
            "Retail Client Solutions",
            programName,
            geographyLabel,
            productName,
            capabilityName,
            "Roadmap",
            viewLabel,
          ].join(" > "),

          heroEyebrow: `${pxTypeLabel(
            capability?.type || "capability",
          )} · ${productName}`,

          heroTitle: `Roadmap de ${capabilityName}`,

          heroDescription:
            `Resumen, cronograma y backlog ` +
            `de ${capabilityName} ` +
            `en ${geographyLabel}.`,

          backLabel: `← Volver a ` + `${productName} · ` + `${geographyLabel}`,

          detailBackLabel: `Volver al roadmap de ` + capabilityName,
        };
      };

    const baseProductSelector = roadmapContextRenderProductSelector;

    roadmapContextRenderProductSelector =
      function roadmapContextRenderProductSelectorWithCapability(
        programId,
        items,
        state,
      ) {
        const capabilityId = pxCapabilityScopeId(state?.capabilityId);

        if (capabilityId === "ALL") {
          return baseProductSelector(programId, items, state);
        }

        const capability = pxFindCapability(state.productId, capabilityId);

        const productName = roadmapWorkspaceProductLabel(state.productId);

        const capabilityName = capability?.name || capabilityId;

        return `
        <section
          class="
            roadmap-context-product-filter
          "
          aria-label="
            Ámbito de producto y capacidad
          "
        >
          <div
            class="
              roadmap-context-product-filter-copy
            "
          >
            <span>
              Producto
            </span>

            <strong>
              ${roadmapWorkspaceEscape(productName)}
            </strong>
          </div>

          <div
            class="
              roadmap-context-product-filter-copy
            "
          >
            <span>
              Capacidad
            </span>

            <strong>
              ${roadmapWorkspaceEscape(capabilityName)}
            </strong>
          </div>
        </section>
      `;
      };

    return true;
  }

  function pxInstallProductCountryToolbar() {
    if (pxInstallProductCountryToolbar.installed) {
      return true;
    }

    if (typeof CONTEXT_TOOLBAR_PROGRAM_ROUTES === "undefined") {
      return false;
    }

    /*
     * Estas rutas deben seguir mostrando
     * la barra lateral de países.
     *
     * La navegación la gestiona
     * exclusivamente context-toolbar.js.
     */
    CONTEXT_TOOLBAR_PROGRAM_ROUTES.add("product");

    CONTEXT_TOOLBAR_PROGRAM_ROUTES.add("capability");

    CONTEXT_TOOLBAR_PROGRAM_ROUTES.add("roadmap");

    CONTEXT_TOOLBAR_PROGRAM_ROUTES.add("roadmap-detail");

    CONTEXT_TOOLBAR_PROGRAM_ROUTES.add("roadmap-activity");

    CONTEXT_TOOLBAR_PROGRAM_ROUTES.add("roadmap-workspace-detail");

    CONTEXT_TOOLBAR_PROGRAM_ROUTES.add("roadmap-workspace-activity");

    pxInstallProductCountryToolbar.installed = true;

    return true;
  }

  function pxInstallProductRoadmapCapabilityAxis() {
    if (pxInstallProductRoadmapCapabilityAxis.installed) {
      return true;
    }

    if (typeof roadmapWorkspaceRenderTimeline !== "function") {
      return false;
    }

    const baseRenderTimeline = roadmapWorkspaceRenderTimeline;

    roadmapWorkspaceRenderTimeline =
      function roadmapWorkspaceRenderTimelineWithCapabilityAxis(
        programId,
        items,
        state,
      ) {
        const currentRoute = pxRoute();

        const countryId = pxValidCountryId(currentRoute.countryId);

        const productId = pxNormalizeId(currentRoute.productId);

        const isLocalProductView =
          currentRoute.routeName === "product" &&
          currentRoute.programId === PROGRAM_ID &&
          Boolean(productId) &&
          Boolean(countryId) &&
          countryId !== HOLDING_COUNTRY_ID;

        if (!isLocalProductView) {
          return baseRenderTimeline(programId, items, state);
        }

        const decoratedItems = (Array.isArray(items) ? items : []).map(
          (item) => {
            const capabilityLabels = pxRoadmapCapabilityIds(item).map(
              (capabilityId) =>
                pxFindCapability(productId, capabilityId)?.name || capabilityId,
            );

            return {
              ...item,

              capabilityAxisLabels: capabilityLabels,
            };
          },
        );

        return baseRenderTimeline(programId, decoratedItems, {
          ...state,

          showCapabilityAxis: true,
        });
      };

    pxInstallProductRoadmapCapabilityAxis.installed = true;

    return true;
  }
  function pxInstallProductRoadmapCapabilityGrouping() {
    if (pxInstallProductRoadmapCapabilityGrouping.installed) {
      return true;
    }

    if (typeof roadmapWorkspaceRenderTimeline !== "function") {
      return false;
    }

    const baseRenderTimeline = roadmapWorkspaceRenderTimeline;

    roadmapWorkspaceRenderTimeline =
      function roadmapWorkspaceRenderTimelineWithCapabilityGrouping(
        programId,
        items,
        state,
      ) {
        const currentRoute = pxRoute();

        const productId = pxNormalizeId(currentRoute.productId);

        const countryId = pxValidCountryId(currentRoute.countryId);

        const isLocalProductView =
          currentRoute.routeName === "product" &&
          currentRoute.programId === PROGRAM_ID &&
          Boolean(productId) &&
          Boolean(countryId) &&
          countryId !== HOLDING_COUNTRY_ID;

        if (!isLocalProductView) {
          return baseRenderTimeline(programId, items, state);
        }

        const capabilityOrder = new Map(
          pxCapabilities(productId).map((capability, index) => [
            pxNormalizeId(capability.id),
            index,
          ]),
        );

        const decoratedItems = (Array.isArray(items) ? items : []).map(
          (item) => {
            const capabilityIds = pxRoadmapCapabilityIds(item);

            const seen = new Set();

            const capabilityGroupEntries = capabilityIds
              .map((capabilityId) => {
                const normalizedId = pxNormalizeId(capabilityId);

                if (!normalizedId || seen.has(normalizedId)) {
                  return null;
                }

                seen.add(normalizedId);

                const capability = pxFindCapability(productId, normalizedId);

                return {
                  id: normalizedId,

                  label: capability?.name || normalizedId,

                  order: capabilityOrder.has(normalizedId)
                    ? capabilityOrder.get(normalizedId)
                    : 999,
                };
              })
              .filter(Boolean);

            return {
              ...item,

              capabilityGroupEntries,
            };
          },
        );

        return baseRenderTimeline(programId, decoratedItems, {
          ...state,

          groupByCapability: true,
        });
      };

    pxInstallProductRoadmapCapabilityGrouping.installed = true;

    return true;
  }

  function pxProductTimelineQuarter(productId, countryId) {
    const normalizedProductId = pxNormalizeId(productId);

    const normalizedCountryId = pxValidCountryId(countryId);

    const storageKey = [
      "productExperienceTimelineQuarter",
      PROGRAM_ID,
      normalizedProductId,
      normalizedCountryId,
    ].join(":");

    const storedValue = sessionStorage.getItem(storageKey);

    if (typeof roadmapWorkspaceValidQuarter === "function") {
      return roadmapWorkspaceValidQuarter(storedValue || "ALL");
    }

    const normalizedValue = String(storedValue || "ALL")
      .trim()
      .toUpperCase();

    if (/^\d{4}$/.test(normalizedValue)) {
      return normalizedValue;
    }

    return ["ALL", "Q1", "Q2", "Q3", "Q4"].includes(normalizedValue)
      ? normalizedValue
      : "ALL";
  }

  function pxSetProductTimelineQuarter(productId, countryId, quarter) {
    const normalizedProductId = pxNormalizeId(productId);

    const normalizedCountryId = pxValidCountryId(countryId);

    const rawValue = String(quarter || "ALL")
      .trim()
      .toUpperCase();

    const normalizedQuarter =
      typeof roadmapWorkspaceValidQuarter === "function"
        ? roadmapWorkspaceValidQuarter(rawValue)
        : /^\d{4}$/.test(rawValue) ||
            ["ALL", "Q1", "Q2", "Q3", "Q4"].includes(rawValue)
          ? rawValue
          : "ALL";

    const storageKey = [
      "productExperienceTimelineQuarter",
      PROGRAM_ID,
      normalizedProductId,
      normalizedCountryId,
    ].join(":");

    sessionStorage.setItem(storageKey, normalizedQuarter);

    return normalizedQuarter;
  }

  function pxProductTimelinePeriodSelector(
    productId,
    countryId,
    selectedQuarter,
  ) {
    return "";
  }

  function pxInstallProductTimelinePeriodSelector() {
    if (pxInstallProductTimelinePeriodSelector.installed) {
      return true;
    }

    document.addEventListener(
      "click",
      (event) => {
        const button = event.target.closest("[data-product-timeline-year]");

        if (!button) {
          return;
        }

        const currentRoute = pxRoute();

        const productId = pxNormalizeId(
          button.dataset.productId || currentRoute.productId,
        );

        const countryId = pxValidCountryId(
          button.dataset.productCountry ||
            currentRoute.countryId ||
            selectedCountry,
        );

        const year = String(button.dataset.productTimelineYear || "").trim();

        if (
          !productId ||
          !countryId ||
          countryId === HOLDING_COUNTRY_ID ||
          !/^\d{4}$/.test(year)
        ) {
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        pxSetProductTimelineQuarter(productId, countryId, year);

        pxRenderLocalProduct(productId, countryId);
      },
      true,
    );

    pxInstallProductTimelinePeriodSelector.installed = true;

    return true;
  }

  function pxRefresh() {
    pxInstallCapabilityRoadmapScope();

    pxInstallProductCountryToolbar();

    pxInstallJiraExecutionExperience();

    pxInstallProductRoadmapCapabilityGrouping();

    pxInstallProductTimelinePeriodSelector();

    if (pxRenderSpecialRoute()) {
      if (typeof renderGlobalContextFilters === "function") {
        requestAnimationFrame(renderGlobalContextFilters);
      }

      return;
    }

    pxEnhanceProgramLanding();

    pxRefreshRoadmapBackButton();
  }

  /*
   * =======================================================
   * DATA MODEL
   * =======================================================
   */

  if (typeof normalizeProgramData === "function") {
    const baseNormalize = normalizeProgramData;

    normalizeProgramData = function normalizeProgramDataWithProducts(
      programId,
      rawData,
    ) {
      const normalized = baseNormalize(programId, rawData);

      const source = rawData || {};
      normalized.productCatalog = Array.isArray(source.productCatalog)
        ? source.productCatalog.map((row) => ({
            ...row,

            programId: row.programId || programId,
          }))
        : [];

      normalized.productFeatures = Array.isArray(source.productFeatures)
        ? source.productFeatures.map((row) => ({
            ...row,

            programId: row.programId || programId,
          }))
        : [];

      normalized.jiraWorkspaceFeatures = Array.isArray(
        source.jiraWorkspaceFeatures,
      )
        ? source.jiraWorkspaceFeatures.map((row) => ({
            ...row,
            programId: row.programId || programId,
          }))
        : [];

      return normalized;
    };
  }

  if (typeof PROGRAM_DATA_CACHE !== "undefined" && PROGRAM_DATA_CACHE?.delete) {
    PROGRAM_DATA_CACHE.delete(PROGRAM_ID);
  }

  /*
   * =======================================================
   * COUNTRY → ROADMAP
   * =======================================================
   */

  document.addEventListener(
    "click",
    (event) => {
      const countryCard = event.target.closest("[data-product-country]");

      if (!countryCard) {
        return;
      }

      const countryId = String(countryCard.dataset.productCountry || "").trim();

      const productId = pxNormalizeId(countryCard.dataset.productId);

      if (!countryId || !productId) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      sessionStorage.setItem(
        PRODUCT_RETURN_ROUTE_KEY,
        `product/${PROGRAM_ID}/${productId}`,
      );

      selectedCountry = countryId;

      route(pxCountryRoadmapRoute(productId));
    },
    true,
  );

  document.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) {
      return;
    }

    const countryCard = event.target.closest("[data-product-country]");

    if (!countryCard) {
      return;
    }

    event.preventDefault();

    countryCard.click();
  });

  /*
   * =======================================================
   * ROADMAP → PRODUCT
   * =======================================================
   */

  document.addEventListener(
    "click",
    (event) => {
      const backButton = event.target.closest(".navigation-back-button");

      if (!backButton) {
        return;
      }

      const currentRoute = pxRoute();

      if (!String(currentRoute.routeName || "").startsWith("roadmap")) {
        return;
      }

      const returnRoute = sessionStorage.getItem(PRODUCT_RETURN_ROUTE_KEY);

      if (!returnRoute) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      sessionStorage.removeItem(PRODUCT_RETURN_ROUTE_KEY);

      selectedCountry = HOLDING_COUNTRY_ID;

      route(returnRoute);
    },
    true,
  );

  /*
   * =======================================================
   * VIEW OBSERVER
   * =======================================================
   */

  const observer = new MutationObserver(() => {
    pxRefresh();
  });

  if (view) {
    observer.observe(view, {
      childList: true,
      subtree: true,
    });
  }

  window.addEventListener("hashchange", () => {
    requestAnimationFrame(pxRefresh);
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-country]")) {
      requestAnimationFrame(() => {
        requestAnimationFrame(pxRefresh);
      });
    }
  });

  requestAnimationFrame(pxRefresh);
})();
