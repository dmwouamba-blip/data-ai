(() => {

  const root = document.documentElement;

  const patientSelect =
    document.getElementById("patient");

  const citySelect =
    document.getElementById("city");

  const apiStatus =
    document.getElementById("apiStatus");

  const content =
    document.getElementById("content");

  const glucoseChart =
    document.getElementById("glucoseChart");

  const sourceHealth =
    document.getElementById("sourceHealth");

  const patientCount =
    document.getElementById("patientCount");

  const cityCount =
    document.getElementById("cityCount");

  const glucoseCount =
    document.getElementById("glucoseCount");

  const nutritionCount =
    document.getElementById("nutritionCount");

  const help =
    document.getElementById("help");


  let state = {
    patients: [],
    cities: [],
    glucose: [],
    nutrition: [],
    sources: []
  };


  async function api(path) {

    const response = await fetch(path, {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(
        `API ${response.status}`
      );
    }

    return response.json();
  }


  function setStatus(ok, text) {

    apiStatus.textContent = text;

    apiStatus.classList.toggle(
      "ok",
      ok
    );

    apiStatus.classList.toggle(
      "error",
      !ok
    );
  }


  function clearPatientPanels() {

    cityCount.textContent = "–";
    glucoseCount.textContent = "–";
    nutritionCount.textContent = "–";

    citySelect.innerHTML =
      '<option value="">All Cities</option>';

    content.innerHTML = `
      <div class="empty">
        Select a patient to view
        residence and nutrition context.
      </div>
    `;

    glucoseChart.innerHTML = `
      <div class="empty">
        Select a patient to load
        glucose data.
      </div>
    `;
  }


  async function loadPatients() {

    const data =
      await api("/api/patients");

    state.patients =
      Array.isArray(data)
        ? data
        : (data.items || []);

    patientSelect.innerHTML =
      '<option value="">All Patients</option>';

    for (const row of state.patients) {

      const option =
        document.createElement("option");

      option.value = row.patient_id;
      option.textContent = row.patient_id;

      patientSelect.appendChild(option);
    }

    patientCount.textContent =
      state.patients.length.toLocaleString();
  }


  async function loadSources() {

    try {

      const data =
        await api("/api/source-health");

      state.sources =
        Array.isArray(data)
          ? data
          : (data.items || []);

      if (!state.sources.length) {

        sourceHealth.innerHTML = `
          <div class="empty">
            No source health information.
          </div>
        `;

        return;
      }

      sourceHealth.innerHTML =
        state.sources
          .map(row => `
            <div class="source-card">
              <small>
                ${escapeHtml(row.dataset)}
              </small>

              <b>
                ${Number(
                  row.record_count || 0
                ).toLocaleString()}
              </b>

              <span>
                ${formatDate(
                  row.last_event_ts
                )}
              </span>
            </div>
          `)
          .join("");

    } catch (error) {

      sourceHealth.innerHTML = `
        <div class="error-message">
          Source health unavailable.
        </div>
      `;
    }
  }


  async function loadPatient(patientId) {

    if (!patientId) {

      clearPatientPanels();
      return;
    }

    setStatus(
      true,
      "Loading"
    );

    try {

      const [
        citiesData,
        glucoseData,
        nutritionData
      ] = await Promise.all([

        api(
          `/api/patients/${
            encodeURIComponent(patientId)
          }/cities`
        ),

        api(
          `/api/patients/${
            encodeURIComponent(patientId)
          }/glucose`
        ),

        api(
          `/api/patients/${
            encodeURIComponent(patientId)
          }/nutrition`
        )

      ]);


      state.cities =
        extractItems(citiesData);

      state.glucose =
        extractItems(glucoseData);

      state.nutrition =
        extractItems(nutritionData);


      cityCount.textContent =
        new Set(
          state.cities
            .map(x => x.city_id)
            .filter(Boolean)
        ).size.toLocaleString();


      glucoseCount.textContent =
        state.glucose.length.toLocaleString();


      nutritionCount.textContent =
        state.nutrition.length.toLocaleString();


      populateCities();

      renderPatientContext(patientId);

      renderGlucose();

      setStatus(
        true,
        "Connected"
      );

    } catch (error) {

      console.error(error);

      setStatus(
        false,
        "Data unavailable"
      );

      content.innerHTML = `
        <div class="error-message">
          Patient context could not be loaded.
        </div>
      `;

    }
  }


  function extractItems(data) {

    if (Array.isArray(data)) {
      return data;
    }

    if (
      data &&
      Array.isArray(data.items)
    ) {
      return data.items;
    }

    return [];
  }


  function populateCities() {

    citySelect.innerHTML =
      '<option value="">All Cities</option>';

    const cities = [
      ...new Set(
        state.cities
          .map(x => x.city_id)
          .filter(Boolean)
      )
    ].sort();

    for (const city of cities) {

      const option =
        document.createElement("option");

      option.value = city;
      option.textContent = city;

      citySelect.appendChild(option);
    }
  }


  function renderPatientContext(
    patientId
  ) {

    const residences =
      state.cities;

    const nutrition =
      state.nutrition;

    const latestResidence =
      residences.length
        ? residences[
            residences.length - 1
          ]
        : null;


    content.innerHTML = `

      <div class="patient-id">
        ${escapeHtml(patientId)}
      </div>

      <div class="context-grid">

        <div>
          <small>Current city</small>

          <b>
            ${
              escapeHtml(
                latestResidence?.city_id
                || "–"
              )
            }
          </b>
        </div>

        <div>
          <small>Country</small>

          <b>
            ${
              escapeHtml(
                latestResidence
                  ?.country_code
                || "–"
              )
            }
          </b>
        </div>

        <div>
          <small>Glucose readings</small>

          <b>
            ${
              state.glucose.length
                .toLocaleString()
            }
          </b>
        </div>

        <div>
          <small>Nutrition groups</small>

          <b>
            ${
              nutrition.length
                .toLocaleString()
            }
          </b>
        </div>

      </div>

      ${renderNutrition(nutrition)}
    `;
  }


  function renderNutrition(rows) {

    if (!rows.length) {
      return `
        <div class="empty">
          No nutrition context.
        </div>
      `;
    }

    return `
      <div class="nutrition-list">

        <h3>
          Nutrition comparison
        </h3>

        ${
          rows.map(row => `

            <div class="nutrition-row">

              <span>
                ${
                  escapeHtml(
                    row.food_category
                    || "Unknown"
                  )
                }
              </span>

              <b>
                ${
                  Number(
                    row.patient_events || 0
                  ).toLocaleString()
                }
              </b>

              <small>
                Benchmark:
                ${
                  formatNumber(
                    row.city_benchmark
                  )
                }
              </small>

            </div>

          `).join("")
        }

      </div>
    `;
  }


  function renderGlucose() {

    const rows =
      state.glucose;

    if (!rows.length) {

      glucoseChart.innerHTML = `
        <div class="empty">
          No glucose readings.
        </div>
      `;

      return;
    }


    const sorted = [...rows]
      .filter(
        row =>
          Number.isFinite(
            Number(row.glucose_mmol_l)
          )
      )
      .sort(
        (a, b) =>
          new Date(a.reading_ts)
          - new Date(b.reading_ts)
      );


    if (!sorted.length) {
      return;
    }


    const values =
      sorted.map(
        x => Number(
          x.glucose_mmol_l
        )
      );


    const min =
      Math.min(...values);

    const max =
      Math.max(...values);

    const avg =
      values.reduce(
        (a, b) => a + b,
        0
      ) / values.length;


    const range =
      Math.max(
        max - min,
        0.1
      );


    const points =
      sorted.map(
        (row, index) => {

          const x =
            sorted.length === 1
              ? 50
              : (
                  index /
                  (sorted.length - 1)
                ) * 100;

          const y =
            90 -
            (
              (
                Number(
                  row.glucose_mmol_l
                ) - min
              ) / range
            ) * 70;

          return `${x},${y}`;

        }
      ).join(" ");


    glucoseChart.innerHTML = `

      <div class="chart-summary">

        <div>
          <small>Average</small>
          <b>${avg.toFixed(1)}</b>
          <span>mmol/L</span>
        </div>

        <div>
          <small>Minimum</small>
          <b>${min.toFixed(1)}</b>
        </div>

        <div>
          <small>Maximum</small>
          <b>${max.toFixed(1)}</b>
        </div>

      </div>

      <svg
        class="line-chart"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label="Patient glucose timeline"
      >

        <polyline
          points="${points}"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
        />

      </svg>

    `;
  }


  function formatNumber(value) {

    const number =
      Number(value);

    return Number.isFinite(number)
      ? number.toFixed(1)
      : "–";
  }


  function formatDate(value) {

    if (!value) {
      return "No timestamp";
    }

    const date =
      new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? String(value)
      : date.toLocaleString();
  }


  function escapeHtml(value) {

    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  patientSelect.addEventListener(
    "change",
    event => {
      loadPatient(
        event.target.value
      );
    }
  );


  citySelect.addEventListener(
    "change",
    event => {

      const city =
        event.target.value;

      if (!city) {
        return;
      }

      const residence =
        state.cities.find(
          x => x.city_id === city
        );

      if (residence) {

        content.insertAdjacentHTML(
          "afterbegin",
          `
            <div class="city-selection">
              Selected city:
              <b>
                ${escapeHtml(city)}
              </b>
            </div>
          `
        );

      }
    }
  );


  document
    .getElementById("info")
    .addEventListener(
      "click",
      () => help.showModal()
    );


  document
    .getElementById("closeHelp")
    .addEventListener(
      "click",
      () => help.close()
    );


  document
    .getElementById("theme")
    .addEventListener(
      "click",
      () => {

        const dark =
          root.dataset.theme === "dark";

        root.dataset.theme =
          dark
            ? "light"
            : "dark";

      }
    );


  document
    .getElementById("refresh")
    .addEventListener(
      "click",
      () => loadSources()
    );


  async function init() {

    try {

      await api("/api/health");

      setStatus(
        true,
        "Connected"
      );

      await Promise.all([
        loadPatients(),
        loadSources()
      ]);

    } catch (error) {

      console.error(error);

      setStatus(
        false,
        "API unavailable"
      );

      content.innerHTML = `
        <div class="error-message">
          DCP API is unavailable.
        </div>
      `;

    }
  }


  init();

})();