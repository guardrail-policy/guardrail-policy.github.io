(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var TASKS = [
    ['Tomato Plate', 'Transfer'],
    ['Marker Handover', '& Stand'],
    ['Wine Serving']
  ];
  var STYLE = {
    panel: '#FFFDF8',
    ink: '#2F2A24',
    muted: '#655D52',
    grid: '#D8D0C3'
  };
  var CHARTS = {
    'data-collection': {
      series: [
        { label: 'OpenTV', color: '#FF5F5F', edge: '#D64242' },
        { label: 'Manual', color: '#37A5FF', edge: '#1E7ECC' },
        { label: 'GLIDE', color: '#3CD278', edge: '#29A95D', opacity: 0.42 },
        { label: 'GLIDE (iter 1)', color: '#3CD278', edge: '#29A95D', opacity: 0.68 },
        { label: 'GLIDE (iter 2)', color: '#3CD278', edge: '#29A95D' }
      ],
      success: [[0, 20, 60, 60, 70], [10, 60, 70, 60, 90], [0, 60, 0, 0, 90]]
    },
    'policy-deployment': {
      series: [
        { label: 'Success-only, raw', color: '#FF5F5F', edge: '#D64242' },
        { label: 'Success-only, guarded', color: '#37A5FF', edge: '#1E7ECC' },
        { label: 'Mixed, guarded', color: '#3CD278', edge: '#29A95D' }
      ],
      success: [[0, 60, 70], [20, 50, 60], [50, 40, 60]]
    }
  };

  function svgElement(name, attributes, text) {
    var element = document.createElementNS(NS, name);
    Object.keys(attributes || {}).forEach(function (key) {
      element.setAttribute(key, attributes[key]);
    });
    if (typeof text !== 'undefined') {
      element.textContent = text;
    }
    return element;
  }

  function addText(parent, x, y, text, attributes) {
    var attrs = Object.assign({ x: x, y: y, fill: STYLE.ink }, attributes || {});
    var node = svgElement('text', attrs, text);
    parent.appendChild(node);
    return node;
  }

  function addLabel(parent, x, y, text, color) {
    var width = 17 + text.length * 7.2;
    var height = 27;
    var group = svgElement('g', { class: 'result-chart-label' });
    group.appendChild(svgElement('rect', {
      x: x - width / 2,
      y: y - height + 5,
      width: width,
      height: height,
      rx: 6,
      fill: STYLE.panel,
      stroke: color,
      'stroke-width': 1.2
    }));
    addText(group, x, y - 3, text, {
      'text-anchor': 'middle',
      'font-size': 14,
      'font-weight': '700',
      fill: color
    });
    parent.appendChild(group);
    return group;
  }

  function addLegend(svg, data) {
    var itemWidths = data.series.map(function (item) {
      var width = 45 + item.label.length * 8;
      return item.label === 'GLIDE (iter 1)' ? width - 28 : width;
    });
    var totalWidth = itemWidths.reduce(function (sum, width) { return sum + width; }, 0);
    var cursor = (1100 - totalWidth) / 2;

    data.series.forEach(function (item, index) {
      var legendItem = svgElement('g', {
        class: 'result-chart-legend-item',
        role: 'button',
        tabindex: '0',
        'aria-label': 'Highlight ' + item.label,
        'aria-pressed': 'false',
        'data-series': index
      });
      legendItem.appendChild(svgElement('rect', {
        class: 'result-chart-legend-swatch',
        x: cursor,
        y: 25,
        width: 28,
        height: 16,
        rx: 2,
        fill: item.color,
        stroke: item.edge,
        'stroke-width': 1.2,
        opacity: item.opacity || 1
      }));
      addText(legendItem, cursor + 35, 38, item.label, { 'font-size': 13 });
      legendItem.addEventListener('click', function () {
        toggleSeriesFocus(svg, index);
      });
      legendItem.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }
        event.preventDefault();
        toggleSeriesFocus(svg, index);
      });
      svg.appendChild(legendItem);
      cursor += itemWidths[index];
    });
  }

  function toggleSeriesFocus(svg, selectedIndex) {
    var activeIndex = svg.getAttribute('data-active-series');
    var nextIndex = activeIndex === String(selectedIndex) ? null : String(selectedIndex);
    var seriesNodes = svg.querySelectorAll('.result-chart-bar, .result-chart-label');
    var legendItems = svg.querySelectorAll('.result-chart-legend-item');

    if (nextIndex === null) {
      svg.removeAttribute('data-active-series');
    } else {
      svg.setAttribute('data-active-series', nextIndex);
    }

    Array.prototype.forEach.call(seriesNodes, function (node) {
      var isSelected = nextIndex === null || node.getAttribute('data-series') === nextIndex;
      var baseOpacity = Number(node.getAttribute('data-base-opacity') || 1);
      node.style.opacity = String(isSelected ? baseOpacity : baseOpacity * 0.14);
    });
    Array.prototype.forEach.call(legendItems, function (item) {
      var isSelected = nextIndex === null || item.getAttribute('data-series') === nextIndex;
      item.style.opacity = isSelected ? '1' : '0.32';
      item.setAttribute('aria-pressed', nextIndex !== null && isSelected ? 'true' : 'false');
    });
  }

  function drawChart(host, data) {
    var canvas = host.querySelector('.result-chart-canvas');
    var svg = svgElement('svg', {
      class: 'result-chart-svg',
      viewBox: '0 0 1100 660',
      focusable: 'false'
    });
    var plot = { left: 92, right: 1015, top: 75, bottom: 555 };
    var plotHeight = plot.bottom - plot.top;
    addLegend(svg, data);

    for (var tick = 0; tick <= 100; tick += 20) {
      var tickY = plot.bottom - (tick / 110) * plotHeight;
      svg.appendChild(svgElement('line', { x1: plot.left, y1: tickY, x2: plot.right, y2: tickY, stroke: STYLE.grid, 'stroke-width': 1, 'stroke-dasharray': '3 4' }));
      addText(svg, plot.left - 12, tickY + 5, tick + '%', { 'text-anchor': 'end', 'font-size': 13, fill: STYLE.muted });
    }
    svg.appendChild(svgElement('line', { x1: plot.left, y1: plot.top, x2: plot.left, y2: plot.bottom, stroke: STYLE.grid }));
    svg.appendChild(svgElement('line', { x1: plot.left, y1: plot.bottom, x2: plot.right, y2: plot.bottom, stroke: STYLE.grid }));

    var leftLabel = addText(svg, 24, 360, 'Success Rate', { 'text-anchor': 'middle', 'font-size': 14 });
    leftLabel.setAttribute('transform', 'rotate(-90 24 360)');

    var groupCenters = [245, 550, 855];
    var barWidth = data.series.length === 5 ? 34 : 52;
    var gap = data.series.length === 5 ? 12 : 20;
    var totalGroupWidth = data.series.length * barWidth + (data.series.length - 1) * gap;

    data.success.forEach(function (taskValues, taskIndex) {
      var firstX = groupCenters[taskIndex] - totalGroupWidth / 2;
      taskValues.forEach(function (value, seriesIndex) {
        var item = data.series[seriesIndex];
        var x = firstX + seriesIndex * (barWidth + gap);
        var height = (value / 110) * plotHeight;
        var y = plot.bottom - height;
        var order = taskIndex * data.series.length + seriesIndex;
        var bar = svgElement('rect', {
          class: 'result-chart-bar', x: x, y: y, width: barWidth, height: height,
          rx: 2, fill: item.color, stroke: item.edge, 'stroke-width': 1.4,
          opacity: item.opacity || 1, 'data-order': order, 'data-series': seriesIndex,
          'data-base-opacity': item.opacity || 1,
          'data-y': y, 'data-height': height
        });
        svg.appendChild(bar);
        var successLabelY = Math.min(y - 9, plot.bottom - 12);
        var successLabel = addLabel(svg, x + barWidth / 2, successLabelY, value + '%', item.edge);
        successLabel.setAttribute('data-order', order);
        successLabel.setAttribute('data-series', seriesIndex);
        successLabel.setAttribute('data-base-opacity', 1);
      });

      TASKS[taskIndex].forEach(function (line, lineIndex) {
        addText(svg, groupCenters[taskIndex], 590 + lineIndex * 18, line, { 'text-anchor': 'middle', 'font-size': 14, 'font-weight': '600' });
      });
    });

    canvas.appendChild(svg);
    return svg;
  }

  function animateChart(svg) {
    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var bars = Array.prototype.slice.call(svg.querySelectorAll('.result-chart-bar'));
    var labels = Array.prototype.slice.call(svg.querySelectorAll('.result-chart-label'));
    if (reducedMotion || !Element.prototype.animate) {
      return;
    }

    bars.forEach(function (bar) {
      var finalY = Number(bar.getAttribute('data-y'));
      var finalHeight = Number(bar.getAttribute('data-height'));
      var delay = Number(bar.getAttribute('data-order')) * 65;
      bar.getAnimations().forEach(function (animation) { animation.cancel(); });
      bar.animate([
        { y: 555, height: 0 },
        { y: finalY, height: finalHeight }
      ], { duration: 760, delay: delay, easing: 'cubic-bezier(.22,.78,.25,1)', fill: 'backwards' });
    });
    labels.forEach(function (label) {
      var delay = 360 + Number(label.getAttribute('data-order')) * 65;
      label.getAnimations().forEach(function (animation) { animation.cancel(); });
      label.animate([
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 380, delay: delay, easing: 'ease-out', fill: 'backwards' });
    });
  }

  function init() {
    var hosts = Array.prototype.slice.call(document.querySelectorAll('[data-result-chart]'));
    var observer = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || entry.target.getAttribute('data-chart-played') === 'true') {
          return;
        }
        entry.target.setAttribute('data-chart-played', 'true');
        animateChart(entry.target.querySelector('svg'));
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.3 }) : null;

    hosts.forEach(function (host) {
      var data = CHARTS[host.getAttribute('data-result-chart')];
      if (!data) {
        return;
      }
      drawChart(host, data);
      if (observer) {
        observer.observe(host);
      } else {
        animateChart(svg);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
