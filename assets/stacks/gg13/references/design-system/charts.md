# Charts

## Overview

PrimeVue `Chart` component for data visualization using Chart.js. Use for dashboards, reports, and analytics.

## Basic Chart

```html
<Chart type="line" :data="chartData" :options="chartOptions" style="height: 400px" />
```

## Chart Types

### Line Chart

```html
<Chart type="line" :data="lineData" :options="lineOptions" style="height: 400px" />
```

- Used for **trends over time** (revenue, users, activity).
- Show grid lines for readability.
- Use smooth curves (`tension: 0.4`).

### Bar Chart

```html
<Chart type="bar" :data="barData" :options="barOptions" style="height: 400px" />
```

- Used for **comparisons** (categories, periods).
- Vertical bars by default.
- Use `indexAxis: 'y'` for horizontal bars.

### Pie Chart

```html
<Chart type="pie" :data="pieData" :options="pieOptions" style="height: 300px" />
```

- Used for **proportions** (distribution, percentages).
- Max 5–6 slices for readability.
- Show labels with percentages.

### Doughnut Chart

```html
<Chart type="doughnut" :data="doughnutData" :options="doughnutOptions" style="height: 300px" />
```

- Used for **proportions with center space** (KPIs, progress).
- Show center text with `plugins.doughnut.type: 'text'`.

### Area Chart

```html
<Chart type="line" :data="areaData" :options="{ ...areaOptions, elements: { area: { tension: 0.4 } } }" style="height: 400px" />
```

- Used for **volume over time** (traffic, usage).
- Fill area under the line with primary color at low opacity.

### Radar Chart

```html
<Chart type="radar" :data="radarData" :options="radarOptions" style="height: 400px" />
```

- Used for **multi-dimensional comparisons** (skills, metrics).
- Show grid lines and labels.

### Polar Area Chart

```html
<Chart type="polarArea" :data="polarData" :options="polarOptions" style="height: 400px" />
```

- Used for **comparing proportions** (similar to pie but with radius).
- Max 5–6 categories.

## Chart Colors

### Using Design System Colors

```js
const chartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  datasets: [{
    label: 'Revenue',
    data: [1000, 2000, 1500, 3000, 2500],
    borderColor: 'rgba(0, 100, 245, 1)', // --color-primary-600
    backgroundColor: 'rgba(0, 100, 245, 0.1)',
    pointBackgroundColor: 'rgba(0, 100, 245, 1)',
  }],
};
```

### Color Palette for Multiple Datasets

| Dataset | Color | CSS Variable |
|---------|-------|--------------|
| 1 | Blue | `--color-primary-500` |
| 2 | Green | `--color-success-500` |
| 3 | Orange | `--color-warning-500` |
| 4 | Red | `--color-danger-500` |
| 5 | Cyan | `--color-info-500` |
| 6 | Purple | `--color-secondary-500` |

```js
const datasetColors = [
  'rgba(0, 100, 245, 1)',   // primary
  'rgba(16, 185, 129, 1)',  // success
  'rgba(245, 158, 11, 1)',  // warning
  'rgba(239, 68, 68, 1)',   // danger
  'rgba(6, 182, 212, 1)',   // info
  'rgba(80, 103, 248, 1)',  // secondary
];
```

## Chart Options

### Responsive Sizing

```html
<Chart
  type="line"
  :data="chartData"
  :options="{
    responsive: true,
    maintainAspectRatio: false,
  }"
  style="height: 400px"
/>
```

- Set `maintainAspectRatio: false` for flexible sizing.
- Use `style="height: Xpx"` for fixed height.
- Use `style="height: 100%"` for full-height containers.

### Grid Lines

```js
const chartOptions = {
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      grid: {
        color: 'rgba(0, 0, 0, 0.05)',
      },
      beginAtZero: true,
    },
  },
};
```

- X-axis grid: hidden.
- Y-axis grid: light gray (`rgba(0, 0, 0, 0.05)`).
- Begin at zero for bar charts.

### Tooltips

```js
const chartOptions = {
  plugins: {
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      padding: 12,
      cornerRadius: 8,
      displayColors: true,
      callbacks: {
        label: (context) => `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`,
      },
    },
  },
};
```

- Dark background (`rgba(0, 0, 0, 0.8)`).
- White text.
- Rounded corners (8px).
- Show dataset color indicator.
- Custom label formatter for units.

### Legends

```js
const chartOptions = {
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 20,
        font: {
          size: 12,
        },
      },
    },
  },
};
```

- Position: top (default).
- Point style: circle.
- Padding: 20px between items.
- Font size: 12px.

### Animations

```js
const chartOptions = {
  animation: {
    duration: 1000,
    easing: 'easeOutQuart',
  },
};
```

- Duration: 1000ms.
- Easing: `easeOutQuart` for smooth entry.
- **Disable animations** for real-time updates (`animation: false`).

## Chart Configuration Examples

### Line Chart with Multiple Datasets

```js
const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: { usePointStyle: true, padding: 20 },
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      padding: 12,
      cornerRadius: 8,
    },
  },
  scales: {
    x: { grid: { display: false } },
    y: {
      grid: { color: 'rgba(0, 0, 0, 0.05)' },
      beginAtZero: true,
      ticks: {
        callback: (value) => `$${value.toLocaleString()}`,
      },
    },
  },
  elements: {
    line: { tension: 0.4 },
    point: { radius: 4, hoverRadius: 6 },
  },
};
```

### Bar Chart

```js
const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      padding: 12,
      cornerRadius: 8,
    },
  },
  scales: {
    x: { grid: { display: false } },
    y: {
      grid: { color: 'rgba(0, 0, 0, 0.05)' },
      beginAtZero: true,
    },
  },
};
```

### Pie Chart

```js
const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: { usePointStyle: true, padding: 16 },
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: (context) => `${context.label}: ${context.parsed}%`,
      },
    },
  },
};
```

## Chart Rules

1. **Use appropriate chart type** for the data (line for trends, bar for comparisons, pie for proportions).
2. **Limit to 6 datasets** per chart. More → use a dropdown to switch datasets.
3. **Always show a legend** for multi-dataset charts.
4. **Use tooltips** for exact values (don't rely on axis labels alone).
5. **Begin at zero** for bar charts (misleading if truncated).
6. **Use design system colors** for datasets.
7. **Responsive sizing:** set `maintainAspectRatio: false` and use `style="height: Xpx"`.
8. **Animate on load** (1000ms) for smooth entry.
9. **Test in dark mode:** ensure chart colors are visible on dark backgrounds.
10. **Export charts** as PNG/PDF for reports (use Chart.js `toBase64Image()`).

## PrimeVue Chart Theme Tokens

Chart.js uses its own theme system. PrimeVue provides the `<Chart>` wrapper.

```css
/* Chart.js theme customization via options */
--chart-tooltip-bg: rgba(0, 0, 0, 0.8);
--chart-tooltip-text: #ffffff;
--chart-grid-color: rgba(0, 0, 0, 0.05);
--chart-legend-font-size: 12px;
--chart-point-radius: 4px;
--chart-point-hover-radius: 6px;
```
