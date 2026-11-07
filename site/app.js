const governmentCycles = [
  { id: 'cardoso-1', label: 'Fernando Henrique Cardoso I', shortLabel: 'FHC I', start: '1995-01-01', end: '1998-12-31' },
  { id: 'cardoso-2', label: 'Fernando Henrique Cardoso II', shortLabel: 'FHC II', start: '1999-01-01', end: '2002-12-31' },
  { id: 'lula-1', label: 'Lula I', shortLabel: 'Lula I', start: '2003-01-01', end: '2006-12-31' },
  { id: 'lula-2', label: 'Lula II', shortLabel: 'Lula II', start: '2007-01-01', end: '2010-12-31' },
  { id: 'dilma-1', label: 'Dilma I', shortLabel: 'Dilma I', start: '2011-01-01', end: '2014-12-31' },
  { id: 'dilma-2', label: 'Dilma II', shortLabel: 'Dilma II', start: '2015-01-01', end: '2018-12-31' },
  { id: 'bolsonaro', label: 'Bolsonaro', shortLabel: 'Bolsonaro', start: '2019-01-01', end: '2022-12-31' },
  { id: 'lula-3', label: 'Lula III', shortLabel: 'Lula III', start: '2023-01-01', end: '2026-12-31' }
];

const indicatorDataBase = location.pathname.replace(/\/+$/, '').endsWith('/site')
  ? '../data/indicators'
  : 'data/indicators';

const indicatorFiles = {
  selic: `${indicatorDataBase}/selic.json`,
  ipca: `${indicatorDataBase}/ipca.json`,
  fx_reserves: `${indicatorDataBase}/fx_reserves.json`,
  unemployment: `${indicatorDataBase}/unemployment.json`,
  gdp_growth: `${indicatorDataBase}/gdp_growth.json`,
  real_gdp_per_capita: `${indicatorDataBase}/real_gdp_per_capita.json`,
  real_income: `${indicatorDataBase}/real_income.json`,
  primary_balance: `${indicatorDataBase}/primary_balance.json`,
  gross_debt: `${indicatorDataBase}/gross_debt.json`
};

const indicatorGroups = [
  { id: 'monetary', title: 'Prices & monetary policy', color: '#67d5b5', background: 'rgba(24, 76, 69, 0.44)', ids: ['selic', 'ipca'] },
  { id: 'activity', title: 'Output, jobs & household income', color: '#86b9ff', background: 'rgba(29, 65, 103, 0.42)', ids: ['gdp_growth', 'real_gdp_per_capita', 'unemployment', 'real_income'] },
  { id: 'fiscal', title: 'Public finances', color: '#f2a17e', background: 'rgba(93, 49, 42, 0.42)', ids: ['primary_balance', 'gross_debt'] },
  { id: 'external', title: 'External position', color: '#e8c86d', background: 'rgba(92, 75, 35, 0.4)', ids: ['fx_reserves'] }
];

const state = {
  indicators: [],
  selectedMetric: 'avg',
  selectedView: 'timeline'
};

const metricLabels = {
  avg: 'Average in term',
  end: 'End of term',
  change: 'Change during term'
};

const metricFields = {
  avg: 'average',
  end: 'endValue',
  change: 'change'
};

const cycleColors = ['#62d2a2', '#f6bd60', '#f28482', '#84a9ff', '#c792ea', '#4ecdc4', '#f78fb3', '#b8c0ff'];
const notableEvents = [
  { date: '2008-09-15', label: 'Global financial crisis' },
  { date: '2020-03-11', label: 'COVID-19 shock' }
];

