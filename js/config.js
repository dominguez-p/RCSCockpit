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
        "https://script.google.com/a/macros/bbva.com/s/AKfycbxS5sOUrD2uteuE-F93dT9z0AAVfoUvl7zGa7nXypp1VyHEkBZu5VJw7LvTcjTMoLqvPA/exec",

      spreadsheetId: "1biJoA0LWDToy3Q2FAP48GNB1LLohS13nbRMzpuWu5qs",
    },

    // Cuando Blue tenga su propia spreadsheet, añade:
    //
    // blue: {
    //   id: "blue",
    //   label: "Blue",
    //   driveJsonUrl: "URL_DEL_APPS_SCRIPT_BLUE",
    //   spreadsheetId: "ID_DE_LA_SPREADSHEET_BLUE",
    // },
    // ROSETTA

    rosetta: {
      id: "rosetta",
      label: "Rosetta",
      driveJsonUrl:
        "https://script.google.com/a/macros/bbva.com/s/AKfycbzz7KxmSjsGj5EXI-Zbpqy39ykjcDnhuTpmK-mHKD1BiSgfD4dD41lk5AgoEYBE4fUoBA/exec",
      spreadsheetId: "1uM26AmFghy_c6NkoauSwQ_Fwo5vNhE7hLXx-S9f6WjM",
    },

    openmarket: {
      id: "openmarket",
      label: "Open Market",
      driveJsonUrl:
        "https://script.google.com/a/macros/bbva.com/s/AKfycbwNKFIQEOIyBcXiKi8WyenjsZKKpUcMzOPjBvG-KCgKDxu0SesLBqDiyNmH9CyFWFKo/exec",
      spreadsheetId: "1xQv47GEZ_qTy_ovwudLAxUjZX7mfWCkEvRvlfghfxhU",
    },
  },
};
