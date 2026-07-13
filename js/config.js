window.APP_CONFIG = {
  runtime: "drive-json",

  // Nueva spreadsheet general.
  // Solo contiene los KPIs y los programas de la pantalla inicial.
  portfolio: {
    id: "portfolio",
    label: "Portfolio general",

    // Sustituye estos dos valores.
    driveJsonUrl:
      "https://script.google.com/a/macros/bbva.com/s/AKfycbwC8YMF1_ug66N1omjiQ3hiJoodChKCwvuiRor9DayX51wNh-2_BB7WyjXI6PUYuIfF/exec",
    spreadsheetId: "19LTFh3GBHjSGnXfmjJNnK6vln_haAMFj91DtZwdn2W4",
  },

  // Una fuente independiente para cada programa.
  programs: {
    aixbanker: {
      id: "aixbanker",
      label: "AIxBanker",

      // Nueva spreadsheet para AIxBanker.
      driveJsonUrl:
        "https://script.google.com/a/macros/bbva.com/s/AKfycbykkOQBqcwlrHlT9FZTW96k60hmYHVAb_s1NFHh4-44UjIIvg7NEZLq8ZGH9klA-6wPHQ/exec",

      spreadsheetId: "1biJoA0LWDToy3Q2FAP48GNB1LLohS13nbRMzpuWu5qss",
    },

    // Cuando Blue tenga su propia spreadsheet, añade:
    //
    // blue: {
    //   id: "blue",
    //   label: "Blue",
    //   driveJsonUrl: "URL_DEL_APPS_SCRIPT_BLUE",
    //   spreadsheetId: "ID_DE_LA_SPREADSHEET_BLUE",
    // },
  },
};
