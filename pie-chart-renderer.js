// pie-chart-renderer.js
// Uses the same global colour map as chart-renderer.js

const { createCanvas } = require('@napi-rs/canvas');
const Chart = require('chart.js/auto');

// --- GLOBAL COLOUR SYSTEM (same as bar chart) ---
global.sensorColorMap = global.sensorColorMap || {};
global.colorIndex = global.colorIndex || 0;

const COLOR_PALETTE = [
  'rgba(255, 99, 132, 0.6)',
  'rgba(54, 162, 235, 0.6)',
  'rgba(75, 192, 192, 0.6)',
  'rgba(153, 102, 255, 0.6)',
  'rgba(255, 159, 64, 0.6)',
  'rgba(199, 199, 199, 0.6)',
  'rgba(83,102,255,0.6)',
  'rgba(40,159,64,0.6)',
  'rgba(210,99,132,0.6)'
];

const COLOR_PALETTE_BORDER = COLOR_PALETTE.map(c => c.replace('0.6', '1'));

const PV_BG = 'rgba(40,159,64,0.7)';
const PV_BORDER = 'rgba(40,159,64,1)';

function getColorForSensor(sensor) {
  if (sensor === "Total PV Charge") return PV_BG;

  if (!global.sensorColorMap[sensor]) {
    global.sensorColorMap[sensor] =
      COLOR_PALETTE[global.colorIndex % COLOR_PALETTE.length];
    global.colorIndex++;
  }
  return global.sensorColorMap[sensor];
}

function getBorderForSensor(sensor) {
  if (sensor === "Total PV Charge") return PV_BORDER;

  const bg = getColorForSensor(sensor);
  const idx = COLOR_PALETTE.indexOf(bg);
  return COLOR_PALETTE_BORDER[idx];
}

// --- PIE CHART RENDERER ---
module.exports = async function renderPieChart(sensorArray = [], opts = {}) {
  const width = opts.width || 800;
  const height = opts.height || 400;
  const title = 'Energy Sources';

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const labels = [];
  const values = [];

  (Array.isArray(sensorArray) ? sensorArray : []).forEach(item => {
    const name = item?.sensor || item?.name || 'Unknown';
    const val = Number(item?._value ?? item?.value);

    if (name && !Number.isNaN(val) && val > 0) {
      labels.push(name);
      values.push(val);
    }
  });

  if (labels.length === 0) return null;

  const backgroundColor = labels.map(getColorForSensor);
  const borderColor = labels.map(getBorderForSensor);

  const chart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        label: 'Sensor Values',
        data: values,
        backgroundColor,
        borderColor,
        borderWidth: 2
      }]
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: {
          display: true,
          position: 'right',
          labels: {
            boxWidth: 12,
            padding: 15,
            generateLabels: chart => {
              const dataset = chart.data.datasets[0];
              const total = dataset.data.reduce((a, b) => a + b, 0);

              return chart.data.labels.map((label, i) => {
                const value = dataset.data[i];
                const pct = total ? ((value / total) * 100).toFixed(1) : 0;
                return {
                  text: `${label} (${pct}%)`,
                  fillStyle: dataset.backgroundColor[i],
                  strokeStyle: dataset.borderColor[i],
                  lineWidth: 2,
                  hidden: !chart.getDataVisibility(i),
                  index: i
                };
              });
            }
          }
        },
        title: {
          display: true,
          text: title
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const label = ctx.label;
              const value = ctx.raw;
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total ? Math.round((value / total) * 100) : 0;
              return `${label}: ${value} (${pct}%)`;
            }
          }
        }
      }
    }
  });

  const dataUrl = canvas.toDataURL('image/png');

  try { chart.destroy(); } catch {}

  return dataUrl;
};
