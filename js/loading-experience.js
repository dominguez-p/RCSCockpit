(function loadingExperienceFeature() {
  const STORAGE_KEY = "rcsCockpitLoadingMessageDeckV1";

  const FIRST_ROTATION_MS = 1800;
  const ROTATION_MS = 2600;
  const FUNNY_STEP = 2;

  const COMMON_MESSAGES = [
    "Completando la checklist previa al vuelo...",
    "Inicializando sistemas de navegación...",
    "Alineando los instrumentos del cockpit...",
    "Sincronizando la aviónica del vuelo...",
    "Confirmando el plan de vuelo...",
    "Revisando los últimos datos antes de salida...",
    "Conectando sistemas de a bordo...",
    "Preparando la secuencia de despegue...",
    "Comprobando indicadores de cabina...",
    "Actualizando cartas de navegación...",
    "Revisando ruta, hitos y puntos de control...",
    "Sincronizando paneles de vuelo...",
    "Comprobando comunicaciones con tierra...",
    "Recibiendo las últimas señales operativas...",
    "Preparando el cockpit para la siguiente maniobra...",
    "Verificando que todos los sistemas estén en verde...",
    "Cargando la última posición operativa...",
    "Ajustando rumbo con los datos más recientes...",
    "Coordinando navegación y ejecución...",
    "Revisando instrumentos antes de abandonar plataforma...",
    "Esperando confirmación de los sistemas de tierra...",
    "Actualizando el cuadro de instrumentos...",
    "Comprobando la ruta prevista para este vuelo...",
    "Preparando información de cabina...",
    "Sincronizando señales de planificación y ejecución...",
    "Revisando el estado de la operación...",
    "Consolidando la información antes del pushback...",
    "Última comprobación antes de rodar...",
    "Manteniendo rumbo mientras llegan los últimos datos...",
    "Preparando la aproximación a la información solicitada...",
    "Actualizando el radar operativo...",
    "Coordinando sistemas antes del siguiente tramo...",
    "Revisando niveles de vuelo y prioridades...",
    "Boeing 747 en plataforma: completando chequeos previos...",
    "747 preparado: esperando la siguiente autorización...",
    "Configurando instrumentos del 747 para la operación...",
    "Comprobando que la cabina está lista para salida...",
    "Recibiendo telemetría de los sistemas del cockpit...",
    "Ajustando el plan con la información más reciente...",
    "Confirmando que todo está listo para despegar...",
  ];

  const CONTEXT_MESSAGES = {
    tower: [
      "Torre de control RCS coordinando los programas...",
      "Torre de control preparando la vista general...",
      "Organizando el tráfico de programas en el radar...",
      "Recibiendo las últimas posiciones de la flota RCS...",
      "Sincronizando destinos y planes de vuelo del portfolio...",
      "Revisando tráfico antes de autorizar nuevas salidas...",
      "Actualizando el radar de la torre de control...",
      "Confirmando slots de salida para los programas...",
      "Coordinando movimientos entre programas y geografías...",
      "Torre RCS revisando el estado de cada vuelo...",
      "Actualizando paneles de situación de la torre...",
      "Preparando la secuencia de operaciones del portfolio...",
      "Comprobando rutas activas desde la torre...",
      "Consolidando señales de todos los programas...",
      "Torre de control verificando destinos estratégicos...",
      "Ordenando el tráfico para una lectura limpia del portfolio...",
      "Recibiendo información desde los distintos vuelos...",
      "Actualizando la situación operativa de la flota...",
      "Revisando prioridades antes de asignar pista...",
      "Torre de control conectando con los programas RCS...",
      "Preparando el panel general de movimientos...",
      "Sincronizando la operación entre Holding y geografías...",
      "Confirmando el estado de los vuelos en curso...",
      "Actualizando la visión global desde la torre...",
      "Torre RCS preparando autorizaciones de salida...",
      "Revisando conexiones entre programas y destinos...",
      "Coordinando el siguiente movimiento de la flota...",
      "Torre de control preparando la secuencia del 747...",
    ],

    program: [
      "Entrando en cabina del programa...",
      "Tripulación revisando la información operativa...",
      "Preparando instrumentos de seguimiento...",
      "Configurando la cabina para este programa...",
      "Cargando misión, tripulación y plan de vuelo...",
      "Sincronizando Flight Plan, Crew y Management Reports...",
      "Revisando la misión antes de continuar...",
      "Comprobando sistemas técnicos del programa...",
      "Preparando la lectura de ejecución del vuelo...",
      "Actualizando información de tripulación y operación...",
      "Conectando Functional, Systems y Architecture...",
      "Revisando instrumentos de seguimiento del programa...",
      "Configurando el panel superior de cabina...",
      "Actualizando el radar de Key Issues...",
      "Preparando el Flight Brief para la tripulación...",
      "Sincronizando misión, responsables y ejecución...",
      "Comprobando el estado del vuelo antes de continuar...",
      "Preparando instrumentos para la siguiente decisión...",
      "Revisando señales del programa desde cabina...",
      "Actualizando los paneles del Flight Deck...",
      "Comprobando que la tripulación dispone de la última información...",
      "Cabina conectada: recibiendo datos operativos...",
      "Revisando el estado de sistemas antes del siguiente tramo...",
      "Configurando la navegación técnica del programa...",
      "Alineando misión y ejecución en el Flight Deck...",
      "Preparando el 747 para su siguiente tramo operativo...",
      "Comprobando indicadores antes de abandonar crucero...",
      "Tripulación confirmando que todos los paneles están disponibles...",
    ],

    flightplan: [
      "Cargando el plan de vuelo...",
      "Revisando compromisos SDA antes de salida...",
      "Alineando planificación, diseño y ejecución...",
      "Actualizando la posición de cada compromiso...",
      "Comprobando la secuencia SDA, MSA y Features...",
      "Revisando hitos y ventanas del Flight Plan...",
      "Sincronizando planificación con ejecución JIRA...",
      "Preparando la ruta de los Deliverables SDA...",
      "Comprobando conexiones entre SDA y Features...",
      "Actualizando el radar de ejecución...",
      "Revisando el estado de cada tramo del plan...",
      "Preparando la secuencia temporal del vuelo...",
      "Ordenando compromisos por ventana de ejecución...",
      "Comprobando desviaciones antes de recalcular ruta...",
      "Sincronizando el plan interno con las señales JIRA...",
      "Actualizando el rumbo de los compromisos activos...",
      "Revisando dependencias entre planificación y ejecución...",
      "Consolidando el Flight Plan de todas las geografías...",
      "Comprobando la trazabilidad del plan de vuelo...",
      "Preparando la vista de ejecución del año...",
      "Actualizando rutas de producto y capacidad...",
      "Revisando la secuencia de entregables del vuelo...",
      "Sincronizando ventanas, hitos y estados...",
      "Preparando la siguiente lectura del cronograma...",
      "Comprobando que cada Deliverable tiene rumbo asignado...",
      "Actualizando la navegación entre planificación y backlog...",
      "Revisando el plan de vuelo antes de autorizar cambios...",
      "Flight Plan en revisión por la tripulación...",
    ],
  };

  const FUNNY_MESSAGES = [
    "Los motores están listos. El Excel está pensándoselo.",
    "La torre dice que faltan dos minutos. La torre siempre dice eso.",
    "El copiloto insiste en que ayer esto cargaba más rápido.",
    "Buscando el dato que alguien dejó en el compartimento superior.",
    "No es turbulencia: estamos consolidando datos.",
    "Todo bajo control. Incluso esa spreadsheet con demasiadas pestañas.",
    "Estamos esperando un slot de Google Apps Script.",
    "Por favor, mantenga su spreadsheet en posición vertical.",
    "La caja negra confirma que el último refresh funcionó.",
    "Cabina a torre: seguimos esperando esos datos.",
    "El 747 ya tiene los cuatro motores listos. El dato va por el segundo.",
    "No hemos perdido los datos. Sólo están haciendo escala.",
    "El equipaje de mano llegó antes que esta petición.",
    "El piloto automático está listo; el endpoint, casi.",
    "Torre confirma pista libre. Apps Script solicita unos segundos más.",
    "La tripulación ha revisado la checklist dos veces. Por si acaso.",
    "El radar ve los datos. Llegar, llegan.",
    "Estamos en posición de salida. Falta que responda el finger.",
    "El vuelo sigue en hora según el departamento de optimismo.",
    "Ningún Excel ha resultado herido durante esta carga.",
    "La torre ha pedido paciencia. Y otro café.",
    "Si esto tarda un poco más, lo declaramos escala técnica.",
    "El Boeing 747 está listo para despegar. La API pide un minuto más.",
    "La señal de cinturones sigue encendida por motivos estrictamente informáticos.",
  ];

  let rotationTimer = null;
  let loadingCycle = 0;
  let storageLoaded = false;
  let memoryState = {};

  function loadingContext() {
    const routeName = String(window.location.hash || "")
      .replace(/^#\/?/, "")
      .split("/")[0]
      .trim()
      .toLowerCase();

    if (!routeName || routeName === "landing") {
      return "tower";
    }

    if (
      [
        "roadmap",
        "roadmap-detail",
        "roadmap-activity",
        "roadmap-workspace-detail",
        "roadmap-workspace-activity",
      ].includes(routeName)
    ) {
      return "flightplan";
    }

    return "program";
  }

  function shuffle(values) {
    const result = [...values];

    for (let index = result.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));

      [result[index], result[randomIndex]] = [
        result[randomIndex],
        result[index],
      ];
    }

    return result;
  }

  function readStorageState() {
    if (storageLoaded) {
      return memoryState;
    }

    storageLoaded = true;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw);

        if (parsed && typeof parsed === "object") {
          memoryState = parsed;
        }
      }
    } catch {
      memoryState = {};
    }

    return memoryState;
  }

  function writeStorageState(state) {
    memoryState = state;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /*
       * La experiencia sigue funcionando aunque el navegador
       * bloquee localStorage. En ese caso sólo evitamos
       * repeticiones durante la sesión actual.
       */
    }
  }

  function drawMessage(poolKey, messages) {
    if (!Array.isArray(messages) || !messages.length) {
      return "Preparando la información del cockpit...";
    }

    const state = readStorageState();

    const currentPool =
      state[poolKey] && typeof state[poolKey] === "object"
        ? state[poolKey]
        : {};

    let deck = Array.isArray(currentPool.deck)
      ? [...new Set(currentPool.deck)]
          .map(Number)
          .filter(
            (index) =>
              Number.isInteger(index) && index >= 0 && index < messages.length,
          )
      : [];

    const lastIndex = Number.isInteger(currentPool.lastIndex)
      ? currentPool.lastIndex
      : -1;

    if (!deck.length) {
      deck = shuffle(messages.map((_, index) => index));

      /*
       * drawMessage() consume con pop().
       * Evitamos que la primera carta de una nueva baraja
       * coincida con la última mostrada de la baraja anterior.
       */
      if (
        messages.length > 1 &&
        lastIndex >= 0 &&
        deck[deck.length - 1] === lastIndex
      ) {
        [deck[0], deck[deck.length - 1]] = [deck[deck.length - 1], deck[0]];
      }
    }

    const nextIndex = deck.pop();

    state[poolKey] = {
      deck,
      lastIndex: nextIndex,
    };

    writeStorageState(state);

    return messages[nextIndex];
  }

  function drawNormalMessage(context) {
    const contextMessages =
      CONTEXT_MESSAGES[context] || CONTEXT_MESSAGES.program;

    return drawMessage(`normal:${context}`, [
      ...COMMON_MESSAGES,
      ...contextMessages,
    ]);
  }

  function drawFunnyMessage() {
    return drawMessage("funny", FUNNY_MESSAGES);
  }

  function setOverlayMessage(overlay, message, funny = false) {
    const text = overlay?.querySelector("p");

    if (!text) {
      return;
    }

    text.textContent = String(message || "").trim();

    text.dataset.loadingTone = funny ? "funny" : "normal";

    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || typeof text.animate !== "function") {
      return;
    }

    try {
      text.getAnimations().forEach((animation) => animation.cancel());

      text.animate(
        [
          {
            opacity: 0.35,
            transform: "translateY(2px)",
          },
          {
            opacity: 1,
            transform: "translateY(0)",
          },
        ],
        {
          duration: 260,
          easing: "ease-out",
        },
      );
    } catch {
      /*
       * La animación es decorativa y nunca
       * debe interferir con la carga.
       */
    }
  }

  function clearRotationTimer() {
    if (!rotationTimer) {
      return;
    }

    window.clearTimeout(rotationTimer);

    rotationTimer = null;
  }

  function scheduleNextMessage(overlay, context, cycleId, step = 1) {
    const delay = step === 1 ? FIRST_ROTATION_MS : ROTATION_MS;

    rotationTimer = window.setTimeout(() => {
      if (cycleId !== loadingCycle || !overlay || overlay.hidden) {
        return;
      }

      /*
       * Sólo existe un FUNNY_STEP.
       *
       * Por tanto cada aparición del loading puede
       * mostrar como máximo un mensaje gracioso.
       */
      const funny = step === FUNNY_STEP;

      const message = funny ? drawFunnyMessage() : drawNormalMessage(context);

      setOverlayMessage(overlay, message, funny);

      scheduleNextMessage(overlay, context, cycleId, step + 1);
    }, delay);
  }

  function start({ overlay, message } = {}) {
    if (!overlay) {
      return;
    }

    clearRotationTimer();

    loadingCycle += 1;

    const cycleId = loadingCycle;

    const context = loadingContext();

    overlay.hidden = false;

    /*
     * Conservamos primero el mensaje funcional real:
     *
     * Cargando datos generales...
     * Reintentando datos de Blue...
     * etc.
     *
     * La temática empieza después.
     */
    setOverlayMessage(
      overlay,
      message || "Actualizando la información del cockpit...",
    );

    scheduleNextMessage(overlay, context, cycleId);
  }

  function stop({ overlay } = {}) {
    loadingCycle += 1;

    clearRotationTimer();

    if (!overlay) {
      return;
    }

    overlay.hidden = true;

    const text = overlay.querySelector("p");

    if (text) {
      delete text.dataset.loadingTone;
    }
  }

  window.RCS_LOADING_EXPERIENCE = Object.freeze({
    start,
    stop,
  });
})();
