// PRISM — Settings: My profile, Appearance (everyone) and Workspace (Team Lead: stages, people and roles).
// Loaded before app.js; app.js helpers are used at call time only.

const setUI = { tab: null };
const SET_TABS = [['profile', 'My profile', 'user'], ['appearance', 'Appearance', 'palette'], ['workspace', 'Workspace', 'building']];
const START_LABELS = { dashboard: 'Dashboard', pipeline: 'Pipeline', schedule: 'Schedule', approvals: 'Approvals', messages: 'Messages', accounts: 'Accounts' };
const APPROVER_ROLES = ['TL', 'AM', 'HM'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setError(id, msg) { const el = document.getElementById(id); if (!el) return; el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
function updateSettings(fn) { const s = loadSettings(); fn(s); saveSettings(s); }
const cap = s => s[0].toUpperCase() + s.slice(1);

function settingsPage() {
  const tabs = SET_TABS.filter(([k]) => k !== 'workspace' || user.role === 'TL');
  if (!setUI.tab) setUI.tab = new URLSearchParams(location.search).get('tab') || 'profile';
  if (!tabs.some(([k]) => k === setUI.tab)) setUI.tab = 'profile';
  const nav = `<nav class="set-tabs" role="tablist" aria-label="Settings sections">${tabs.map(([k, l, ic]) => `<button type="button" role="tab" aria-selected="${setUI.tab === k}"
      class="${setUI.tab === k ? 'on' : ''}" data-set="tab" data-tab="${k}">${icon(ic)}<span>${l}</span>${k === 'workspace' ? '<small>Team Lead</small>' : ''}</button>`).join('')}</nav>`;
  const body = { profile: profileSection, appearance: appearanceSection, workspace: workspaceSection }[setUI.tab]();
  return `<div class="settings">${nav}<div class="set-body">${body}</div></div>`;
}

const setHead = (title, hint) => `<div class="set-head"><h3 class="card-title">${title}</h3>${hint ? `<p class="hint">${hint}</p>` : ''}</div>`;

// ---------- My profile ----------
function profileSection() {
  const p = profileOf(user.id);
  const swatches = [['', 'Default', null], ...Object.entries(AVATAR_COLORS).map(([k, c]) => [k, cap(k), c])];
  return `<div class="card set-card">${setHead('Your profile', 'How you appear to the rest of the team')}
    <div class="profile-hero">
      <span class="avatar xl" id="avPreview" data-u="${user.id}">${esc(initials(user.name))}</span>
      <div class="profile-id"><b>${esc(user.name)}</b><span>${esc(user.email)}</span>
        <span class="badge b-pending">${ROLES[user.role].label}</span></div>
    </div>
    <form id="profileForm" class="set-form" novalidate>
      <div class="error" id="profileError"></div>
      <label><span>Job title <span class="sub">(optional)</span></span><input name="title" value="${esc(p.title || '')}" maxlength="80" placeholder="Senior Account Manager"></label>
      <label><span>Phone <span class="sub">(optional)</span></span><input name="phone" type="tel" value="${esc(p.phone || '')}" maxlength="20" placeholder="012-345 6789"></label>
      <fieldset class="full swatches"><legend>Avatar colour</legend>
        ${swatches.map(([k, l, c]) => `<label class="swatch"><input type="radio" name="color" value="${k}" ${k === (p.color || '') ? 'checked' : ''}>
          <i style="background:${c ? `linear-gradient(135deg,${c[0]},${c[1]})` : 'linear-gradient(135deg,#7c3aed,#06b6d4)'}"></i><span>${l}</span></label>`).join('')}
      </fieldset>
      <p class="sub full set-note">${icon('lock')} Your name, email and role are managed by the Team Lead.</p>
      <div class="actions full"><button type="submit" class="btn btn-primary">Save profile</button></div>
    </form></div>
  <div class="card set-card">${setHead('Password', 'Change the password you use to sign in')}
    <form id="passwordForm" class="set-form" novalidate autocomplete="off">
      <div class="error" id="pwError"></div>
      <label class="full"><span>Current password</span><input type="password" name="current" autocomplete="current-password"></label>
      <label><span>New password</span><input type="password" name="next" autocomplete="new-password" placeholder="At least 8 characters"></label>
      <label><span>Confirm new password</span><input type="password" name="confirm" autocomplete="new-password"></label>
      <p class="sub full set-note">${icon('alert')} Prototype only: the password is kept in this browser. Secure sign-in comes with the backend.</p>
      <div class="actions full"><button type="submit" class="btn">Change password</button></div>
    </form></div>`;
}

function previewAvatar(color) {
  const el = document.getElementById('avPreview');
  if (!el) return;
  const c = AVATAR_COLORS[color];
  el.style.cssText = c ? `background:linear-gradient(135deg,${c[0]},${c[1]}) !important` : '';
}

function saveProfile(form) {
  const f = form.elements;
  const v = { title: f.title.value.trim(), phone: f.phone.value.trim(), color: (form.querySelector('input[name=color]:checked') || {}).value || '' };
  if (v.phone && !/^[0-9+()\-\s]{7,20}$/.test(v.phone)) return setError('profileError', 'Enter a phone number using digits, spaces, +, - or brackets.');
  setError('profileError', '');
  updateSettings(s => { s.profiles = { ...(s.profiles || {}), [user.id]: v }; });
  applyAppearance();
  toast('Profile saved');
}

function savePassword(form) {
  const f = form.elements;
  if (f.current.value !== passwordFor(user.id)) return setError('pwError', "Your current password isn't right.");
  if (f.next.value.length < 8) return setError('pwError', 'Use at least 8 characters for the new password.');
  if (f.next.value === f.current.value) return setError('pwError', 'Choose a password different from your current one.');
  if (f.next.value !== f.confirm.value) return setError('pwError', "The new passwords don't match.");
  updateSettings(s => { s.passwords = { ...(s.passwords || {}), [user.id]: f.next.value }; });
  form.reset();
  setError('pwError', '');
  toast('Password changed');
}

// ---------- Appearance ----------
function appearanceSection() {
  const a = appearanceOf(user.id);
  const themes = [['system', 'System', 'Matches your device'], ['light', 'Light', 'Bright and clean'], ['dark', 'Dark', 'Easy on the eyes']];
  const densities = [['comfortable', 'Comfortable', 'More breathing room'], ['compact', 'Compact', 'Fit more on screen']];
  const starts = Object.keys(START_PAGES).filter(k => START_PAGES[k].includes(user.role));
  const def = user.role === 'HM' ? 'approvals' : 'dashboard';
  return `<div class="card set-card">${setHead('Theme', 'Saved for you on this browser and applied straight away')}
    <div class="choice-grid three">${themes.map(([k, l, d]) => `<label class="choice">
        <input type="radio" name="theme" value="${k}" data-set-app ${a.theme === k ? 'checked' : ''}>
        <span class="theme-prev tp-${k}"><i></i><i></i><i></i></span><b>${l}</b><small>${d}</small></label>`).join('')}</div></div>
  <div class="card set-card">${setHead('Density', 'How much space the layout uses')}
    <div class="choice-grid two">${densities.map(([k, l, d]) => `<label class="choice">
        <input type="radio" name="density" value="${k}" data-set-app ${a.density === k ? 'checked' : ''}>
        <span class="dens-prev ${k}"><i></i><i></i><i></i></span><b>${l}</b><small>${d}</small></label>`).join('')}</div></div>
  <div class="card set-card">${setHead('Start page', 'What opens after you sign in')}
    <label class="set-select"><select name="start" data-set-app>
      <option value="" ${!a.start ? 'selected' : ''}>Default (${START_LABELS[def]})</option>
      ${starts.map(k => `<option value="${k}" ${a.start === k ? 'selected' : ''}>${START_LABELS[k]}</option>`).join('')}</select></label></div>
  <div class="card set-card install-card">${setHead('PRISM app', 'Put PRISM on your phone or computer like a regular app')}
    <div class="install-row">
      <img src="icons/icon-192.png" alt="" class="install-icon">
      <div class="install-body">
        <div class="pwa-state pwa-installed"><b>${icon('check')} You're using the PRISM app</b><span>It opens from your home screen or app list, full screen, and stays signed in.</span></div>
        <div class="pwa-state pwa-button"><b>Install PRISM</b><span>Adds PRISM to your home screen or app list. Opens full screen and stays signed in.</span>
          <button type="button" class="btn btn-primary" data-pwa-install>${icon('plus')} Install app</button></div>
        <div class="pwa-state pwa-ios"><b>Install on iPhone or iPad</b>
          <ol><li>Open PRISM in <b>Safari</b>.</li><li>Tap the <b>Share</b> button <span class="kbd">⬆︎</span> at the bottom of the screen.</li>
            <li>Choose <b>Add to Home Screen</b>, then tap <b>Add</b>.</li></ol></div>
        <div class="pwa-state pwa-other"><b>Install from your browser</b>
          <ol><li><b>Android (Chrome):</b> tap the <span class="kbd">⋮</span> menu, then <b>Install app</b> or <b>Add to Home screen</b>.</li>
            <li><b>Computer (Chrome or Edge):</b> click the install icon at the right of the address bar.</li></ol></div>
      </div></div></div>`;
}

function saveAppearance(input) {
  updateSettings(s => { s.appearance = { ...(s.appearance || {}), [user.id]: { ...appearanceOf(user.id), [input.name]: input.value } }; });
  applyAppearance();
  const label = input.name === 'start' ? `Start page: ${input.value ? START_LABELS[input.value] : 'Default'}` : `${cap(input.name)}: ${cap(input.value)}`;
  toast(label);
}

// ---------- Workspace (Team Lead) ----------
function assignmentText(uid) {
  const am = accounts.filter(a => a.am === uid).length, dev = accounts.filter(a => a.devs.includes(uid)).length;
  return [am && `Manages ${am}`, dev && `Develops ${dev}`].filter(Boolean).join(' · ') || '<span class="sub">No accounts</span>';
}

function workspaceSection() {
  if (user.role !== 'TL') return '<div class="empty">Only the AI Team Lead can change workspace settings.</div>';
  const stageRows = STAGES.map((s, i) => {
    const d = DEFAULT_STAGES[i];
    const edited = s.targetDays !== d.targetDays || s.approver !== d.approver || s.skippable !== d.skippable;
    return `<tr class="${edited ? 'edited' : ''}">
      <td><span class="pl-num">${s.id}</span></td>
      <td><b>${esc(s.name)}</b>${edited ? ' <span class="edit-dot" title="Changed from the default">edited</span>' : ''}<small>${s.deliverables.map(esc).join(' · ')}</small></td>
      <td><input type="number" name="t${s.id}" value="${s.targetDays}" min="1" max="365" step="1" aria-label="Stage ${s.id} target days"></td>
      <td><select name="a${s.id}" aria-label="Stage ${s.id} approver">${APPROVER_ROLES.map(r => `<option value="${r}" ${s.approver === r ? 'selected' : ''}>${ROLES[r].label}</option>`).join('')}</select></td>
      <td><input type="checkbox" class="switch" name="o${s.id}" ${s.skippable ? 'checked' : ''} aria-label="Stage ${s.id} optional"></td></tr>`;
  }).join('');
  const peopleRows = USERS.map(u => `<tr>
      <td><span class="avatar mini role-${u.role}" data-u="${u.id}">${esc(initials(u.name))}</span></td>
      <td><input name="n_${u.id}" value="${esc(u.name)}" maxlength="60" aria-label="Name"></td>
      <td><input name="e_${u.id}" type="email" value="${esc(u.email)}" maxlength="80" aria-label="Email"></td>
      <td><select name="r_${u.id}" aria-label="Role" ${u.id === user.id ? 'disabled title="You can\'t change your own role"' : ''}>${Object.keys(ROLES).map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${ROLES[r].label}</option>`).join('')}</select></td>
      <td class="assign">${assignmentText(u.id)}</td>
      <td>${u.id === user.id ? '<span class="badge b-pending">You</span>' : `<button type="button" class="icon-del" data-set="remove-user" data-id="${u.id}" title="Remove ${esc(u.name)}" aria-label="Remove ${esc(u.name)}">${icon('trash')}</button>`}</td></tr>`).join('');
  return `<div class="card set-card">${setHead('POC stages', 'Target days, approver and optional stages for every account')}
    <form id="stagesForm" novalidate>
      <div class="error" id="stagesError"></div>
      <div class="set-table-wrap"><table class="set-table"><thead><tr><th>#</th><th>Stage</th><th>Target days</th><th>Approver</th><th>Optional</th></tr></thead><tbody>${stageRows}</tbody></table></div>
      <p class="sub set-note">${icon('alert')} Changes apply to every account straight away. An account already waiting for approval will need the new approver.</p>
      <div class="actions"><button type="button" class="btn" data-set="stages-reset">${icon('refresh')} Restore defaults</button><span style="flex:1"></span>
        <button type="submit" class="btn btn-primary">Save stages</button></div>
    </form></div>
  <div class="card set-card">${setHead('People and roles', `${USERS.length} people can sign in to PRISM`)}
    <form id="peopleForm" novalidate>
      <div class="error" id="peopleError"></div>
      <div class="set-table-wrap"><table class="set-table people"><thead><tr><th></th><th>Name</th><th>Email</th><th>Role</th><th>Accounts</th><th></th></tr></thead><tbody>${peopleRows}</tbody></table></div>
      <div class="actions"><span style="flex:1"></span><button type="submit" class="btn btn-primary">Save people</button></div>
    </form>
    <form id="addPersonForm" class="add-person" novalidate>
      <h4>Add a person</h4>
      <div class="error" id="addError"></div>
      <div class="add-grid">
        <label><span>Name</span><input name="name" maxlength="60" placeholder="Siti Hajar"></label>
        <label><span>Email</span><input name="email" type="email" maxlength="80" placeholder="siti@prism.local"></label>
        <label><span>Role</span><select name="role">${Object.keys(ROLES).map(r => `<option value="${r}" ${r === 'DEV' ? 'selected' : ''}>${ROLES[r].label}</option>`).join('')}</select></label>
        <button type="submit" class="btn">${icon('plus')} Add person</button>
      </div>
      <p class="sub set-note">New people sign in with the demo password until they change it in My profile.</p>
    </form></div>`;
}

function saveStages(form) {
  const f = form.elements, stages = {};
  for (const s of STAGES) {
    const t = Number(f['t' + s.id].value);
    if (!Number.isInteger(t) || t < 1 || t > 365) return setError('stagesError', `Stage ${s.id}: target days must be a whole number from 1 to 365.`);
    stages[s.id] = { targetDays: t, approver: f['a' + s.id].value, skippable: f['o' + s.id].checked };
  }
  const missing = [...new Set(Object.values(stages).map(x => x.approver))].filter(r => !USERS.some(u => u.role === r));
  if (missing.length) return setError('stagesError', `Nobody has the ${missing.map(r => ROLES[r].label).join(' / ')} role, so they couldn't approve. Add someone first.`);
  updateSettings(s => { s.workspace = { ...(s.workspace || {}), stages }; });
  applyWorkspace();
  toast('Stage settings saved');
  render();
}

function resetStages() {
  if (!confirm('Restore every stage to its default target days, approver and optional setting?')) return;
  updateSettings(s => { if (s.workspace) delete s.workspace.stages; });
  applyWorkspace();
  toast('Stages restored to defaults');
  render();
}

// Rules that keep the workspace usable after a people change.
function checkPeople(list) {
  const names = new Set(), emails = new Set();
  for (const u of list) {
    if (!u.name) return 'Every person needs a name.';
    if (!EMAIL_RE.test(u.email)) return `${u.name}: enter a valid email address.`;
    if (names.has(u.name.toLowerCase())) return `Two people are called ${u.name}. Names must be different.`;
    if (emails.has(u.email.toLowerCase())) return `${u.email} is used twice. Emails must be different.`;
    names.add(u.name.toLowerCase()); emails.add(u.email.toLowerCase());
  }
  if (!list.some(u => u.role === 'TL')) return 'Keep at least one AI Team Lead.';
  const needed = [...new Set(STAGES.map(s => s.approver))].filter(r => !list.some(u => u.role === r));
  if (needed.length) return `Keep at least one ${needed.map(r => ROLES[r].label).join(' and one ')}: some stages need their approval.`;
  for (const u of list) {
    const old = userById(u.id);
    if (!old || old.role === u.role) continue;
    const am = accounts.filter(a => a.am === u.id).length, dev = accounts.filter(a => a.devs.includes(u.id)).length;
    if (old.role === 'AM' && am) return `${old.name} manages ${am} account${am === 1 ? '' : 's'}. Reassign them before changing the role.`;
    if (old.role === 'DEV' && dev) return `${old.name} develops ${dev} account${dev === 1 ? '' : 's'}. Remove them from those accounts before changing the role.`;
  }
  return '';
}

function commitPeople(list, msg) {
  updateSettings(s => { s.workspace = { ...(s.workspace || {}), users: list }; });
  applyWorkspace();
  Object.assign(user, userById(user.id)); // keep the signed-in person's details current
  const me = document.querySelector('.me .who b');
  if (me) me.textContent = user.name;
  toast(msg);
  render();
}

function savePeople(form) {
  const f = form.elements;
  const list = USERS.map(u => ({ ...u, name: f['n_' + u.id].value.trim(), email: f['e_' + u.id].value.trim(), role: u.id === user.id ? u.role : f['r_' + u.id].value }));
  const err = checkPeople(list);
  if (err) return setError('peopleError', err);
  commitPeople(list, 'People saved');
}

function addPerson(form) {
  const f = form.elements;
  const next = Math.max(0, ...USERS.map(u => parseInt(u.id.replace(/\D/g, ''), 10) || 0)) + 1;
  const person = { id: 'u' + next, name: f.name.value.trim(), email: f.email.value.trim(), role: f.role.value };
  const err = checkPeople([...USERS.map(u => ({ ...u })), person]);
  if (err) return setError('addError', err);
  commitPeople([...USERS.map(u => ({ ...u })), person], `${person.name} added as ${ROLES[person.role].label}`);
}

function removePerson(id) {
  const u = userById(id);
  if (!u || id === user.id) return;
  const am = accounts.filter(a => a.am === id).length, dev = accounts.filter(a => a.devs.includes(id)).length;
  if (am || dev) return setError('peopleError', `${u.name} is still on ${am + dev} account${am + dev === 1 ? '' : 's'}. Reassign them first.`);
  const list = USERS.filter(x => x.id !== id).map(x => ({ ...x }));
  const err = checkPeople(list);
  if (err) return setError('peopleError', err);
  if (!confirm(`Remove ${u.name}? They won't be able to sign in any more.`)) return;
  commitPeople(list, `${u.name} removed`);
}

// ---------- Events ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-set]');
  if (!b) return;
  const act = b.dataset.set;
  if (act === 'tab') { setUI.tab = b.dataset.tab; history.replaceState(null, '', `settings.html?tab=${setUI.tab}`); render(); }
  else if (act === 'stages-reset') resetStages();
  else if (act === 'remove-user') removePerson(b.dataset.id);
});
document.addEventListener('change', e => {
  if (isEl(e.target, '[data-set-app]')) saveAppearance(e.target);
  else if (isEl(e.target, '#profileForm input[name=color]')) previewAvatar(e.target.value);
});
document.addEventListener('submit', e => {
  const handlers = { profileForm: saveProfile, passwordForm: savePassword, stagesForm: saveStages, peopleForm: savePeople, addPersonForm: addPerson };
  const h = handlers[e.target.id];
  if (h) { e.preventDefault(); h(e.target); }
});
