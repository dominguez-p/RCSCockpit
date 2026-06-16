async function loadSampleData() {
  const response = await fetch("./data/app-data.json");
  return await response.json();
}

window.loadSampleData = loadSampleData;
