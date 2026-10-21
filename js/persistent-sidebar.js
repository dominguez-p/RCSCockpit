/**
 * RCS Cockpit · navegación lateral persistente y país contextual.
 * Se carga después de context-ux.js, antes de init().
 * No modifica DATA ni las rutas existentes salvo el país explícitamente elegido.
 */
(function installPersistentSidebarFeature() {
  "use strict";

  const STORAGE_KEY = "rcs-cockpit-sidebar-collapsed";
  const FILTERED_ROUTES = new Set([
    "product",
    "capability",
    "roadmap",
    "functional",
    "systems",
    "architecture",
    "teams",
    "impediments",
    "decisions",
  ]);

  const ICONS = {
    governance: "◇",
    kpis: "◉",
    ambition: "✦",
    landing: "✈",
    "key-reports": "▤",
  };

  function getContext() {
    if (typeof contextToolbarRoute === "function") {
      return contextToolbarRoute();
    }

    const parts = String(location.hash || "")
      .replace(/^#\/?/, "")
      .split("/");

    return {
      routeName: parts[0] || "landing",
      programId: parts[1] || "",
      parts,
    };
  }

  function availableCountries() {
    if (typeof COUNTRIES === "undefined" || !Array.isArray(COUNTRIES)) {
      return [];
    }

    const countries = COUNTRIES.filter((country) => country && country.id);

    return [
      ...countries.filter((country) => country.id === "HL"),
      ...countries.filter((country) => country.id !== "HL"),
    ];
  }

  function getCurrentCountry(context, countries) {
    const routeCountry = ["product", "capability", "roadmap"].includes(
      context.routeName,
    )
      ? context.countryId
      : "";

    const value = String(routeCountry || selectedCountry || "HL").toUpperCase();

    return countries.find((country) => country.id === value) || countries[0];
  }

  function needsCountryFilter(context) {
    if (!context.programId) {
      return false;
    }

    if (FILTERED_ROUTES.has(context.routeName)) {
      return true;
    }

    if (context.routeName !== "program") {
      return false;
    }

    return (
      Boolean(context.parts?.[2]) ||
      (!["aixbanker", "blue", "rosetta"].includes(context.programId) &&
        Boolean(document.querySelector("#view .program-home")))
    );
  }

  function readCollapsedPreference() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored !== null) {
        return stored === "true";
      }
    } catch (_) {
      // La navegación funciona aunque el almacenamiento esté bloqueado.
    }

    return window.matchMedia("(max-width: 760px)").matches;
  }

  function setCollapsed(collapsed, persist = false) {
    const isCollapsed = Boolean(collapsed);

    document.body.classList.toggle("rcs-sidebar-collapsed", isCollapsed);

    const toggle = document.getElementById("rcsSidebarToggle");

    if (toggle) {
      toggle.setAttribute("aria-expanded", String(!isCollapsed));
      toggle.setAttribute(
        "aria-label",
        isCollapsed ? "Expandir barra lateral" : "Contraer barra lateral",
      );

      toggle.title = isCollapsed ? "Expandir menú" : "Contraer menú";

      const icon = toggle.querySelector(".rcs-sidebar-toggle-icon");
      const label = toggle.querySelector(".rcs-sidebar-toggle-label");

      if (icon) {
        icon.textContent = isCollapsed ? "❯" : "❮";
      }

      if (label) {
        label.textContent = isCollapsed ? "Expandir" : "Contraer";
      }
    }

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, String(isCollapsed));
      } catch (_) {
        // Preferencia opcional.
      }
    }
  }

  function decorateNavigation(nav) {
    nav.querySelectorAll("[data-portfolio-nav]").forEach((button) => {
      const key = button.dataset.portfolioNav;

      if (button.querySelector(".rcs-sidebar-link-label")) {
        return;
      }

      const label = button.textContent.trim();

      const icon = document.createElement("span");
      icon.className = "rcs-sidebar-link-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = ICONS[key] || "•";

      const text = document.createElement("span");
      text.className = "rcs-sidebar-link-label";
      text.textContent = label;

      button.replaceChildren(icon, text);
      button.setAttribute("aria-label", label);
      button.title = label;
    });
  }

  function ensureSidebar() {
    if (
      !document.getElementById("portfolioSidebarNavigation") &&
      typeof installPortfolioSidebarNavigation === "function"
    ) {
      installPortfolioSidebarNavigation();
    }

    const sidebar = document.querySelector(".app-shell > .sidebar");
    const navigation = document.getElementById("portfolioSidebarNavigation");

    if (!sidebar || !navigation) {
      return;
    }

    sidebar.classList.remove("has-country-navigation");
    sidebar.querySelector("#sidebarCountryNavigation")?.remove();

    document.body.classList.add("rcs-sidebar-ready");

    decorateNavigation(navigation);

    if (!document.getElementById("rcsSidebarToggle")) {
      const toggle = document.createElement("button");

      toggle.id = "rcsSidebarToggle";
      toggle.type = "button";
      toggle.className = "rcs-sidebar-toggle";
      toggle.setAttribute("aria-controls", "portfolioSidebarNavigation");

      toggle.innerHTML =
        '<span class="rcs-sidebar-toggle-icon" aria-hidden="true">❮</span>' +
        '<span class="rcs-sidebar-toggle-label">Contraer</span>';

      toggle.addEventListener("click", () => {
        setCollapsed(
          !document.body.classList.contains("rcs-sidebar-collapsed"),
          true,
        );
      });

      sidebar.insertBefore(toggle, navigation);
      setCollapsed(readCollapsedPreference());
    }

    const home = document.getElementById("globalSidebarHomeButton");

    if (home) {
      home.title = "Volver a Inicio";
    }
  }

  function syncActiveNavigation(context) {
    const button = document.querySelector('[data-portfolio-nav="landing"]');

    if (!button) {
      return;
    }

    const isProgramScreen =
      Boolean(context.programId) &&
      !new Set([
        "landing",
        "governance",
        "kpis",
        "ambition",
        "key-reports",
      ]).has(context.routeName);

    const active = isProgramScreen || context.routeName === "landing";

    button.classList.toggle("active", active);

    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  }

  function renderContextCountryFilter() {
    ensureSidebar();

    const container = document.getElementById("globalContextFilters");

    if (!container) {
      return;
    }

    const context = getContext();

    syncActiveNavigation(context);

    const countries = availableCountries();

    if (!needsCountryFilter(context) || !countries.length) {
      container.hidden = true;
      container.replaceChildren();
      return;
    }

    const active = getCurrentCountry(context, countries);

    const label = document.createElement("label");
    label.className = "rcs-country-control";
    label.htmlFor = "rcsContextCountry";

    const caption = document.createElement("span");
    caption.className = "rcs-country-caption";
    caption.textContent = "País";

    const flag = document.createElement("img");
    flag.className = "rcs-country-flag";
    flag.src = active.flagSrc || "";
    flag.alt = "";
    flag.setAttribute("aria-hidden", "true");

    const select = document.createElement("select");
    select.id = "rcsContextCountry";
    select.setAttribute("aria-label", "Seleccionar país del programa");

    countries.forEach((country) => {
      const option = document.createElement("option");
      option.value = country.id;
      option.textContent = country.label;
      select.append(option);
    });

    select.value = active.id;

    const caret = document.createElement("span");
    caret.className = "rcs-country-caret";
    caret.textContent = "⌄";
    caret.setAttribute("aria-hidden", "true");

    label.append(caption, flag, select, caret);
    container.replaceChildren(label);
    container.hidden = false;
  }

  function changeCountry(nextId) {
    const countries = availableCountries();

    const next = countries.find((country) => country.id === nextId);

    if (!next) {
      return;
    }

    const context = getContext();

    selectedCountry = next.id;

    selectedCapability = null;
    selectedSystemComponent = null;
    selectedArchitectureGap = null;

    if (context.routeName === "product" && context.parts?.[2]) {
      route(
        `product/${encodeURIComponent(context.programId)}/` +
          `${encodeURIComponent(context.parts[2])}/` +
          `${encodeURIComponent(next.id)}`,
      );
      return;
    }

    if (context.routeName === "capability" && context.parts?.[3]) {
      route(
        `capability/${encodeURIComponent(context.programId)}/` +
          `${encodeURIComponent(context.parts[2])}/` +
          `${encodeURIComponent(context.parts[3])}/` +
          `${encodeURIComponent(next.id)}`,
      );
      return;
    }

    if (context.routeName === "roadmap") {
      if (typeof roadmapWorkspaceRoute === "function") {
        const target = roadmapWorkspaceRoute(
          context.programId,
          context.viewName || "summary",
          context.productId || "ALL",
          context.period || "ALL",
          context.ambitionId || "ALL",
          context.capabilityId || "ALL",
          next.id,
        );

        if (target) {
          if (String(location.hash).replace(/^#/, "") !== target) {
            route(target);
          } else {
            render().catch(console.error);
          }
          return;
        }
      }
    }

    Promise.resolve(render()).catch(console.error);
  }

  if (typeof renderGlobalContextFilters === "function") {
    renderGlobalContextFilters =
      function renderGlobalContextFiltersWithoutLegacyCountry() {};
  }

  if (typeof renderSidebarCountryNavigation === "function") {
    renderSidebarCountryNavigation = function renderCountryInCurrentView() {
      renderContextCountryFilter();
    };
  }

  document.addEventListener("change", (event) => {
    if (event.target?.id !== "rcsContextCountry") {
      return;
    }

    changeCountry(String(event.target.value || ""));
  });

  window.addEventListener("hashchange", () => {
    requestAnimationFrame(renderContextCountryFilter);
  });

  ensureSidebar();
  requestAnimationFrame(renderContextCountryFilter);
})();