const eventLabelsPlugin = {
  id: 'eventLabels',
  afterDatasetsDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    ctx.save();
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textBaseline = 'middle';

    chart.data.datasets.forEach((dataset, datasetIndex) => {
      dataset.data.forEach((point) => {
        if (!point.event) return;
        const x = scales.x.getPixelForValue(point.x);
        const y = scales.y.getPixelForValue(point.y);
        if (x < chartArea.left || x > chartArea.right || y < chartArea.top || y > chartArea.bottom) return;

        const labelWidth = ctx.measureText(point.event).width;
        const labelX = Math.min(x + 9, chartArea.right - labelWidth - 12);
        const labelY = Math.max(chartArea.top + 10, y - 18);
        const color = dataset.borderColor;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(8, 20, 33, 0.92)';
        ctx.fillRect(labelX - 4, labelY - 9, labelWidth + 8, 18);
        ctx.fillStyle = '#edf4ff';
        ctx.fillText(point.event, labelX, labelY);
      });
    });

    ctx.restore();
  }
};

const metricSelect = document.getElementById('metricSelect');
const indicatorGroupsRoot = document.getElementById('indicatorGroups');

const timelineCharts = new Map();
const comparisonCharts = new Map();
const cycleCharts = new Map();

async function loadIndicators() {
  const responses = await Promise.all(
    Object.entries(indicatorFiles).map(async ([id, url]) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Unable to load ${url}`);
      }
      const payload = await response.json();
      return { id, ...payload };
    })
  );

  state.indicators = responses;
  buildIndicatorSections();
  bindControls();
  renderAll();
}

function buildIndicatorSections() {
  const indicatorsById = new Map(state.indicators.map((indicator) => [indicator.id, indicator]));

  indicatorGroupsRoot.innerHTML = indicatorGroups.map((group) => `
    <section class="category-band" style="--group-color: ${group.color}; --group-background: ${group.background}">
      <header class="category-heading">
        <div>
          <p>Macro indicators</p>
          <h2>${group.title}</h2>
        </div>
        <span>${group.ids.length} series</span>
      </header>
      ${group.ids.map((id) => {
        const indicator = indicatorsById.get(id);
        if (!indicator) return '';
        const firstDate = indicator.series[0]?.date || 'No observations';
        const lastDate = indicator.series.at(-1)?.date || '';
        return `
          <article class="indicator-block" data-indicator="${indicator.id}">
            <header class="indicator-heading">
              <div class="indicator-name">
                <h3>${indicator.name.en}</h3>
                <p>${indicator.source} <span aria-hidden="true">·</span> ${indicator.frequency}</p>
                <small>${firstDate}${lastDate ? ` to ${lastDate}` : ''}</small>
              </div>
              <div class="indicator-latest">
                <span>Latest · ${indicator.latest.date}</span>
                <strong>${formatValue(indicator.latest.value, indicator)} ${indicator.unit}</strong>
              </div>
            </header>
            <div class="indicator-charts">
              <section class="indicator-chart-main">
                <h4 id="${indicator.id}-main-title">Indicator timeline</h4>
                <canvas id="${indicator.id}-timeline" aria-label="${indicator.name.en} timeline"></canvas>
                <div id="${indicator.id}-cycles" class="cycle-grid" hidden></div>
              </section>
              <section class="indicator-chart-side">
                <h4>Government comparison</h4>
                <p id="${indicator.id}-comparison-metric">${metricLabels[state.selectedMetric]}</p>
                <canvas id="${indicator.id}-comparison" aria-label="${indicator.name.en} government comparison"></canvas>
              </section>
            </div>
          </article>
        `;
      }).join('')}
    </section>
  `).join('');
}

function bindControls() {
  metricSelect.addEventListener('change', (event) => {
    state.selectedMetric = event.target.value;
    renderAll();
  });

  document.querySelectorAll('[data-chart-view]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedView = button.dataset.chartView;
      document.querySelectorAll('[data-chart-view]').forEach((viewButton) => {
        viewButton.setAttribute('aria-pressed', String(viewButton === button));
      });
      renderAll();
    });
  });
}

function parseDate(value) {
  if (!value) return null;
  const normalized = value.includes('T') ? value : `${value}T00:00:00Z`;
  return new Date(normalized);
}

function getObservationsForGovernment(indicator, government) {
  const start = parseDate(government.start);
  const end = parseDate(government.end);

  return (indicator.series || []).filter((point) => {
    const date = parseDate(point.date);
    return date >= start && date <= end;
  });
}

function summarizeGovernment(indicator, government) {
  const observations = getObservationsForGovernment(indicator, government);
  if (!observations.length) {
    return null;
  }

  const values = observations.map((observation) => Number(observation.value));
  const startValue = values[0];
  const endValue = values[values.length - 1];
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    government: government.label,
    startValue,
    endValue,
    average,
    change: endValue - startValue,
    observations
  };
}

function formatValue(value, indicator) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  const abs = Math.abs(value);
  const digits = abs >= 10000 ? 0 : abs >= 100 ? 1 : abs >= 1 ? 2 : 3;
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value);
}

function formatValueWithUnit(value, indicator) {
  const base = formatValue(value, indicator);
  return `${base} ${indicator.unit || ''}`.trim();
}

function createTimelineChart(indicator, canvas) {
  const oldTimeline = timelineCharts.get(indicator.id);
  const oldCycles = cycleCharts.get(indicator.id) || [];
  oldTimeline?.destroy();
  oldCycles.forEach((chart) => chart.destroy());
  cycleCharts.delete(indicator.id);

  const eventLabels = getGlobalEventLabels(indicator);
  const values = (indicator.series || []).map((point) => Number(point.value));
  const dates = (indicator.series || []).map((point) => Date.parse(`${point.date}T00:00:00Z`));

  const chartConfig = {
    type: 'line',
    data: {
      datasets: [{
        label: indicator.name.en,
        data: (indicator.series || []).map((point) => ({
          x: Date.parse(`${point.date}T00:00:00Z`),
          y: Number(point.value),
          date: point.date,
          event: eventLabels.get(point.date)
        })),
        borderColor: '#7dd3fc',
        backgroundColor: 'rgba(125, 211, 252, 0.2)',
        borderWidth: 2,
        pointRadius: (context) => context.raw?.event ? 4 : 0,
        pointHoverRadius: 4,
        tension: 0.2,
        stepped: indicator.frequency === 'irregular' ? 'after' : false,
        fill: false
      }]
    },
    plugins: [eventLabelsPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title(items) {
              return items[0]?.raw.date || '';
            },
            label(context) {
              const point = context.raw;
              const value = `${formatValue(point.y, indicator)} ${indicator.unit || ''}`.trim();
              return point.event ? `${value} (${point.event})` : value;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          min: dates[0],
          max: dates.at(-1),
          ticks: {
            maxTicksLimit: 10,
            color: '#9eb1c0',
            callback(value) {
              return new Date(Number(value)).getUTCFullYear();
            }
          },
          grid: { color: 'rgba(148, 163, 184, 0.12)' }
        },
        y: {
          ticks: { color: '#9eb1c0' },
          grid: { color: 'rgba(148, 163, 184, 0.12)' }
        }
      }
    }
  };

  timelineCharts.set(indicator.id, new Chart(canvas, chartConfig));
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function isLocalOutlier(series, candidate) {
  const candidateTime = parseDate(candidate.date).getTime();
  const window = 183 * 24 * 60 * 60 * 1000;
  const nearbyValues = series
    .filter((point) => point.date !== candidate.date && Math.abs(parseDate(point.date).getTime() - candidateTime) <= window)
    .map((point) => Number(point.value))
    .filter(Number.isFinite);

  if (nearbyValues.length < 3) return false;

  const center = median(nearbyValues);
  const deviation = median(nearbyValues.map((value) => Math.abs(value - center)));
  const threshold = Math.max(2 * 1.4826 * deviation, 0.5);
  return Math.abs(Number(candidate.value) - center) > threshold;
}

function getOverlayObservations(indicator, government) {
  const observations = getObservationsForGovernment(indicator, government);
  if (indicator.frequency !== 'daily') return observations;

  const byMonth = new Map();
  observations.forEach((point) => byMonth.set(point.date.slice(0, 7), point));
  return [...byMonth.values()];
}

function getEventLabels(indicator, government, observations) {
  const labels = new Map();
  const start = parseDate(government.start);
  const end = parseDate(government.end);

  notableEvents.forEach((event) => {
    const eventDate = parseDate(event.date);
    if (eventDate < start || eventDate > end) return;

    const candidate = observations
      .filter((point) => Math.abs(parseDate(point.date) - eventDate) <= 120 * 24 * 60 * 60 * 1000)
      .sort((left, right) => Math.abs(parseDate(left.date) - eventDate) - Math.abs(parseDate(right.date) - eventDate))[0];

    if (candidate && isLocalOutlier(indicator.series || [], candidate)) {
      labels.set(candidate.date, event.label);
    }
  });

  return labels;
}

function getGlobalEventLabels(indicator) {
  const labels = new Map();
  notableEvents.forEach((event) => {
    const eventDate = parseDate(event.date);
    const candidate = (indicator.series || [])
      .filter((point) => Math.abs(parseDate(point.date) - eventDate) <= 120 * 24 * 60 * 60 * 1000)
      .sort((left, right) => Math.abs(parseDate(left.date) - eventDate) - Math.abs(parseDate(right.date) - eventDate))[0];

    if (candidate && isLocalOutlier(indicator.series || [], candidate)) {
      labels.set(candidate.date, event.label);
    }
  });
  return labels;
}

function createAlignedChart(indicator, cycleGrid) {
  timelineCharts.get(indicator.id)?.destroy();
  timelineCharts.delete(indicator.id);
  (cycleCharts.get(indicator.id) || []).forEach((chart) => chart.destroy());

  const cycles = governmentCycles.map((government, index) => {
    const observations = getOverlayObservations(indicator, government);
    const eventLabels = getEventLabels(indicator, government, observations);
    const start = parseDate(government.start);

    return {
      government,
      color: cycleColors[index % cycleColors.length],
      data: observations.map((point) => {
        const date = parseDate(point.date);
        const monthOffset = (date.getUTCFullYear() - start.getUTCFullYear()) * 12
          + date.getUTCMonth() - start.getUTCMonth()
          + (date.getUTCDate() - 1) / 31;
        return {
          x: monthOffset,
          y: Number(point.value),
          date: point.date,
          event: eventLabels.get(point.date)
        };
      })
    };
  });

  const values = cycles.flatMap((cycle) => cycle.data.map((point) => point.y));
  const dataMin = values.length ? Math.min(...values) : 0;
  const dataMax = values.length ? Math.max(...values) : 1;
  const padding = (dataMax - dataMin) * 0.08 || Math.abs(dataMax) * 0.08 || 1;

  cycleGrid.hidden = false;
  cycleGrid.innerHTML = cycles.map(({ government, data }) => `
    <section class="cycle-chart">
      <header class="cycle-heading">
        <h4>${government.label}</h4>
        <span>${government.start.slice(0, 4)}-${government.end.slice(0, 4)}</span>
      </header>
      ${data.length
        ? `<canvas id="cycle-${indicator.id}-${government.id}" aria-label="${government.label} ${indicator.name.en} over its four-year term"></canvas>`
        : '<p class="cycle-empty">No observations</p>'}
    </section>
  `).join('');

  const charts = cycles.filter((cycle) => cycle.data.length).map((cycle) => new Chart(
    cycleGrid.querySelector(`#cycle-${indicator.id}-${cycle.government.id}`),
    {
      type: 'line',
      data: {
        datasets: [{
          label: cycle.government.label,
          data: cycle.data,
          borderColor: cycle.color,
          backgroundColor: cycle.color,
          borderWidth: 2,
          pointRadius: (context) => context.raw?.event ? 4 : 0,
          pointHoverRadius: 4,
          tension: 0.12,
          stepped: indicator.frequency === 'irregular' ? 'after' : false,
          spanGaps: false
        }]
      },
      plugins: [eventLabelsPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title(items) {
                return items[0]?.raw.date || cycle.government.label;
              },
              label(context) {
                const point = context.raw;
                const value = `${formatValue(point.y, indicator)} ${indicator.unit || ''}`.trim();
                return point.event ? `${value} (${point.event})` : value;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            min: 0,
            max: 48,
            ticks: {
              stepSize: 12,
              color: '#9eb1c0',
              callback(value) {
                return value === 0 ? 'Start' : `Year ${value / 12}`;
              }
            },
            grid: { color: 'rgba(148, 163, 184, 0.12)' }
          },
          y: {
            min: dataMin - padding,
            max: dataMax + padding,
            ticks: { color: '#9eb1c0', maxTicksLimit: 5 },
            grid: { color: 'rgba(148, 163, 184, 0.12)' }
          }
        }
      }
    }
  ));

  cycleCharts.set(indicator.id, charts);
}

