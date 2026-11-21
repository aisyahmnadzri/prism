// PRISM — Global search in the header (Ctrl+K / ⌘K or "/"): accounts, messages, events and pages the person can access.
// Loaded before app.js; app.js helpers are used at call time only.

const gsUI = { open: false, active: 0 };
const GS_LIMIT = 5;

function searchHtml() {
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  return `<div class="gsearch">
    <button type="button" class="gsearch-btn" data-gs="open" aria-label="Search PRISM" aria-haspopup="dialog">
      ${icon('search')}<span class="gs-placeholder">Search accounts, messages, events…</span><kbd>${mac ? '⌘' : 'Ctrl'} K</kbd></button>
    <div class="gsearch-pop" id="gsPop" role="dialog" aria-label="Search" hidden>
      <div class="gs-input">${icon('search')}<input id="gsInput" type="search" placeholder="Search accounts, messages, events…" autocomplete="off" aria-controls="gsResults">
        <button type="button" class="gs-close" data-gs="close" aria-label="Close search">Esc</button></div>
      <div class="gs-results" id="gsResults" role="listbox"></div>
    </div></div>`;
}

const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function mark(text, q) {
  const safe = esc(text);
  if (!q) return safe;
  return safe.replace(new RegExp(`(${reEsc(esc(q))})`, 'ig'), '<mark>$1</mark>');
}
// A short window of text around the first match
function snippet(text, q, len = 90) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0 || text.length <= len) return text.slice(0, len) + (text.length > len ? '…' : '');
  const start = Math.max(0, i - 30);
  return (start ? '…' : '') + text.slice(start, start + len) + (start + len < text.length ? '…' : '');
}

function searchAll(q) {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const has = (...fields) => fields.some(f => String(f || '').toLowerCase().includes(t));
  const groups = [];
  // Pages
  const pageHits = navPages.filter(k => has(PAGES[k].label)).map(k => ({ href: PAGES[k].file, ic: NAV_ICON[k], title: mark(PAGES[k].label, q), sub: 'Go to page' }));
  if (pageHits.length) groups.push(['Pages', pageHits]);
  // Accounts (including archived ones the person can see)
  const accs = accounts.filter(a => user.role === 'HM' || canView(a))
    .filter(a => has(a.name, a.useCase, a.id, a.description, a.contact, nameOf(a.am), ...a.devs.map(nameOf)))
    .map(a => ({ href: accountLink(a), ic: 'building', title: mark(a.name, q),
      sub: `${mark(a.useCase, q)} · ${a.outcome ? a.outcome : `Stage ${a.stage}`}${a.archived ? ' · Archived' : ''}`,
      badge: a.outcome ? '' : `<span class="badge ${statusClass(a.status)}">${a.status}</span>` }));
  if (accs.length) groups.push(['Accounts', accs]);
  // Messages in conversations the person belongs to
  const msgHits = [];
  myThreads().forEach(th => threadMsgs(th.key).forEach(m => {
    if (has(m.text)) msgHits.push({ at: m.at, href: `messages.html?t=${encodeURIComponent(th.key)}`, ic: 'chat',
      title: `${esc(nameOf(m.by))} <span class="gs-in">in ${esc(th.title)}</span>`, sub: mark(snippet(m.text, q), q), meta: msgTime(m.at) });
  }));
  msgHits.sort((x, y) => y.at.localeCompare(x.at));
  if (msgHits.length) groups.push(['Messages', msgHits]);
  // Events on accounts the person can see
  const evHits = accounts.filter(a => !a.archived && (user.role === 'HM' ? followsAccount(a) : canView(a)))
    .flatMap(a => (a.events || []).map(e => ({ e, a })))
    .filter(({ e, a }) => has(e.title, e.location, e.type, e.notes, a.name))
    .sort((x, y) => y.e.date.localeCompare(x.e.date))
    .map(({ e, a }) => ({ href: 'schedule.html', ic: 'calendar', title: mark(e.title, q),
      sub: `${esc(e.type)} · ${mark(a.name, q)}${e.location ? ` · ${mark(e.location, q)}` : ''}`, meta: fmtDay(parseYmd(e.date)) }));
  if (evHits.length) groups.push(['Events', evHits]);
  const tkHits = typeof ticketSearch === 'function' ? ticketSearch(q) : [];
  if (tkHits.length) groups.push(['Tickets', tkHits]);
  return groups;
}

function renderResults() {
  const input = document.getElementById('gsInput'), box = document.getElementById('gsResults');
  if (!input || !box) return;
  const q = input.value;
  if (!q.trim()) {
    box.innerHTML = `<div class="gs-empty">${icon('search')}<b>Search across PRISM</b><span>Accounts, use cases, people, messages and events you can access.</span>
      <div class="gs-tips"><kbd>↑</kbd><kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close</div></div>`;
    return;
  }
  const groups = searchAll(q);
  let i = 0;
  const html = groups.map(([label, items]) => `<div class="gs-group"><div class="gs-head">${label}<span>${items.length}</span></div>
      ${items.slice(0, GS_LIMIT).map(r => `<a class="gs-item ${i === gsUI.active ? 'on' : ''}" role="option" data-i="${i++}" href="${r.href}">
        <span class="gs-ic">${icon(r.ic)}</span><span class="gs-text"><b>${r.title}</b><small>${r.sub}</small></span>
        ${r.badge || ''}${r.meta ? `<span class="gs-meta">${r.meta}</span>` : ''}</a>`).join('')}
      ${items.length > GS_LIMIT ? `<div class="gs-more">+ ${items.length - GS_LIMIT} more ${label.toLowerCase()}</div>` : ''}</div>`).join('');
  box.innerHTML = html || `<div class="gs-empty">${icon('search')}<b>No results for “${esc(q)}”</b><span>Try an account name, a person, or a word from a message.</span></div>`;
}

function setSearch(open) {
  const pop = document.getElementById('gsPop');
  if (!pop) return;
  gsUI.open = open;
  pop.hidden = !open;
  document.documentElement.classList.toggle('gs-open', open);
  if (open) {
    const input = document.getElementById('gsInput');
    gsUI.active = 0;
    renderResults();
    setTimeout(() => input.focus(), 0);
  }
}

function moveActive(step) {
  const items = [...document.querySelectorAll('#gsResults .gs-item')];
  if (!items.length) return;
  gsUI.active = (gsUI.active + step + items.length) % items.length;
  items.forEach((el, i) => el.classList.toggle('on', i === gsUI.active));
  items[gsUI.active].scrollIntoView({ block: 'nearest' });
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-gs]');
  if (b) { setSearch(b.dataset.gs === 'open'); return; }
  if (gsUI.open && !e.target.closest('.gsearch-pop')) setSearch(false);
});
document.addEventListener('input', e => {
  if (e.target.id === 'gsInput') { gsUI.active = 0; renderResults(); }
});
document.addEventListener('keydown', e => {
  const typing = isEl(e.target, 'input, textarea, select, [contenteditable]');
  if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setSearch(!gsUI.open); return; }
  if (e.key === '/' && !typing && !gsUI.open && document.getElementById('gsPop')) { e.preventDefault(); setSearch(true); return; }
  if (!gsUI.open) return;
  if (e.key === 'Escape') { setSearch(false); document.querySelector('.gsearch-btn')?.focus(); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
  else if (e.key === 'Enter' && e.target.id === 'gsInput') {
    const el = document.querySelectorAll('#gsResults .gs-item')[gsUI.active];
    if (el) { e.preventDefault(); location.href = el.getAttribute('href'); }
  }
});
