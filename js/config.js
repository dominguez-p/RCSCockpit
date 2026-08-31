window.APP_CONFIG = {
  runtime: "drive-json",

  // Spreadsheet general del Portfolio.
  portfolio: {
    id: "portfolio",
    label: "Portfolio general",

    driveJsonUrl:
      "https://script.google.com/a/macros/bbva.com/s/AKfycbwC8YMF1_ug66N1omjiQ3hiJoodChKCwvuiRor9DayX51wNh-2_BB7WyjXI6PUYuIfF/exec",

    spreadsheetId: "19LTFh3GBHjSGnXfmjJNnK6vln_haAMFj91DtZwdn2W4",
  },

  // Fuentes complementarias de programa.
  //
  // El origen GENERAL de cada programa sigue llegando
  // dinámicamente desde la Spreadsheet de Portfolio.
  //
  // Aquí declaramos únicamente fuentes adicionales
  // que no forman parte de ese catálogo general.
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
