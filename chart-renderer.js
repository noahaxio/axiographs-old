// chart-renderer.js
// Unified colour mapping (shared across process)

const { createCanvas } = require('canvas');
const Chart = require('chart.js/auto');

// --- GLOBAL COLOUR SYSTEM (shared by both charts) ---
global.sensorColorMap = global.sensorColorMap || {};
global.colorIndex = global.colorIndex || 0;

// No-yellow palette
const COLOR_PALETTE = [
    'rgba(255, 99, 132, 0.6)',   // red
    'rgba(54, 162, 235, 0.6)',   // blue
    'rgba(75, 192, 192, 0.6)',   // teal
    'rgba(153, 102, 255, 0.6)',  // purple
    'rgba(255, 159, 64, 0.6)',   // orange
    'rgba(199, 199, 199, 0.6)',  // grey
    'rgba(83,102,255,0.6)',      // indigo
    'rgba(40,159,64,0.6)',       // dark green
    'rgba(210,99,132,0.6)'       // pink
];

// Border = same colours at opacity 1
const COLOR_PALETTE_BORDER = COLOR_PALETTE.map(c => c.replace('0.6', '1'));

// Force Total PV Charge to always be green
const PV_BG = 'rgba(40,159,64,0.6)';
const PV_BORDER = 'rgba(40,159,64,1)';

// --- GLOBAL COLOUR ASSIGNMENT ---
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

// --- BAR CHART RENDERER ---
module.exports = function renderBarChart(sensorArray, yAxisLabel = "kWh") {
    return new Promise((resolve, reject) => {
        try {
            const width = 800;
            const height = 400;
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext("2d");

            const labels = [];
            const values = [];
            const backgroundColor = [];
            const borderColor = [];

            sensorArray.forEach(point => {
                const sensor = point.sensor || "Unknown";
                const value = Number(point._value);

                labels.push(sensor);
                values.push(value);

                backgroundColor.push(getColorForSensor(sensor));
                borderColor.push(getBorderForSensor(sensor));
            });

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: "Sensor Values",
                        data: values,
                        backgroundColor,
                        borderColor,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: false,
                    animation: false,
                    scales: {
                        x: { title: { display: true, text: "Sensors" } },
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: yAxisLabel }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });

            resolve(canvas.toDataURL("image/png"));
        } catch (err) {
            reject(err);
        }
    });
};
