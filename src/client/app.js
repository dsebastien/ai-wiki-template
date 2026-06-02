// Theme mode toggle + search (Lunr-backed).

(function () {
  const root = document.documentElement;

  // ---- mode ----
  const btn = document.getElementById('mode-toggle');
  btn?.addEventListener('click', () => {
    const next = root.dataset.mode === 'dark' ? 'light' : 'dark';
    root.dataset.mode = next;
    localStorage.setItem('mode', next);
  });

  // ---- search ----
  const modal = document.getElementById('search-modal');
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  const openBtn = document.getElementById('search-open');

  let idx = null;
  let lookup = null;
  let active = 0;

  const loadIndex = async () => {
    if (idx) return;
    const r = await fetch('/search-index.json');
    const data = await r.json();
    idx = lunr.Index.load(data.index);
    lookup = data.lookup;
  };

  const openModal = async () => {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    input.value = '';
    results.innerHTML = '<li class="empty">Start typing to search.</li>';
    setTimeout(() => input.focus(), 30);
    try { await loadIndex(); } catch {
      results.innerHTML = '<li class="empty">Search unavailable.</li>';
    }
  };
  const closeModal = () => {
    modal.hidden = true;
    document.body.style.overflow = '';
  };

  openBtn?.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
  modal?.addEventListener('click', (e) => {
    if (e.target.dataset.close !== undefined) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      openModal();
      return;
    }
    if (modal.hidden) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); return; }
    if (e.key === 'Enter') {
      const a = results.querySelector('li.active a');
      if (a) window.location.href = a.href;
    }
  });

  const moveActive = (delta) => {
    const items = [...results.querySelectorAll('li')];
    if (!items.length) return;
    items[active]?.classList.remove('active');
    active = (active + delta + items.length) % items.length;
    items[active].classList.add('active');
    items[active].scrollIntoView({ block: 'nearest' });
  };

  let timer = null;
  input?.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(runSearch, 80);
  });

  const runSearch = () => {
    const q = input.value.trim();
    if (!q) {
      results.innerHTML = '<li class="empty">Start typing to search.</li>';
      return;
    }
    if (!idx) return;
    let hits = [];
    try {
      const tokens = q.split(/\s+/).filter(Boolean);
      const expanded = tokens.map((t) => `${t}^2 ${t}* ${t}~1`).join(' ');
      hits = idx.search(expanded);
    } catch { hits = []; }
    if (!hits.length) {
      results.innerHTML = '<li class="empty">No results.</li>';
      return;
    }
    active = 0;
    results.innerHTML = hits.slice(0, 20).map((h, i) => {
      const m = lookup[h.ref];
      return `<li class="${i === 0 ? 'active' : ''}">
        <a href="/${h.ref}.html">
          <div class="res__title">${escapeHtml(m.title)}</div>
          <div class="res__kind">${m.kind}</div>
        </a>
      </li>`;
    }).join('');
  };

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
})();
