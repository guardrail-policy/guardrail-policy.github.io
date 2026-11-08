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
  var PLOT = { left: 92, right: 1015, top: 75, bottom: 555 };
  var CHARTS = {
    'data-collection': {
      series: [
        { label: 'OpenTV', color: '#FF5F5F', edge: '#D64242' },
        { label: 'Manual', color: '#37A5FF', edge: '#1E7ECC' },
        { label: 'GLIDE', color: '#3CD278', edge: '#29A95D', opacity: 0.42 },
        { label: 'GLIDE (iter 1)', color: '#3CD278', edge: '#29A95D', opacity: 0.68 },
        { label: 'GLIDE (iter 2)', color: '#3CD278', edge: '#29A95D' }
      ],
      barWidth: 34,
      gap: 12,
      success: [[0, 20, 60, 60, 70], [10, 60, 70, 60, 90], [0, 60, 0, 0, 90]]
    },
    // Table 2 (policy deployment): each training-data source is shown as an
    // unguarded (light) / guarded (solid) pair, with an arrow for the effect
    // of switching the runtime guardrail on.
    'policy-deployment': {
      legend: [
        { label: 'Vanilla', group: 0 },
        { label: 'Success-only', group: 1 },
        { label: 'Mixed', group: 2 }
      ],
      legendNote: 'Light = unguarded · Solid = guarded',
      series: [
        { label: 'Vanilla, unguarded', group: 0, color: '#FFC4C4', edge: '#F09191', text: '#D64242' },
        { label: 'Vanilla, guarded', group: 0, color: '#FF5F5F', edge: '#D64242' },
        { label: 'Success-only, unguarded', group: 1, color: '#C0E2FF', edge: '#88C4F2', text: '#1E7ECC' },
        { label: 'Success-only, guarded', group: 1, color: '#37A5FF', edge: '#1E7ECC' },
        { label: 'Mixed, unguarded', group: 2, color: '#BFEFD2', edge: '#84D6A5', text: '#29A95D' },
        { label: 'Mixed, guarded', group: 2, color: '#3CD278', edge: '#29A95D' }
      ],
      arrows: [[0, 1], [2, 3], [4, 5]],
      barWidth: 36,
      gap: 10,
      groupGap: 16,
      success: [[0, 20, 0, 60, 0, 70], [0, 20, 20, 50, 40, 60], [0, 0, 50, 40, 40, 60]]
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

  function groupOf(data, seriesIndex) {
    var group = data.series[seriesIndex].group;
    return String(typeof group === 'undefined' ? seriesIndex : group);
  }

  function textColor(item) {
    return item.text || item.edge;
  }

  // Returns the label's bounding box so arrows can be routed around it.
  function addLabel(parent, x, y, text, color) {
    var width = 17 + text.length * 7.2;
    var height = 27;
    var top = y - height + 5;
    var group = svgElement('g', { class: 'result-chart-label' });
    group.appendChild(svgElement('rect', {
      x: x - width / 2,
      y: top,
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
    return { node: group, x: x, top: top, bottom: top + height, half: width / 2 };
  }

  function legendEntries(data) {
    if (!data.legend) {
      return data.series.map(function (item, index) {
        return { label: item.label, group: String(index), swatches: [item] };
      });
    }
    return data.legend.map(function (entry) {
      var group = String(entry.group);
      return {
        label: entry.label,
        group: group,
        swatches: data.series.filter(function (item, index) { return groupOf(data, index) === group; })
      };
    });
  }

  function addLegend(svg, data) {
    var entries = legendEntries(data);
    var itemWidths = entries.map(function (entry) {
      var paired = entry.swatches.length > 1;
      var swatchWidth = paired ? 22 : 28;
      var swatchesWidth = entry.swatches.length * swatchWidth + (entry.swatches.length - 1) * 3;
      var width = swatchesWidth + 7 + entry.label.length * 8 + (paired ? 26 : 10);
      return entry.label === 'GLIDE (iter 1)' ? width - 28 : width;
    });
    var noteWidth = data.legendNote ? data.legendNote.length * 6.6 : 0;
    var totalWidth = itemWidths.reduce(function (sum, width) { return sum + width; }, 0) + noteWidth;
    var cursor = (1100 - totalWidth) / 2;

    entries.forEach(function (entry, index) {
      var legendItem = svgElement('g', {
        class: 'result-chart-legend-item',
        role: 'button',
        tabindex: '0',
        'aria-label': 'Highlight ' + entry.label,
        'aria-pressed': 'false',
        'data-group': entry.group
      });
      var swatchWidth = entry.swatches.length > 1 ? 22 : 28;
      var swatchX = cursor;
      entry.swatches.forEach(function (item) {
        legendItem.appendChild(svgElement('rect', {
          class: 'result-chart-legend-swatch',
          x: swatchX,
          y: 25,
          width: swatchWidth,
          height: 16,
          rx: 2,
          fill: item.color,
          stroke: item.edge,
          'stroke-width': 1.2,
          opacity: item.opacity || 1
        }));
        swatchX += swatchWidth + 3;
      });
      addText(legendItem, swatchX + 4, 38, entry.label, { 'font-size': 13 });
      legendItem.addEventListener('click', function () {
        toggleGroupFocus(svg, entry.group);
      });
      legendItem.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }
        event.preventDefault();
        toggleGroupFocus(svg, entry.group);
      });
      svg.appendChild(legendItem);
      cursor += itemWidths[index];
    });

    if (data.legendNote) {
      addText(svg, cursor, 38, data.legendNote, { 'font-size': 13, fill: STYLE.muted });
    }
  }

  function toggleGroupFocus(svg, selectedGroup) {
    var activeGroup = svg.getAttribute('data-active-group');
    var nextGroup = activeGroup === selectedGroup ? null : selectedGroup;
    var focusNodes = svg.querySelectorAll('.result-chart-bar, .result-chart-label, .result-chart-arrow');
    var legendItems = svg.querySelectorAll('.result-chart-legend-item');

    if (nextGroup === null) {
      svg.removeAttribute('data-active-group');
    } else {
      svg.setAttribute('data-active-group', nextGroup);
    }

    Array.prototype.forEach.call(focusNodes, function (node) {
      var isSelected = nextGroup === null || node.getAttribute('data-group') === nextGroup;
      var baseOpacity = Number(node.getAttribute('data-base-opacity') || 1);
      node.style.opacity = String(isSelected ? baseOpacity : baseOpacity * 0.14);
    });
    Array.prototype.forEach.call(legendItems, function (item) {
      var isSelected = nextGroup === null || item.getAttribute('data-group') === nextGroup;
      item.style.opacity = isSelected ? '1' : '0.32';
      item.setAttribute('aria-pressed', nextGroup !== null && isSelected ? 'true' : 'false');
    });
  }

  // Arrow from the unguarded label to the guarded label, mirroring the poster:
  // rising values point up into the guarded label, falling values point down
  // onto it, and unchanged values get a flat arrow above both labels.
  function arrowPath(from, to, fromValue, toValue) {
    if (toValue > fromValue) {
      return {
        start: { x: from.x + 2, y: from.top - 5 },
        end: { x: to.x - to.half - 4, y: to.top + 7 }
      };
    }
    if (toValue < fromValue) {
      return {
        start: { x: from.x + from.half + 3, y: (from.top + from.bottom) / 2 },
        end: { x: to.x - 3, y: to.top - 5 }
      };
    }
    var y = Math.min(from.top, to.top) - 10;
    return {
      start: { x: from.x - from.half + 2, y: y },
      end: { x: to.x + to.half - 2, y: y }
    };
  }

  function addArrow(svg, from, to, fromValue, toValue, color) {
    var path = arrowPath(from, to, fromValue, toValue);
    var dx = path.end.x - path.start.x;
    var dy = path.end.y - path.start.y;
    var length = Math.sqrt(dx * dx + dy * dy);
    var ux = dx / length;
    var uy = dy / length;
    var headLength = 10;
    var headHalf = 5;
    var baseX = path.end.x - ux * headLength;
    var baseY = path.end.y - uy * headLength;
    var lineEndX = baseX + ux * 2;
    var lineEndY = baseY + uy * 2;
    var lineLength = Math.sqrt(Math.pow(lineEndX - path.start.x, 2) + Math.pow(lineEndY - path.start.y, 2));

    var group = svgElement('g', { class: 'result-chart-arrow', 'aria-hidden': 'true' });
    group.appendChild(svgElement('line', {
      class: 'result-chart-arrow-line',
      x1: path.start.x,
      y1: path.start.y,
      x2: lineEndX,
      y2: lineEndY,
      stroke: color,
      'stroke-width': 2.4,
      'stroke-linecap': 'round',
      'stroke-dasharray': (lineLength + 1) + ' ' + (lineLength + 1),
      'data-length': lineLength + 1
    }));
    group.appendChild(svgElement('polygon', {
      class: 'result-chart-arrow-head',
      points: [
        path.end.x + ',' + path.end.y,
        (baseX - uy * headHalf) + ',' + (baseY + ux * headHalf),
        (baseX + uy * headHalf) + ',' + (baseY - ux * headHalf)
      ].join(' '),
      fill: color
    }));
    svg.appendChild(group);
    return group;
  }

  function barLayout(data) {
    var offsets = [];
    var cursor = 0;
    var groupGap = typeof data.groupGap === 'number' ? data.groupGap : data.gap;
    data.series.forEach(function (item, index) {
      if (index > 0) {
        cursor += groupOf(data, index) === groupOf(data, index - 1) ? data.gap : groupGap;
      }
      offsets.push(cursor);
      cursor += data.barWidth;
    });
    return { offsets: offsets, total: cursor };
  }

  function drawChart(host, data) {
    var canvas = host.querySelector('.result-chart-canvas');
    var svg = svgElement('svg', {
      class: 'result-chart-svg',
      viewBox: '0 0 1100 660',
      focusable: 'false'
    });
    var plot = PLOT;
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
    var layout = barLayout(data);
    var seriesCount = data.series.length;

    data.success.forEach(function (taskValues, taskIndex) {
      var firstX = groupCenters[taskIndex] - layout.total / 2;
      var labels = [];
      taskValues.forEach(function (value, seriesIndex) {
        var item = data.series[seriesIndex];
        var group = groupOf(data, seriesIndex);
        var x = firstX + layout.offsets[seriesIndex];
        var height = (value / 110) * plotHeight;
        var y = plot.bottom - height;
        var order = taskIndex * seriesCount + seriesIndex;
        var bar = svgElement('rect', {
          class: 'result-chart-bar', x: x, y: y, width: data.barWidth, height: height,
          rx: 2, fill: item.color, stroke: item.edge, 'stroke-width': 1.4,
          opacity: item.opacity || 1, 'data-order': order, 'data-group': group,
          'data-base-opacity': item.opacity || 1,
          'data-y': y, 'data-height': height
        });
        svg.appendChild(bar);
        var successLabelY = Math.min(y - 9, plot.bottom - 12);
        var label = addLabel(svg, x + data.barWidth / 2, successLabelY, value + '%', textColor(item));
        label.node.setAttribute('data-order', order);
        label.node.setAttribute('data-group', group);
        label.node.setAttribute('data-base-opacity', 1);
        labels.push(label);
      });

      (data.arrows || []).forEach(function (pair) {
        var fromIndex = pair[0];
        var toIndex = pair[1];
        var arrow = addArrow(svg, labels[fromIndex], labels[toIndex],
          taskValues[fromIndex], taskValues[toIndex], data.series[toIndex].edge);
        arrow.setAttribute('data-group', groupOf(data, toIndex));
        arrow.setAttribute('data-order', taskIndex * seriesCount + toIndex);
        arrow.setAttribute('data-base-opacity', 1);
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
    var arrows = Array.prototype.slice.call(svg.querySelectorAll('.result-chart-arrow'));
    if (reducedMotion || !Element.prototype.animate) {
      return;
    }

    bars.forEach(function (bar) {
      var finalY = Number(bar.getAttribute('data-y'));
      var finalHeight = Number(bar.getAttribute('data-height'));
      var delay = Number(bar.getAttribute('data-order')) * 65;
      bar.getAnimations().forEach(function (animation) { animation.cancel(); });
      bar.animate([
        { y: PLOT.bottom, height: 0 },
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
    // Arrows draw in once the guarded bar's label has landed.
    arrows.forEach(function (arrow) {
      var delay = 760 + Number(arrow.getAttribute('data-order')) * 65;
      var line = arrow.querySelector('.result-chart-arrow-line');
      var head = arrow.querySelector('.result-chart-arrow-head');
      var length = Number(line.getAttribute('data-length'));
      line.getAnimations().forEach(function (animation) { animation.cancel(); });
      head.getAnimations().forEach(function (animation) { animation.cancel(); });
      line.animate([
        { strokeDashoffset: length },
        { strokeDashoffset: 0 }
      ], { duration: 420, delay: delay, easing: 'ease-out', fill: 'backwards' });
      head.animate([
        { opacity: 0 },
        { opacity: 1 }
      ], { duration: 160, delay: delay + 340, easing: 'ease-out', fill: 'backwards' });
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
      var svg = drawChart(host, data);
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
