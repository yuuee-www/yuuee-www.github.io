(function () {
  const container = document.querySelector('.article-content') || document.querySelector('.article-container') || document.querySelector('article');
  if (!container) return;

  // remove any previous toolbar from SPA navigation
  const oldBar = document.getElementById('yuuee-hl-toolbar');
  if (oldBar) oldBar.remove();
  document.body.classList.remove('yuuee-hl-mode');

  const STORAGE_KEY = 'yuuee-highlights:' + location.pathname;
  const HL_CLASS = 'yuuee-hl';
  let penOn = false;

  function getPlainOffsets(range) {
    const pre = document.createRange();
    pre.selectNodeContents(container);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    return { start, end: start + range.toString().length };
  }

  function getTextNodes() {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (p && p.closest('#yuuee-hl-toolbar')) return NodeFilter.FILTER_REJECT;
        if (p && (p.tagName === 'SCRIPT' || p.tagName === 'STYLE')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    return nodes;
  }

  function rangeFromOffsets(start, end) {
    const nodes = getTextNodes();
    let pos = 0;
    const range = document.createRange();
    let sSet = false, eSet = false;
    for (const n of nodes) {
      const len = n.nodeValue.length;
      if (!sSet && start <= pos + len) {
        range.setStart(n, start - pos);
        sSet = true;
      }
      if (!eSet && end <= pos + len) {
        range.setEnd(n, end - pos);
        eSet = true;
        break;
      }
      pos += len;
    }
    return sSet && eSet ? range : null;
  }

  function wrapRange(range) {
    const nodes = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!range.intersectsNode(n)) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (p && p.closest('#yuuee-hl-toolbar')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) nodes.push(node);

    for (const n of nodes) {
      const nr = document.createRange();
      nr.selectNodeContents(n);
      if (n === range.startContainer) nr.setStart(n, range.startOffset);
      if (n === range.endContainer) nr.setEnd(n, range.endOffset);
      if (nr.collapsed) continue;
      const span = document.createElement('span');
      span.className = HL_CLASS;
      try { nr.surroundContents(span); } catch (e) {}
    }
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }
  function save(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

  function applyAll() {
    document.querySelectorAll('.' + HL_CLASS).forEach(s => {
      const p = s.parentNode;
      while (s.firstChild) p.insertBefore(s.firstChild, s);
      p.removeChild(s);
      p.normalize();
    });
    const list = load();
    list.sort((a, b) => b.start - a.start);
    for (const { start, end } of list) {
      const r = rangeFromOffsets(start, end);
      if (r) wrapRange(r);
    }
  }

  function addHighlight() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) return;
    const { start, end } = getPlainOffsets(range);
    if (start === end) return;
    const list = load();
    list.push({ start, end });
    save(list);
    sel.removeAllRanges();
    applyAll();
  }

  function clearAll() {
    if (!confirm('Clear all highlights on this page?')) return;
    save([]);
    applyAll();
  }

  // Toolbar
  const bar = document.createElement('div');
  bar.id = 'yuuee-hl-toolbar';
  bar.innerHTML = `
    <button id="yuuee-hl-pen" title="Toggle highlighter">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
        <path d="M2 2l7.586 7.586"></path>
        <circle cx="11" cy="11" r="2"></circle>
      </svg>
    </button>
    <button id="yuuee-hl-clear" title="Clear highlights">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6"></path>
        <path d="M10 11v6M14 11v6"></path>
      </svg>
    </button>
  `;
  document.body.appendChild(bar);

  const penBtn = bar.querySelector('#yuuee-hl-pen');
  penBtn.addEventListener('click', () => {
    penOn = !penOn;
    penBtn.classList.toggle('active', penOn);
    document.body.classList.toggle('yuuee-hl-mode', penOn);
  });
  bar.querySelector('#yuuee-hl-clear').addEventListener('click', clearAll);

  container.addEventListener('mouseup', () => { if (penOn) addHighlight(); });
  container.addEventListener('touchend', () => { if (penOn) addHighlight(); });

  applyAll();
})();
