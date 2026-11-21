// PRISM — Messaging: account threads, direct messages and small groups.
// Prototype: messages live in this browser's storage. Each tab keeps its own sign-in, so two tabs signed in as
// different users can chat live (the 'storage' event syncs them). Real delivery between people needs the backend.
// Loaded before app.js; app.js helpers (esc, icon, render, user, accounts, …) are used at call time only.

const MSG_KEY = 'prism_messages_v1';
let msgs = null;
const msgUI = { active: null, q: '', showConv: false, tab: 'acc', init: false }; // tab: 'acc' (account threads) | 'direct' (DMs + groups)
const tabOf = key => key.startsWith('acc:') ? 'acc' : 'direct';

// ---------- Store ----------
function minsAgo(n) { return new Date(Date.now() - n * 60000).toISOString(); }
function seedMessages() {
  let n = 0;
  const m = (by, mins, text) => ({ id: 'M' + (++n), by, at: minsAgo(mins), text });
  return {
    defaultRead: minsAgo(360), // demo: everything older than 6 hours counts as read
    reads: {},
    groups: [{ id: 'G1', name: 'Health & Immigration squad', members: ['u2', 'u4', 'u5'], by: 'u2', at: minsAgo(4000) }],
    threads: {
      'acc:ACC-001': [
        m('u2', 2900, 'Agency IT confirmed the second batch of notes is ready. @Kavitha Raj can you pick it up on Monday?'),
        m('u4', 2860, "Yes, I'll collect it during the site visit."),
        m('u1', 1500, "Good. Let's aim for accuracy above 90% before the review."),
        m('u4', 180, 'Accuracy is now 87% on the test set. Trying a larger context window next.'),
      ],
      'acc:ACC-003': [
        m('u2', 1440, 'Agency wants extra testing on passport scans before evaluation.'),
        m('u5', 1200, 'I can run the batch tonight. Need the sample scans from their team.'),
        m('u2', 120, "@Hafiz Rahman the evaluation panel still isn't confirmed. Can you escalate?"),
      ],
      'acc:ACC-002': [
        m('u3', 1450, 'Proposal and success criteria uploaded. Requesting Higher Management sign-off.'),
        m('u6', 300, 'Reviewed. Can we tighten the success criteria on false positives?'),
        m('u3', 240, 'Will update: target false-positive rate under 5%.'),
      ],
      'acc:ACC-006': [
        m('u3', 1460, 'Decision memo is in. The agency is keen to proceed to procurement.'),
        m('u6', 30, "Thanks. I'll decide after Friday's meeting. @Daniel Lim please share the cost estimate."),
      ],
      'acc:ACC-008': [m('u4', 60, 'Internal review notes uploaded. Ready for the client demo next week.')],
      'dm:u1:u2': [
        m('u1', 1450, 'Can you send me the MOH update before the leadership sync?'),
        m('u2', 1380, "Sure, I'll post it in PRISM by end of day."),
        m('u1', 40, "Thanks! Let's also plan the Land & Mines discovery together."),
      ],
      'dm:u1:u6': [
        m('u6', 2950, 'Hafiz, can I get a summary of POCs nearing a decision?'),
        m('u1', 2900, 'Inland Revenue Board is at Go / No-Go, and Public Works is waiting for your proposal approval.'),
      ],
      'dm:u2:u4': [m('u4', 170, 'Do we have the latest data sharing agreement for Immigration?')],
      'grp:G1': [
        m('u2', 360 + 30, 'Stand-up moved to 9:30 tomorrow.'),
        m('u5', 300, 'Noted 👍'),
        m('u4', 55, "I'll demo the summariser improvements."),
      ],
    },
  };
}
function loadMsgs() {
  try { const raw = localStorage.getItem(MSG_KEY); if (raw) return JSON.parse(raw); } catch (e) { /* ignore */ }
  const s = seedMessages(); saveMsgs(s); return s;
}
function saveMsgs(s) { try { localStorage.setItem(MSG_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } }
function M() { return msgs || (msgs = loadMsgs()); }
function reloadMsgs() { msgs = null; }

// ---------- Threads & access ----------
const dmKey = (a, b) => 'dm:' + [a, b].sort().join(':');
// Higher Management joins account threads only while the account sits at a stage they approve (3 and 10).
const canAccessAccThread = a => user.role === 'HM' ? !a.outcome && stageOf(a).approver === 'HM' : canView(a);
function threadInfo(key) {
  const [kind, ...rest] = key.split(':');
  if (kind === 'acc') {
    const a = find(rest[0]);
    if (!a || !canAccessAccThread(a)) return null;
    const people = new Set([...USERS.filter(u => u.role === 'TL').map(u => u.id), a.am, ...a.devs]);
    if (!a.outcome && stageOf(a).approver === 'HM') USERS.filter(u => u.role === 'HM').forEach(u => people.add(u.id));
    return { key, kind, title: a.name, sub: `Stage ${a.stage} · ${stageOf(a).name}`, a, people: [...people] };
  }
  if (kind === 'dm') {
    if (!rest.includes(user.id)) return null;
    const other = userById(rest.find(id => id !== user.id));
    if (!other) return null;
    return { key, kind, title: other.name, sub: profileOf(other.id).title || ROLES[other.role].label, u: other, people: rest };
  }
  if (kind === 'grp') {
    const g = M().groups.find(x => x.id === rest[0]);
    if (!g || !g.members.includes(user.id)) return null;
    return { key, kind, title: g.name, sub: g.members.map(id => nameOf(id).split(' ')[0]).join(', '), g, people: g.members };
  }
  return null;
}
function myThreads() {
  const keys = [
    ...accounts.filter(a => !a.archived).map(a => 'acc:' + a.id),
    ...USERS.filter(u => u.id !== user.id).map(u => dmKey(user.id, u.id)),
    ...M().groups.map(g => 'grp:' + g.id),
  ];
  return keys.map(threadInfo).filter(Boolean);
}
const threadMsgs = key => M().threads[key] || [];
const lastMsg = key => threadMsgs(key).slice(-1)[0];
const lastRead = key => ((M().reads[user.id] || {})[key]) || M().defaultRead;
const unreadIn = key => threadMsgs(key).filter(m => m.by !== user.id && m.at > lastRead(key));
const mentionsMe = m => m.text.includes('@' + user.name);
function totalUnread() {
  try { return myThreads().reduce((t, th) => t + unreadIn(th.key).length, 0); } catch (e) { return 0; }
}
function markRead(key) {
  const s = M();
  const last = lastMsg(key);
  if (!last || (s.reads[user.id] || {})[key] >= last.at) return;
  s.reads[user.id] = { ...(s.reads[user.id] || {}), [key]: new Date().toISOString() };
  saveMsgs(s);
}

// ---------- Formatting ----------
function msgTime(iso) {
  const d = new Date(iso), today = startOfDay(new Date()), diff = dayDiff(d, today);
  if (diff === 0) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function dayLabel(iso) {
  const d = new Date(iso), diff = dayDiff(d, startOfDay(new Date()));
  return diff === 0 ? 'Today' : diff === -1 ? 'Yesterday' : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}
function formatText(text) {
  let html = esc(text);
  USERS.forEach(u => {
    const tag = '@' + esc(u.name);
    html = html.split(tag).join(`<span class="mention ${u.id === user.id ? 'me' : ''}">${tag}</span>`);
  });
  return html.replace(/\n/g, '<br>');
}
function threadAvatar(th, size = '') {
  if (th.kind === 'acc') return `<span class="t-av acc ${size}">${icon('building')}</span>`;
  if (th.kind === 'grp') return `<span class="t-av grp ${size}">${icon('users')}</span>`;
  return `<span class="avatar t-av ${size} role-${th.u.role}" data-u="${th.u.id}">${esc(initials(th.title))}</span>`;
}

// ---------- Messages page ----------
function messagesPage() {
  const threads = myThreads();
  if (!msgUI.init) { // first visit: honour ?t=<thread> or ?tab=direct links
    msgUI.init = true;
    const params = new URLSearchParams(location.search), want = params.get('t');
    if (want && threads.some(t => t.key === want)) { msgUI.active = want; msgUI.tab = tabOf(want); msgUI.showConv = true; }
    else if (params.get('tab') === 'direct') msgUI.tab = 'direct';
  }
  pickActive(threads);
  setTimeout(afterConversationRender, 0);
  return `<div class="msg-shell card ${msgUI.showConv ? 'show-conv' : ''}">
    <aside class="msg-list" id="msgList">${threadListHtml(threads)}</aside>
    <section class="msg-conv" id="msgConv">${conversationHtml(msgUI.active)}</section></div>`;
}

// Keep the open conversation inside the current tab; otherwise open that tab's most recent one.
function pickActive(threads) {
  const inTab = threads.filter(t => tabOf(t.key) === msgUI.tab);
  if (msgUI.active && inTab.some(t => t.key === msgUI.active)) return;
  const recent = inTab.filter(t => lastMsg(t.key)).sort((x, y) => lastMsg(y.key).at.localeCompare(lastMsg(x.key).at));
  msgUI.active = (recent[0] || inTab[0] || {}).key || null;
}

function threadListHtml(threads) {
  const q = msgUI.q.trim().toLowerCase();
  const tabUnread = tab => threads.filter(t => tabOf(t.key) === tab).reduce((n, t) => n + unreadIn(t.key).length, 0);
  const tabMention = tab => threads.some(t => tabOf(t.key) === tab && unreadIn(t.key).some(mentionsMe));
  const tabs = `<div class="msg-tabs" role="tablist">${[['acc', 'Accounts', 'building'], ['direct', 'Direct & groups', 'chat']].map(([k, l, ic]) => {
    const n = tabUnread(k);
    return `<button type="button" role="tab" aria-selected="${msgUI.tab === k}" class="${msgUI.tab === k ? 'on' : ''}" data-msg="tab" data-tab="${k}">
      ${icon(ic)}<span>${l}</span>${n ? `<span class="t-badge ${tabMention(k) ? 'mention' : ''}">${n}</span>` : ''}</button>`;
  }).join('')}</div>`;
  const shown = threads.filter(t => tabOf(t.key) === msgUI.tab && (!q || t.title.toLowerCase().includes(q)));
  const byRecent = (x, y) => ((lastMsg(y.key) || {}).at || '').localeCompare((lastMsg(x.key) || {}).at || '');
  const item = t => {
    const last = lastMsg(t.key), unread = unreadIn(t.key), mention = unread.some(mentionsMe);
    const preview = last ? `${last.by === user.id ? 'You' : esc(nameOf(last.by).split(' ')[0])}: ${esc(last.text)}` : `<em>${t.kind === 'dm' ? 'Say hello' : 'No messages yet'}</em>`;
    return `<button type="button" class="t-item ${t.key === msgUI.active ? 'active' : ''} ${unread.length ? 'unread' : ''}" data-msg="open" data-key="${t.key}">
      ${threadAvatar(t)}
      <span class="t-main"><span class="t-top"><b>${esc(t.title)}</b>${last ? `<small>${msgTime(last.at)}</small>` : ''}</span>
        <span class="t-prev">${preview}</span></span>
      ${unread.length ? `<span class="t-badge ${mention ? 'mention' : ''}">${mention ? '@' : unread.length}</span>` : ''}</button>`;
  };
  const section = (label, list, extra = '') => `<div class="t-sec"><div class="t-sec-head"><span>${label}</span>${extra}</div>${list.map(item).join('') || '<p class="sub t-empty">None</p>'}</div>`;
  const body = msgUI.tab === 'acc'
    ? section('Your accounts', shown.sort(byRecent))
    : section('Direct messages', shown.filter(t => t.kind === 'dm').sort(byRecent))
      + section('Groups', shown.filter(t => t.kind === 'grp').sort(byRecent), `<button type="button" class="t-new" data-msg="new-group" title="New group" aria-label="New group">${icon('plus')}</button>`);
  return `${tabs}<div class="msg-search">${icon('search')}<input type="search" placeholder="${msgUI.tab === 'acc' ? 'Search accounts…' : 'Search people and groups…'}" value="${esc(msgUI.q)}" data-msg-search aria-label="Search conversations"></div>
    <div class="t-scroll">${body}</div>`;
}

function messagesHtml(key, compact = false) {
  const list = threadMsgs(key);
  if (!list.length) return `<div class="msg-empty">${icon('sparkles')}<b>No messages yet</b><span>Start the conversation below.</span></div>`;
  const read = lastRead(key);
  let html = '', prev = null, newShown = false;
  list.forEach(m => {
    if (!prev || dayDiff(new Date(m.at), new Date(prev.at)) !== 0) html += `<div class="day-sep"><span>${dayLabel(m.at)}</span></div>`;
    if (!newShown && m.by !== user.id && m.at > read && !compact) { html += '<div class="new-sep"><span>New</span></div>'; newShown = true; }
    const mine = m.by === user.id;
    const grouped = prev && prev.by === m.by && (new Date(m.at) - new Date(prev.at)) < 5 * 60000 && dayDiff(new Date(m.at), new Date(prev.at)) === 0;
    const u = userById(m.by) || { name: 'Unknown', role: 'DEV' };
    html += `<div class="msg ${mine ? 'mine' : ''} ${grouped ? 'grouped' : ''} ${mentionsMe(m) ? 'mentioned' : ''}">
      ${mine || grouped ? '<span class="msg-av-space"></span>' : `<span class="avatar msg-av role-${u.role}" data-u="${m.by}" title="${esc(u.name)}">${esc(initials(u.name))}</span>`}
      <div class="msg-body">${grouped ? '' : `<div class="msg-meta"><b>${mine ? 'You' : esc(u.name)}</b>${mine ? '' : `<span class="role-tag">${ROLES[u.role].label}</span>`}<time>${new Date(m.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</time></div>`}
        <div class="bubble">${formatText(m.text)}</div></div></div>`;
    prev = m;
  });
  return html;
}

function composerHtml(th) {
  return `<form class="composer" id="msgForm" data-key="${th.key}" autocomplete="off">
    <div class="mention-pop" id="mentionPop" hidden></div>
    <textarea name="text" rows="1" placeholder="Message ${esc(th.kind === 'dm' ? th.title.split(' ')[0] : th.title)}… (type @ to mention)" aria-label="Message"></textarea>
    <button type="submit" class="btn btn-primary send-btn" aria-label="Send">${icon('arrow')}</button>
  </form>`;
}

function conversationHtml(key) {
  const th = key && threadInfo(key);
  if (!th) return `<div class="msg-empty big">${icon('activity')}<b>Pick a conversation</b><span>Choose a thread on the left to start.</span></div>`;
  const people = th.people.map(id => `<span class="avatar mini role-${(userById(id) || {}).role}" data-u="${id}" title="${esc(nameOf(id))}">${esc(initials(nameOf(id)))}</span>`).join('');
  const link = th.kind === 'acc' ? `<a class="btn btn-sm" href="${accountLink(th.a)}">Open account</a>` : '';
  const leave = th.kind === 'grp' ? `<button type="button" class="btn btn-sm" data-msg="group-info" data-key="${th.key}">Members</button>` : '';
  return `<header class="conv-head">
      <button type="button" class="conv-back" data-msg="back" aria-label="Back to conversations">‹</button>
      ${threadAvatar(th, 'lg')}
      <div class="conv-title"><b>${esc(th.title)}</b><span>${esc(th.sub)}</span></div>
      <div class="conv-people">${people}</div>${link}${leave}
    </header>
    <div class="conv-body" id="convBody">${messagesHtml(th.key)}</div>
    ${composerHtml(th)}`;
}

function afterConversationRender() {
  const body = document.getElementById('convBody');
  if (body) body.scrollTop = body.scrollHeight;
  const key = (document.getElementById('msgForm') || {}).dataset?.key;
  if (key && document.visibilityState !== 'hidden') {
    markRead(key);
    const list = document.getElementById('msgList');
    if (list) { const active = list.querySelector(`[data-key="${CSS.escape(key)}"] .t-badge`); if (active) active.remove(); list.querySelector(`[data-key="${CSS.escape(key)}"]`)?.classList.remove('unread'); }
    if (typeof renderNav === 'function') renderNav();
  }
}

// Re-draw only the messaging parts, keeping whatever is typed in the composer.
function refreshMessaging() {
  const ta = document.querySelector('#msgForm textarea');
  const draft = ta ? ta.value : '', hadFocus = ta && document.activeElement === ta;
  const conv = document.getElementById('msgConv'), list = document.getElementById('msgList'), card = document.getElementById('accDiscuss');
  if (conv) conv.innerHTML = conversationHtml(msgUI.active);
  if (list) {
    const s = list.querySelector('[data-msg-search]'), sFocus = s && document.activeElement === s;
    list.innerHTML = threadListHtml(myThreads());
    if (sFocus) { const n = list.querySelector('[data-msg-search]'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }
  }
  if (card) { const a = find(card.dataset.id); if (a) card.outerHTML = accountDiscussionCard(a); }
  const nta = document.querySelector('#msgForm textarea');
  if (nta) { nta.value = draft; autoGrow(nta); if (hadFocus) nta.focus(); }
  afterConversationRender();
}

function sendMessage(form) {
  const ta = form.querySelector('textarea');
  const text = ta.value.trim();
  const key = form.dataset.key;
  if (!text || !threadInfo(key)) return;
  const s = M();
  (s.threads[key] = s.threads[key] || []).push({ id: 'M' + Date.now().toString(36), by: user.id, at: new Date().toISOString(), text });
  s.reads[user.id] = { ...(s.reads[user.id] || {}), [key]: new Date().toISOString() };
  saveMsgs(s);
  ta.value = '';
  refreshMessaging();
  document.querySelector('#msgForm textarea')?.focus();
}

// ---------- Account page card ----------
function accountDiscussionCard(a) {
  if (!canAccessAccThread(a)) return '';
  const th = threadInfo('acc:' + a.id);
  const unread = unreadIn(th.key).length;
  setTimeout(afterConversationRender, 0);
  return `<div class="card discuss" id="accDiscuss" data-id="${a.id}">
    <div class="discuss-head"><h3 class="card-title">Discussion ${unread ? `<span class="t-badge">${unread}</span>` : ''}</h3>
      <a class="btn btn-sm" href="messages.html?t=${encodeURIComponent(th.key)}">Open in Messages</a></div>
    <div class="conv-body compact" id="convBody">${messagesHtml(th.key, true)}</div>
    ${a.archived ? `<p class="sub archived-note">${icon('archive')} This account is archived, so its discussion is read-only.</p>` : composerHtml(th)}</div>`;
}

// ---------- Mentions ----------
function autoGrow(ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; }
function mentionQuery(ta) {
  const before = ta.value.slice(0, ta.selectionStart);
  const m = before.match(/@([A-Za-z]*(?: [A-Za-z]*)?)$/);
  return m ? m[1] : null;
}
function updateMentionPop(ta) {
  const pop = document.getElementById('mentionPop');
  if (!pop) return;
  const q = mentionQuery(ta);
  const th = threadInfo(ta.form.dataset.key);
  const options = q === null || !th ? [] : th.people.filter(id => id !== user.id).map(userById)
    .filter(u => u && u.name.toLowerCase().startsWith(q.toLowerCase()) || (u && u.name.toLowerCase().split(' ').some(p => p.startsWith(q.toLowerCase()))));
  if (!options.length) { pop.hidden = true; return; }
  pop.innerHTML = options.slice(0, 6).map((u, i) => `<button type="button" class="${i === 0 ? 'on' : ''}" data-msg="mention" data-name="${esc(u.name)}">
    <span class="avatar mini role-${u.role}" data-u="${u.id}">${esc(initials(u.name))}</span>${esc(u.name)}<small>${ROLES[u.role].label}</small></button>`).join('');
  pop.hidden = false;
}
function insertMention(name) {
  const ta = document.querySelector('#msgForm textarea');
  if (!ta) return;
  const pos = ta.selectionStart, before = ta.value.slice(0, pos), after = ta.value.slice(pos);
  const start = before.lastIndexOf('@');
  ta.value = before.slice(0, start) + '@' + name + ' ' + after;
  const caret = start + name.length + 2;
  ta.focus(); ta.setSelectionRange(caret, caret);
  document.getElementById('mentionPop').hidden = true;
  autoGrow(ta);
}

// ---------- Groups ----------
function groupDialog() {
  const others = USERS.filter(u => u.id !== user.id);
  openDialog(`${dialogHead('New group', 'A small group chat for part of the team')}
    <form id="groupForm" class="dlg-form" novalidate>
      <div class="error" id="grpError"></div>
      <label class="full"><span>Group name <span class="req">*</span></span><input name="name" maxlength="60" placeholder="Education squad"></label>
      <fieldset class="full grp-members"><legend>Members <span class="req">*</span></legend>
        ${others.map(u => `<label class="check"><input type="checkbox" name="m" value="${u.id}"><span class="avatar mini role-${u.role}">${esc(initials(u.name))}</span>${esc(u.name)}<small class="sub">${ROLES[u.role].label}</small></label>`).join('')}
      </fieldset>
      <div class="actions dlg-actions full"><span style="flex:1"></span>
        <button type="button" class="btn" data-sch="close">Cancel</button>
        <button type="submit" class="btn btn-primary">Create group</button></div>
    </form>`);
}
function saveGroup(form) {
  const name = form.elements.name.value.trim();
  const members = [...form.querySelectorAll('input[name=m]:checked')].map(i => i.value);
  const err = msg => { const el = document.getElementById('grpError'); el.textContent = msg; el.style.display = 'block'; };
  if (!name) return err('Give the group a name.');
  if (!members.length) return err('Choose at least one other member.');
  const s = M();
  const g = { id: 'G' + Date.now().toString(36), name, members: [user.id, ...members], by: user.id, at: new Date().toISOString() };
  s.groups.push(g);
  s.threads['grp:' + g.id] = [{ id: 'M' + Date.now().toString(36), by: user.id, at: new Date().toISOString(), text: `Created the group “${name}”.` }];
  saveMsgs(s);
  dialogEl().close();
  msgUI.active = 'grp:' + g.id; msgUI.tab = 'direct'; msgUI.showConv = true;
  render();
  toast('Group created');
}
function groupInfoDialog(key) {
  const th = threadInfo(key);
  if (!th) return;
  openDialog(`${dialogHead(esc(th.g.name), `${th.g.members.length} members · created by ${esc(nameOf(th.g.by))}`)}
    <div class="grp-list">${th.g.members.map(id => { const u = userById(id) || { name: 'Former member', role: 'DEV' }; return `<div class="grp-row"><span class="avatar mini role-${u.role}">${esc(initials(u.name))}</span><b>${esc(u.name)}</b><small class="sub">${ROLES[u.role].label}</small></div>`; }).join('')}</div>
    <div class="actions dlg-actions"><button type="button" class="btn btn-danger" data-msg="leave" data-key="${key}">Leave group</button><span style="flex:1"></span>
      <button type="button" class="btn" data-sch="close">Close</button></div>`);
}
function leaveGroup(key) {
  const th = threadInfo(key);
  if (!th || !confirm(`Leave “${th.g.name}”? You won't see its messages any more.`)) return;
  const s = M();
  const g = s.groups.find(x => x.id === th.g.id);
  (s.threads[key] = s.threads[key] || []).push({ id: 'M' + Date.now().toString(36), by: user.id, at: new Date().toISOString(), text: 'Left the group.' });
  g.members = g.members.filter(id => id !== user.id);
  saveMsgs(s);
  dialogEl().close();
  msgUI.active = null; msgUI.showConv = false;
  render();
  toast('You left the group');
}

// ---------- Events (delegated, registered once) ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-msg]');
  if (!b) return;
  const act = b.dataset.msg;
  if (act === 'open') {
    msgUI.active = b.dataset.key; msgUI.showConv = true;
    document.querySelector('.msg-shell')?.classList.add('show-conv');
    refreshMessaging();
    document.querySelector('#msgForm textarea')?.focus();
  }
  else if (act === 'tab') {
    if (msgUI.tab === b.dataset.tab) return;
    msgUI.tab = b.dataset.tab; msgUI.q = '';
    pickActive(myThreads());
    refreshMessaging();
  }
  else if (act === 'back') { msgUI.showConv = false; document.querySelector('.msg-shell')?.classList.remove('show-conv'); }
  else if (act === 'mention') insertMention(b.dataset.name);
  else if (act === 'new-group') groupDialog();
  else if (act === 'group-info') groupInfoDialog(b.dataset.key);
  else if (act === 'leave') leaveGroup(b.dataset.key);
});
document.addEventListener('input', e => {
  if (isEl(e.target, '#msgForm textarea')) { autoGrow(e.target); updateMentionPop(e.target); }
  else if (isEl(e.target, '[data-msg-search]')) { msgUI.q = e.target.value; refreshMessaging(); }
});
document.addEventListener('keydown', e => {
  if (!isEl(e.target, '#msgForm textarea') || e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
  e.preventDefault();
  const pop = document.getElementById('mentionPop');
  if (pop && !pop.hidden) { const first = pop.querySelector('button'); if (first) insertMention(first.dataset.name); return; }
  sendMessage(e.target.form);
});
document.addEventListener('submit', e => {
  if (e.target.id === 'msgForm') { e.preventDefault(); sendMessage(e.target); }
  else if (e.target.id === 'groupForm') { e.preventDefault(); saveGroup(e.target); }
});
// Another tab (e.g. signed in as a different user) sent a message: refresh.
window.addEventListener('storage', e => {
  if (e.key !== MSG_KEY) return;
  reloadMsgs();
  if (document.getElementById('msgConv') || document.getElementById('accDiscuss')) refreshMessaging();
  else if (typeof renderNav === 'function') renderNav();
});
