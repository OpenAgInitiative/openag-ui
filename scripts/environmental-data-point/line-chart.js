// Generic template for environmental data points
import {html, forward, Effects} from 'reflex';
import {merge, tag} from '../common/prelude';
import * as Ordered from '../common/ordered';
import * as Unknown from '../common/unknown';
import Chart from 'chart.js';

// Limit for number of datapoints to keep for dashboard render.
const MAX = 500;

// Define a widget wrapper for Chart.js. This lets us define a block of code
// that doesn't get patched via virtual dom, which is important since
// chart.js manages its own lifecycle and event loop.
// See virtual-dom widgets for more
// https://github.com/Matt-Esch/virtual-dom/blob/master/docs/widget.md<Paste>
class LineChartWidget {
  constructor(label, data) {
    this.type = 'Widget';
    this.label = label;
    this.data = Ordered.toArray(data, compareByX);
  }

  init() {
    const parent = document.createElement('div');
    parent.style.width = '100%';
    const canvas = document.createElement('canvas');
    parent.appendChild(canvas);

    const chart = new Chart(canvas, {
      type: 'line',
      // Data should be of type [{x, y}]
      data: {
        datasets: [
          {
            label: this.label,
            data: this.data
          }
        ]
      },
      options: {
        responsive: true,
        // Do not show x/y grid lines
        scales: {
          yAxes: [
            {
              gridLines: {
                display: false
              }
            }
          ],
          xAxes: [{
            type: 'time',
            time: {
              displayFormats: {
                minute: 'h:mm a'
              }
            },
            gridLines: {
              display: false
            },
            position: 'bottom',
          }]
        }
      }
    });

    this.chart = chart;

    return parent;
  }

  update(widget, el) {
    this.chart = widget.chart;
    this.chart.data.datasets[0].data = this.data;
    this.chart.resize();
    this.chart.update();
  }

  destroy(el) {
    this.chart.destroy();
  }
}

// Actions

// Add a datapoint
/*
Example datapoint:

    {
      _id: "1466094635.68-590041682",
      _rev: "1-d843590a603547494a34c87a27593df5",
      environment: "environment_1",
      // Measured or desired?
      is_desired: false,
      timestamp: 1466094635.681755,
      value: "22.2000007629",
      variable: "air_temperature"
    }
*/
export const Add = tag('Add');
export const InsertMany = tag('InsertMany');

// Init and update functions

// Provide variable name and title for module
export const init = (variable, title) => [
  {
    variable,
    title,
    measured: {},
    desired: {}
  },
  Effects.none
];

export const update = (model, action) =>
  action.type === 'Add' ?
  add(model, action.source) :
  action.type === 'InsertMany' ?
  insertMany(model, action.source) :
  Unknown.update(model, action);

const addMeasured = (model, dataPoint) => [
  merge(model, {
    measured: Ordered.insert(model.measured, readDataPoint(dataPoint), getX)
  }),
  Effects.none
];

const addDesired = (model, dataPoint) => [
  merge(model, {
    desired: Ordered.insert(model.desired, readDataPoint(dataPoint), getX)
  }),
  Effects.none
];

const add = (model, dataPoint) =>
  dataPoint.is_desired ?
  addDesired(model, dataPoint) :
  addMeasured(model, dataPoint);

const insertMany = (model, dataPoints) => {
  // Could benefit from reducers here?
  const measured = dataPoints.filter(isMeasured).map(readDataPoint);
  const desired = dataPoints.filter(isDesired).map(readDataPoint);

  const next = merge(model, {
    desired: Ordered.insertMany(model.desired, desired, getX),
    measured: Ordered.insertMany(model.measured, measured, getX)
  });

  return [next, Effects.none];
}

const getX = chartPoint => chartPoint.x;
const isDesired = dataPoint => dataPoint.is_desired;
const isMeasured = dataPoint => !dataPoint.is_desired;

const readDataPoint = ({timestamp, value}) => ({
  x: new Date(timestamp * 1000),
  y: Number.parseFloat(value)
});

// Sort by x (timestamp) desc.
const compareByX = (a, b) => a.x > b.x ? 1 : -1;

// View

export const view = (model, address) =>
  new LineChartWidget(model.title, model.measured);
