// Force-graph based knowledge graph. Canvas-rendered for perf at scale.
// Inspired by obsidian-graph-explorer-base-view: high node spacing, zoom-aware
// labels, focus-on-click neighborhood highlighting, search highlight, degree filter.

(async function () {
  const el = document.getElementById('graph');
  if (!el || typeof ForceGraph === 'undefined') return;

  const res = await fetch('/graph.json');
  const { nodes, edges } = await res.json();

  const links = edges.map((e) => ({ source: e.s, target: e.t }));

  // Adjacency for focus mode.
  const adjacency = new Map();
  for (const e of edges) {
    if (!adjacency.has(e.s)) adjacency.set(e.s, new Set());
    if (!adjacency.has(e.t)) adjacency.set(e.t, new Set());
    adjacency.get(e.s).add(e.t);
    adjacency.get(e.t).add(e.s);
  }

  // Theme colors from CSS vars — re-read on theme change.
  const css = (v, fallback) =>
    getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fallback;
  let COLORS = readColors();
  function readColors() {
    return {
      article: rgba(css('--theme-ink-soft', 'rgba(255,255,255,0.6)'), 0.85),
      source: css('--theme-accent-text', '#ff1493'),
      hub: css('--theme-accent', '#e5007d'),
      link: rgba(css('--theme-ink-soft', 'rgba(255,255,255,0.4)'), 0.18),
      linkActive: css('--theme-accent', '#e5007d'),
      label: css('--theme-ink', '#fff'),
      labelHalo: css('--theme-bg', '#37404c'),
      dim: rgba(css('--theme-ink-soft', 'rgba(255,255,255,0.6)'), 0.12),
    };
  }
  function rgba(value, alpha) {
    // Replace alpha on an rgba() string, or wrap a hex/named color.
    if (!value) return `rgba(255,255,255,${alpha})`;
    const m = value.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(',').map((p) => p.trim());
      const [r, g, b] = parts;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return value;
  }

  // Node radius from degree.
  const nodeRadius = (d) => {
    const deg = d.d || 0;
    if (deg >= 20) return 10;
    if (deg >= 10) return 7;
    if (deg >= 5) return 5;
    return 3.5;
  };

  // Node color: hub > source > article.
  const baseColor = (n) => {
    if ((n.d || 0) >= 10) return COLORS.hub;
    if (n.k === 'source') return COLORS.source;
    return COLORS.article;
  };

  // State.
  let focusedId = null;
  let searchHits = new Set();
  let minDegree = 0;
  let showSources = true;
  let alwaysLabels = false;
  let hoverId = null;

  const visibleNode = (n) => {
    if ((n.d || 0) < minDegree) return false;
    if (!showSources && n.k === 'source') return false;
    return true;
  };

  const inFocus = (id) => {
    if (!focusedId) return true;
    if (id === focusedId) return true;
    return adjacency.get(focusedId)?.has(id) ?? false;
  };

  const isHit = (id) => searchHits.size === 0 || searchHits.has(id);

  // Build graph.
  const Graph = ForceGraph()(el);
  Graph
    .graphData({ nodes, links })
    .nodeId('id')
    .linkSource('source')
    .linkTarget('target')
    .backgroundColor('rgba(0,0,0,0)')
    .minZoom(0.1)
    .maxZoom(8)
    .warmupTicks(80)
    .cooldownTicks(120)
    .d3AlphaDecay(0.018)
    .d3VelocityDecay(0.35)
    .enableNodeDrag(true)
    .autoPauseRedraw(false)
    .nodeLabel((n) => n.t)
    .nodeRelSize(4)
    .nodeVal((n) => nodeRadius(n) ** 2 / 4)
    .linkColor(() => COLORS.link)
    .linkWidth((l) => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      if (focusedId && (sId === focusedId || tId === focusedId)) return 1.4;
      return 0.5;
    })
    .nodeVisibility((n) => visibleNode(n))
    .linkVisibility((l) => {
      const s = typeof l.source === 'object' ? l.source : nodes.find((n) => n.id === l.source);
      const t = typeof l.target === 'object' ? l.target : nodes.find((n) => n.id === l.target);
      return s && t && visibleNode(s) && visibleNode(t);
    })
    .nodeCanvasObjectMode(() => 'replace')
    .nodeCanvasObject((n, ctx, scale) => {
      const r = nodeRadius(n);
      const dimmed = !inFocus(n.id) || !isHit(n.id);

      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = dimmed ? COLORS.dim : baseColor(n);
      ctx.fill();

      // Hub ring.
      if ((n.d || 0) >= 10 && !dimmed) {
        ctx.lineWidth = 1.2 / scale;
        ctx.strokeStyle = rgba(COLORS.hub, 0.45);
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 3, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Label visibility rules:
      //  - hover always shows label
      //  - alwaysLabels global toggle
      //  - high zoom (>= 1.4) shows labels for visible nodes with deg ≥ 3
      //  - focus mode shows labels for the focus + neighbors
      //  - hubs (deg ≥ 15) always show when zoom ≥ 0.8
      const isHover = n.id === hoverId;
      const isFocus = n.id === focusedId;
      const isNeighbor = focusedId && adjacency.get(focusedId)?.has(n.id);
      const showLabel =
        !dimmed &&
        (isHover ||
          alwaysLabels ||
          isFocus ||
          isNeighbor ||
          (scale >= 1.4 && (n.d || 0) >= 3) ||
          (scale >= 0.8 && (n.d || 0) >= 15));

      if (showLabel) {
        const fontSize = Math.max(10, 12 / scale);
        ctx.font = `${isHover || isFocus ? 700 : 500} ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const label = n.t;
        const pad = 4 / scale;
        const width = ctx.measureText(label).width + pad * 2;
        const labelY = n.y + r + 4 / scale;

        // Halo bg.
        ctx.fillStyle = rgba(COLORS.labelHalo, 0.78);
        ctx.fillRect(n.x - width / 2, labelY - pad / 2, width, fontSize + pad);
        ctx.fillStyle = COLORS.label;
        ctx.fillText(label, n.x, labelY);
      }
    })
    .nodePointerAreaPaint((n, color, ctx) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, nodeRadius(n) + 2, 0, 2 * Math.PI);
      ctx.fill();
    })
    .onNodeHover((n) => {
      hoverId = n?.id ?? null;
      el.style.cursor = n ? 'pointer' : '';
    })
    .onNodeClick((n) => {
      // Double-click navigates; single-click focuses.
      if (focusedId === n.id) {
        window.location.href = `/${n.id}.html`;
      } else {
        focusedId = n.id;
      }
    })
    .onBackgroundClick(() => {
      focusedId = null;
    });

  // Forces — much higher repulsion + link distance than defaults for breathing room.
  const charge = Graph.d3Force('charge');
  charge?.strength(-260).distanceMax(900);
  const link = Graph.d3Force('link');
  link?.distance((l) => {
    const sd = typeof l.source === 'object' ? l.source.d || 1 : 1;
    const td = typeof l.target === 'object' ? l.target.d || 1 : 1;
    return 80 + Math.min(80, sd + td);
  }).strength(0.18);
  Graph.d3Force('collide', d3CollisionForce());

  // Custom collision using force-graph's exposed d3.
  function d3CollisionForce() {
    // force-graph re-exports d3.forceCollide via internal; we synthesize one.
    // If unavailable, return a no-op.
    if (typeof window.d3 !== 'undefined' && window.d3.forceCollide) {
      return window.d3.forceCollide().radius((n) => nodeRadius(n) + 6).strength(0.85);
    }
    return null;
  }

  // Fit on first cool-down.
  Graph.onEngineStop(() => Graph.zoomToFit(400, 50));

  // Controls.
  const searchEl = document.getElementById('graph-search');
  searchEl?.addEventListener('input', () => {
    const q = searchEl.value.trim().toLowerCase();
    if (!q) {
      searchHits = new Set();
    } else {
      searchHits = new Set(
        nodes.filter((n) => n.t.toLowerCase().includes(q)).map((n) => n.id),
      );
    }
    Graph.refresh();
  });

  const minDegEl = document.getElementById('graph-min-degree');
  const minDegOut = document.getElementById('graph-min-degree-value');
  minDegEl?.addEventListener('input', () => {
    minDegree = Number(minDegEl.value);
    minDegOut.textContent = String(minDegree);
    Graph.refresh();
  });

  document.getElementById('graph-show-sources')?.addEventListener('change', (e) => {
    showSources = e.target.checked;
    Graph.refresh();
  });

  document.getElementById('graph-show-labels')?.addEventListener('change', (e) => {
    alwaysLabels = e.target.checked;
    Graph.refresh();
  });

  document.getElementById('graph-reset')?.addEventListener('click', () => {
    focusedId = null;
    searchEl.value = '';
    searchHits = new Set();
    minDegEl.value = '0';
    minDegree = 0;
    minDegOut.textContent = '0';
    Graph.zoomToFit(500, 50);
  });

  // Resize.
  const resize = () => Graph.width(el.clientWidth).height(el.clientHeight);
  resize();
  new ResizeObserver(resize).observe(el);

  // Refresh on theme toggle.
  new MutationObserver(() => {
    COLORS = readColors();
    Graph.refresh();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
})();