function createPrimaryChart(indicator, timelineCanvas, cycleGrid) {
  const title = document.getElementById(`${indicator.id}-main-title`);
  title.textContent = state.selectedView === 'timeline' ? 'Indicator timeline' : 'Government cycles by term';
  timelineCanvas.hidden = state.selectedView !== 'timeline';
  cycleGrid.hidden = state.selectedView === 'timeline';
  if (state.selectedView === 'timeline') {
    createTimelineChart(indicator, timelineCanvas);
  } else {
    createAlignedChart(indicator, cycleGrid);
  }
}

function createComparisonChart(indicator, canvas) {
  const rows = governmentCycles.map((government) => {
    const summary = summarizeGovernment(indicator, government);
    return {
      label: government.label,
      shortLabel: government.shortLabel,
      value: summary ? summary[metricFields[state.selectedMetric]] : null
    };
  });

  const data = rows.map((row) => row.value);

  comparisonCharts.get(indicator.id)?.destroy();

  comparisonCharts.set(indicator.id, new Chart(canvas, {
    type: 'bar',
    data: {
      labels: rows.map((row) => row.shortLabel),
      datasets: [{
        label: metricLabels[state.selectedMetric],
        data,
        borderRadius: 6,
        backgroundColor: rows.map((row) => row.value !== null ? 'rgba(125, 211, 252, 0.8)' : 'rgba(148, 163, 184, 0.2)'),
        borderColor: rows.map((row) => row.value !== null ? '#7dd3fc' : '#94a3b8'),
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label(context) {
              const indicatorUnit = indicator.unit || '';
              return `${metricLabels[state.selectedMetric]}: ${context.parsed.x.toFixed(2)} ${indicatorUnit}`;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          ticks: {
            color: '#9eb1c0'
          },
          grid: {
            color: 'rgba(148, 163, 184, 0.12)'
          }
        },
        y: {
          ticks: {
            color: '#9eb1c0'
          },
          grid: {
            display: false
          }
        }
      }
    }
  }));
}

function renderAll() {
  state.indicators.forEach((indicator) => {
    const timelineCanvas = document.getElementById(`${indicator.id}-timeline`);
    const cycleGrid = document.getElementById(`${indicator.id}-cycles`);
    const comparisonCanvas = document.getElementById(`${indicator.id}-comparison`);
    const metricLabel = document.getElementById(`${indicator.id}-comparison-metric`);

    metricLabel.textContent = metricLabels[state.selectedMetric];
    createPrimaryChart(indicator, timelineCanvas, cycleGrid);
    createComparisonChart(indicator, comparisonCanvas);
  });
}

loadIndicators().catch((error) => {
  console.error(error);
  document.body.innerHTML = '<div style="padding: 32px; color: white; font-family: sans-serif;">Unable to load the indicator data. Check that the JSON files exist in the data folder.</div>';
});
