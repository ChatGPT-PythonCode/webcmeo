async function loadData() {
  const res = await fetch('comics.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Could not load comics.json');
  return await res.json();
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[ch]);
}

function byNewestFirst(a, b) {
  const da = new Date(a.date).getTime();
  const db = new Date(b.date).getTime();
  if (db !== da) return db - da;
  return (b.id || '').localeCompare(a.id || '');
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setAttr(id, attr, value) {
  const el = document.getElementById(id);
  if (el) el.setAttribute(attr, value);
}

function setCurrentTab(tab) {
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.setAttribute('aria-current', btn.dataset.tab === tab ? 'page' : 'false');
  });
  document.querySelectorAll('[data-panel]').forEach(p => {
    p.style.display = p.dataset.panel === tab ? 'block' : 'none';
  });
}

function openReader() {
  const d = document.getElementById('reader');
  d.setAttribute('open', '');
  document.body.style.overflow = 'hidden';
}
function closeReader() {
  const d = document.getElementById('reader');
  d.removeAttribute('open');
  document.body.style.overflow = '';
}

function setBtn(id, enabled, onClick) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!enabled) {
    el.setAttribute('aria-disabled', 'true');
    el.onclick = null;
  } else {
    el.removeAttribute('aria-disabled');
    el.onclick = onClick;
  }
}

function setHash(idOrKey) {
  // hash format: #c=001
  const u = new URL(window.location.href);
  u.hash = `c=${encodeURIComponent(idOrKey)}`;
  history.replaceState(null, '', u.toString());
}

function getHashComic() {
  const h = (window.location.hash || '').replace(/^#/, '');
  const sp = new URLSearchParams(h);
  return sp.get('c');
}

let STATE = { data: null, comics: [], currentIndex: 0 };

function renderGrid(comics) {
  const grid = document.getElementById('archiveGrid');
  grid.innerHTML = comics.map((c, i) => `
    <button class="tile" type="button" data-open="${escapeHtml(c.id)}" aria-label="Open ${escapeHtml(c.title)}">
      <img class="thumb" src="${escapeHtml(c.image)}" alt="${escapeHtml(c.alt || c.title)}" loading="lazy">
      <h3>${escapeHtml(c.title)}</h3>
      <div class="muted small">${escapeHtml(c.date)} • #${escapeHtml(c.id || '')}</div>
    </button>
  `).join('');

  grid.querySelectorAll('button[data-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-open');
      openComicById(id);
    });
  });
}

function renderLatest(comic) {
  setText('latestTitle', comic.title);
  setText('latestDate', comic.date);
  setAttr('latestImg', 'src', comic.image);
  setAttr('latestImg', 'alt', comic.alt || comic.title);
  document.getElementById('latestOpen').onclick = () => openComicById(comic.id);
}

function openComicById(id) {
  const idx = STATE.comics.findIndex(c => c.id === id);
  if (idx === -1) return;
  STATE.currentIndex = idx;
  renderReader();
  setHash(id);
  openReader();
}

function renderReader() {
  const comic = STATE.comics[STATE.currentIndex];
  setText('readerTitle', comic.title);
  setText('readerMeta', `${comic.date} • #${comic.id}`);
  setAttr('readerImg', 'src', comic.image);
  setAttr('readerImg', 'alt', comic.alt || comic.title);

  // Navigation (newest first)
  const prev = STATE.comics[STATE.currentIndex + 1]; // older
  const next = STATE.comics[STATE.currentIndex - 1]; // newer

  setBtn('btnPrev', !!prev, () => { STATE.currentIndex += 1; renderReader(); setHash(prev.id); });
  setBtn('btnNext', !!next, () => { STATE.currentIndex -= 1; renderReader(); setHash(next.id); });

  const latest = STATE.comics[0];
  setBtn('btnLatest', !!latest, () => { STATE.currentIndex = 0; renderReader(); setHash(latest.id); });

  // Simple preloading hint
  [prev, next].filter(Boolean).forEach(c => { const img = new Image(); img.src = c.image; });
}

async function init() {
  try {
    const data = await loadData();
    STATE.data = data;
    STATE.comics = [...(data.comics || [])].sort(byNewestFirst);

    setText('siteTitle', data.title);
    setText('siteTagline', `by ${data.author}`);

    if (!STATE.comics.length) {
      document.getElementById('emptyNote').style.display = 'block';
      return;
    }

    renderLatest(STATE.comics[0]);
    renderGrid(STATE.comics);

    // Tabs
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => setCurrentTab(btn.dataset.tab));
    });
    setCurrentTab('latest');

    // Reader close
    document.getElementById('btnClose').addEventListener('click', closeReader);
    document.getElementById('reader').addEventListener('click', (e) => {
      if (e.target.id === 'reader') closeReader();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeReader();
      if (!document.getElementById('reader').hasAttribute('open')) return;
      if (e.key === 'ArrowLeft') document.getElementById('btnPrev').click();
      if (e.key === 'ArrowRight') document.getElementById('btnNext').click();
    });

    // Open from hash if present
    const cid = getHashComic();
    if (cid) openComicById(cid);

  } catch (e) {
    console.error(e);
    const el = document.getElementById('pageError');
    if (el) el.textContent = 'Could not load site data. Check comics.json and image paths.';
  }
}

init();
