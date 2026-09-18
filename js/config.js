window.APP_CONFIG = {
  runtime: "drive-json",

  /*
   * =======================================================
   * ACCESS CONTROL
   * =======================================================
   *
   * Web App dedicado exclusivamente
   * a validar permisos de Drive.
   */
  accessControl: {
    id: "rcs-access-control",

    label: "RCSE Cockpit Access Control",

    driveJsonUrl:
      "https://script.google.com/a/macros/bbva.com/s/AKfycby6tdGdXMzBd8rh0tuIBCQMMk0xPPwJZan_FOG4QbMV3JwqlW9MQuJJGVe4kDucJ3Lg/exec",

    /*
     * =====================================================
     * TEMPORAL · ACCESS PROFILE TEST
     * =====================================================
     *
     * El contenido de estas Spreadsheets es irrelevante.
     * Sólo se utilizan sus permisos de Drive.
     *
     * Para retirar el test:
     *
     * enabled: false
     */

    /*     testMode: {
      enabled: true,

      defaultProfile: "editor",

      profiles: {
        editor: {
          label: "Editor",

          spreadsheetId: "19LTFh3GBHjSGnXfmjJNnK6vln_haAMFj91DtZwdn2W4",
        },

        viewer: {
          label: "Lector",

          spreadsheetId: "1v5u5vIB4ykyhUC8nPzmilGaUl7l_BN1-ByT06-aANLw",
        },

        denied: {
          label: "Sin acceso",

          spreadsheetId: "13GKerdAevB08WbXNbMriqhpTlSgg5oi1iK_NP8TqErs",
        },
      },
    }, */
  },

  /*
   * =======================================================
   * PORTFOLIO
   * =======================================================
   */

  portfolio: {
    id: "portfolio",

    label: "Portfolio general",

    driveJsonUrl:
      "https://script.google.com/a/macros/bbva.com/s/AKfycbwC8YMF1_ug66N1omjiQ3hiJoodChKCwvuiRor9DayX51wNh-2_BB7WyjXI6PUYuIfF/exec",

    spreadsheetId: "19LTFh3GBHjSGnXfmjJNnK6vln_haAMFj91DtZwdn2W4",
  },

  /*
   * =======================================================
   * PROGRAMAS · FUENTES COMPLEMENTARIAS
   * =======================================================
   */

  programs: {
    aixbanker: {
      restricted: {
        id: "aixbanker-restricted",

        label: "AIxBanker Restricted",

        driveJsonUrl:
          "https://script.google.com/a/macros/bbva.com/s/AKfycbyYMD6nfs_zE8nUHm5BImowSbAkIstUGFIsvh5SeGYs_ABUmbKxAO_qizKyRIkc2oh-4g/exec",

        spreadsheetId: "1krTPKR3GdCrr3MWLOTGcuXPhQ3OVOP99izSFg63ick4",
      },
    },
  },
};
