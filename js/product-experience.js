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

    return {
      routeName: parts[0] || "landing",

      programId: parts[1] || "",

      productId: parts[2] || "",

      capabilityId: parts[3] || "",
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

    if (!hasRoadmap) {
      return `
        <article
          class="
            product-experience-program-card
            is-pending
          "
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
              Sin elementos de
              roadmap informados
              para este producto.
            </p>
          </div>

          <footer>
            <span>
              0 elementos
            </span>

            <strong>
              Sin despliegue
              informado
            </strong>
          </footer>
        </article>
      `;
    }

    return `
      <article
        class="
          product-experience-program-card
        "
        data-product-country="${pxEsc(country.id)}"
        data-product-id="${pxEsc(productId)}"
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
            ${country.itemCount}
            ${country.itemCount === 1 ? "elemento" : "elementos"}
            de roadmap para este
            producto.
          </p>
        </div>

        <footer>
          <span>
            ${country.averageProgress}%
            avance medio ·
            ${country.riskCount}
            en riesgo
          </span>

          <strong>
            Abrir roadmap →
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

    const routeValue = hasExecution ? pxCountryRoadmapRoute(productId) : "";

    return `
    <article
      class="
        product-experience-program-card
        ${hasExecution ? "" : "is-pending"}
      "
      ${hasExecution ? `data-route="${pxEsc(routeValue)}"` : ""}
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
            stats.roadmapCount
              ? ` · ${stats.averageProgress}% avance · ${stats.riskCount} en riesgo`
              : ""
          }
        </span>

        <strong>
          ${hasExecution ? "Abrir roadmap →" : "Sin ejecución informada"}
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
      `Retail Client Solutions > AIxBanker > ${product.productName}`,
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
              capacidades que forman
              parte de la experiencia
              global del producto.
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
                    .map(
                      (capability) => `
                        <article
                          class="
                            product-experience-capability-card
                          "
                          data-route="capability/${PROGRAM_ID}/${pxEsc(
                            productId,
                          )}/${pxEsc(capability.id)}"
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
                      `,
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

  function pxDeliverable(deliverable, index) {
    const documentLink = pxExternalLink(
      deliverable.documentUrl,
      "Abrir documento funcional",
    );

    const figmaLink = pxExternalLink(
      deliverable.figmaUrl,
      "Abrir diseño en Figma",
    );

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
            <span>
              Caso funcional
            </span>

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

  function pxRenderCapability(productId, capabilityId) {
    selectedCountry = HOLDING_COUNTRY_ID;

    const product = pxFindProduct(productId);

    const capability = pxFindCapability(productId, capabilityId);

    if (!product || !capability) {
      pxNotFound(
        "Capacidad no disponible",
        "No existe una ficha funcional para esta capacidad.",
        `product/${PROGRAM_ID}/${productId}`,
      );

      return;
    }

    setHead(
      `${capability.name} · ${product.productName}`,
      `${pxTypeLabel(capability.type)} de ${product.productName}`,
      `Retail Client Solutions > AIxBanker > ${product.productName} > ${capability.name}`,
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
      >
        <button
          class="
            ghost-button
            navigation-back-button
            product-experience-back
          "
          type="button"
          data-route="product/${PROGRAM_ID}/${pxEsc(productId)}"
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
                Visión global
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
              ${capability.deliverables.length}
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
                Cómo se materializa
              </h2>
            </div>

            <p>
              Abre cada caso para
              consultar funcionalidad,
              experiencia, requisitos y
              documentación de origen.
            </p>
          </header>

          <div
            class="
              product-experience-deliverable-list
            "
          >
            ${
              capability.deliverables.length
                ? capability.deliverables.map(pxDeliverable).join("")
                : `
                    <p
                      class="
                        product-experience-empty-copy
                      "
                    >
                      No hay casos
                      funcionales
                      informados.
                    </p>
                  `
            }
          </div>
        </section>
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
      const existing = view.querySelector(
        '[data-product-experience-view="product"]',
      );

      if (
        !existing ||
        existing.dataset.productExperienceProduct !== currentRoute.productId
      ) {
        pxRenderProduct(currentRoute.productId);
      }

      return true;
    }

    const existing = view.querySelector(
      '[data-product-experience-view="capability"]',
    );

    if (
      !existing ||
      existing.dataset.productExperienceProduct !== currentRoute.productId ||
      existing.dataset.productExperienceCapability !== currentRoute.capabilityId
    ) {
      pxRenderCapability(currentRoute.productId, currentRoute.capabilityId);
    }

    return true;
  }

  function pxRefreshRoadmapBackButton() {
    const currentRoute = pxRoute();

    if (!String(currentRoute.routeName || "").startsWith("roadmap")) {
      return;
    }

    const returnRoute = sessionStorage.getItem(PRODUCT_RETURN_ROUTE_KEY);

    if (!returnRoute) {
      return;
    }

    const backButton = view?.querySelector(".navigation-back-button");

    if (!backButton) {
      return;
    }

    const targetText = "← Volver";

    if (backButton.textContent.trim() !== targetText) {
      backButton.textContent = targetText;
    }

    if (backButton.getAttribute("aria-label") !== "Volver") {
      backButton.setAttribute("aria-label", "Volver");
    }
  }

  function pxRefresh() {
    if (pxRenderSpecialRoute()) {
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
