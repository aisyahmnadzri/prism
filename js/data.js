// PRISM — demo data (prototype only; replaced by a real database later)

const ROLES = {
  TL: { label: 'AI Team Lead' },
  AM: { label: 'Account Manager' },
  DEV: { label: 'Developer' },
  HM: { label: 'Higher Management' },
};

// POC lifecycle: each stage lists what must be submitted and who approves the move forward.
const STAGES = [
  { id: 1, name: 'Opportunity Identified', approver: 'AM', targetDays: 14, skippable: false, deliverables: ['Problem statement', 'Agency contact person'] },
  { id: 2, name: 'Discovery & Use Case', approver: 'TL', targetDays: 21, skippable: false, deliverables: ['Use case brief', 'Data availability assessment'] },
  { id: 3, name: 'POC Proposal & Scoping', approver: 'HM', targetDays: 14, skippable: false, deliverables: ['POC proposal', 'Measurable success criteria'] },
  { id: 4, name: 'Agreement & Kick-off', approver: 'AM', targetDays: 30, skippable: false, deliverables: ['Signed acceptance / LOI', 'NDA / Data sharing agreement'] },
  { id: 5, name: 'Data & Environment Readiness', approver: 'TL', targetDays: 14, skippable: true, deliverables: ['Data received checklist', 'Environment ready'] },
  { id: 6, name: 'POC Development', approver: 'TL', targetDays: 42, skippable: false, deliverables: ['Working prototype / demo'] },
  { id: 7, name: 'Internal Review', approver: 'TL', targetDays: 7, skippable: false, deliverables: ['Internal review notes'] },
  { id: 8, name: 'Client Demo & Evaluation', approver: 'AM', targetDays: 14, skippable: false, deliverables: ['Evaluation results vs success criteria'] },
  { id: 9, name: 'POC Sign-off', approver: 'AM', targetDays: 21, skippable: false, deliverables: ['Signed POC completion letter'] },
  { id: 10, name: 'Go / No-Go Decision', approver: 'HM', targetDays: 14, skippable: false, deliverables: ['Decision memo'] },
];

// Demo users — all share the demo password below. Prototype only, not real credentials.
const DEMO_PASSWORD = 'prism123';
const USERS = [
  { id: 'u1', name: 'Hafiz Rahman', email: 'lead@prism.local', role: 'TL' },
  { id: 'u2', name: 'Nurul Aina', email: 'aina@prism.local', role: 'AM' },
  { id: 'u3', name: 'Daniel Lim', email: 'daniel@prism.local', role: 'AM' },
  { id: 'u4', name: 'Kavitha Raj', email: 'kavitha@prism.local', role: 'DEV' },
  { id: 'u5', name: 'Amir Zulkifli', email: 'amir@prism.local', role: 'DEV' },
  { id: 'u6', name: 'Rosnah Ismail', email: 'mgmt@prism.local', role: 'HM' },
];

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

// Account fields:
//   evidence — documents submitted for the CURRENT stage, one slot per deliverable (file name or null)
//   pending  — set when someone requests approval to move to the next stage
//   updates  — progress updates (newest first); history — activity log (newest first)
function acct(o) {
  return { sector: 'Public', pending: null, outcome: null, archived: null, updates: [], history: [], events: [], plan: null, ...o };
}

function seedAccounts() {
  const list = [
    acct({ id: 'ACC-001', name: 'Ministry of Health', useCase: 'Clinical notes summarisation', am: 'u2', devs: ['u4'], stage: 6, status: 'On Track', progress: 55, stageSince: daysAgo(20),
      evidence: [null],
      updates: [
        { by: 'u4', at: daysAgo(2), status: 'On Track', progress: 55, note: 'Summarisation model fine-tuned on 2,000 anonymised notes. Accuracy 87% on test set.', blockers: '' },
        { by: 'u2', at: daysAgo(9), status: 'On Track', progress: 35, note: 'Weekly check-in with agency IT. Agreed demo date for next month.', blockers: 'Waiting on second batch of sample notes.' },
      ],
      history: [
        { by: 'u4', at: daysAgo(2), text: 'Posted a progress update (55%)' },
        { by: 'u1', at: daysAgo(20), text: 'Approved: Data & Environment Readiness → POC Development' },
        { by: 'u4', at: daysAgo(21), text: 'Requested approval to move to POC Development' },
      ] }),
    acct({ id: 'ACC-002', name: 'Public Works Department', useCase: 'Road defect detection from images', am: 'u3', devs: ['u5'], stage: 3, status: 'On Track', progress: 25, stageSince: daysAgo(10),
      evidence: ['POC_Proposal_PWD.pdf', 'Success_Criteria.xlsx'], pending: { by: 'u3', at: daysAgo(1) },
      history: [{ by: 'u3', at: daysAgo(1), text: 'Requested approval to move to Agreement & Kick-off' }] }),
    acct({ id: 'ACC-003', name: 'Immigration Department', useCase: 'Document verification assistant', am: 'u2', devs: ['u4', 'u5'], stage: 8, status: 'At Risk', progress: 85, stageSince: daysAgo(18),
      evidence: [null],
      updates: [{ by: 'u2', at: daysAgo(3), status: 'At Risk', progress: 85, note: 'Demo done. Agency asked for extra test on passport scans before evaluation.', blockers: 'Agency evaluation panel not yet confirmed.' }] }),
    acct({ id: 'ACC-004', name: 'Ministry of Education', useCase: 'Teacher lesson-plan assistant', am: 'u3', devs: ['u5'], stage: 2, status: 'Delayed', progress: 15, stageSince: daysAgo(25),
      evidence: ['Use_Case_Brief_MOE.docx', 'Data_Assessment.pdf'], pending: { by: 'u3', at: daysAgo(3) },
      history: [{ by: 'u3', at: daysAgo(3), text: 'Requested approval to move to POC Proposal & Scoping' }] }),
    acct({ id: 'ACC-005', name: 'Land & Mines Office', useCase: 'Land title search chatbot', am: 'u2', devs: [], stage: 1, status: 'On Track', progress: 5, stageSince: daysAgo(5),
      evidence: ['Problem_Statement.pdf', 'Agency_Contact.txt'], pending: { by: 'u1', at: daysAgo(1) },
      history: [{ by: 'u1', at: daysAgo(1), text: 'Requested approval to move to Discovery & Use Case' }] }),
    acct({ id: 'ACC-006', name: 'Inland Revenue Board', useCase: 'Tax enquiry triage', am: 'u3', devs: ['u4'], stage: 10, status: 'On Track', progress: 100, stageSince: daysAgo(4),
      evidence: ['Decision_Memo_IRB.pdf'], pending: { by: 'u3', at: daysAgo(1) },
      history: [{ by: 'u3', at: daysAgo(1), text: 'Requested Go / No-Go decision' }] }),
    acct({ id: 'ACC-007', name: 'Department of Statistics', useCase: 'Survey data cleaning automation', am: 'u2', devs: ['u5'], stage: 5, status: 'On Hold', progress: 40, stageSince: daysAgo(9),
      evidence: ['Data_Received_Checklist.xlsx', null],
      updates: [{ by: 'u5', at: daysAgo(4), status: 'On Hold', progress: 40, note: 'Environment setup paused.', blockers: 'Agency security clearance for cloud environment still pending.' }] }),
    acct({ id: 'ACC-008', name: 'City Council', useCase: 'Citizen complaint classifier', am: 'u3', devs: ['u4'], stage: 7, status: 'On Track', progress: 90, stageSince: daysAgo(3),
      evidence: ['Internal_Review_Notes.docx'], pending: { by: 'u4', at: daysAgo(0) },
      history: [{ by: 'u4', at: daysAgo(0), text: 'Requested approval to move to Client Demo & Evaluation' }] }),
    acct({ id: 'ACC-009', name: 'Road Transport Department', useCase: 'Licence renewal chatbot', am: 'u2', devs: ['u5'], stage: 10, status: 'On Track', progress: 100, stageSince: daysAgo(30),
      evidence: ['Decision_Memo_RTD.pdf'], outcome: 'Converted',
      history: [
        { by: 'u6', at: daysAgo(30), text: 'Decision: POC converted' },
        { by: 'u6', at: daysAgo(95), text: 'Decision: POC extended — back to POC Development' },
      ] }),
    acct({ id: 'ACC-010', name: 'State Tourism Board', useCase: 'Visitor itinerary recommender', am: 'u3', devs: ['u4'], stage: 10, status: 'On Track', progress: 100, stageSince: daysAgo(45),
      evidence: ['Decision_Memo_STB.pdf'], outcome: 'Closed', archived: { at: daysAgo(30), by: 'u1' },
      history: [{ by: 'u1', at: daysAgo(30), text: 'Archived the account' }, { by: 'u6', at: daysAgo(45), text: 'Decision: POC closed' }] }),
  ];
  seedSchedule(list);
  return list;
}

// ---- Dates (local calendar days, stored as 'YYYY-MM-DD') ----
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// Stage plan: chain every stage from the current stage's planned start using each stage's target days.
function autoPlan(currentStage, currentStart) {
  const plan = {};
  let end = startOfDay(currentStart);
  for (let id = currentStage - 1; id >= 1; id--) {
    const start = addDays(end, -STAGES[id - 1].targetDays);
    plan[id] = { start: ymd(start), end: ymd(end) };
    end = start;
  }
  let start = startOfDay(currentStart);
  for (let id = currentStage; id <= 10; id++) {
    const e = addDays(start, STAGES[id - 1].targetDays);
    plan[id] = { start: ymd(start), end: ymd(e) };
    start = e;
  }
  return plan;
}

// Demo schedule: some POCs started their current stage later than planned (slip, in days).
const PLAN_SLIP = { 'ACC-001': 6, 'ACC-003': 4, 'ACC-004': 10, 'ACC-006': 2, 'ACC-007': 5 };
function seedSchedule(list) {
  list.forEach(a => { a.plan = autoPlan(a.stage, addDays(new Date(a.stageSince), -(PLAN_SLIP[a.id] || 0))); });
  let n = 0;
  const ev = (id, day, title, type, start, end, location) => {
    list.find(x => x.id === id).events.push({ id: 'EV-' + (++n), title, type, date: ymd(addDays(new Date(), day)), start, end, location, notes: '', by: 'u1' });
  };
  ev('ACC-001', -6, 'Second batch of sample notes handover', 'Site visit', '10:00', '11:30', 'MOH IT Division');
  ev('ACC-003', -3, 'Passport scan test session', 'Workshop', '14:00', '16:00', 'Immigration HQ');
  ev('ACC-008', -1, 'Internal QA review', 'Internal review', '15:00', '16:00', 'AI Team room');
  ev('ACC-003', 1, 'Evaluation panel briefing', 'Client demo', '10:00', '12:00', 'Immigration HQ');
  ev('ACC-001', 2, 'Weekly check-in with MOH IT', 'Meeting', '10:00', '10:45', 'Online');
  ev('ACC-004', 3, 'Use-case workshop #2', 'Workshop', '09:00', '12:00', 'MOE Curriculum Division');
  ev('ACC-002', 4, 'Scope and success criteria sign-off', 'Meeting', '09:30', '10:30', 'PWD HQ');
  ev('ACC-006', 5, 'Go / No-Go decision meeting', 'Meeting', '15:00', '16:00', 'Boardroom');
  ev('ACC-005', 6, 'Discovery kick-off', 'Meeting', '11:00', '12:00', 'Land & Mines Office');
  ev('ACC-008', 7, 'Client demo', 'Client demo', '10:00', '11:30', 'City Hall');
  ev('ACC-007', 8, 'Security clearance follow-up', 'Meeting', '14:30', '15:00', 'Online');
  ev('ACC-001', 9, 'Model accuracy review', 'Internal review', '14:30', '15:30', 'AI Team room');
  ev('ACC-002', 12, 'Site visit: road survey footage', 'Site visit', '08:30', '12:30', 'Federal Route 2');
  ev('ACC-003', 15, 'Evaluation results walkthrough', 'Client demo', '10:00', '11:00', 'Immigration HQ');
}

// ---- storage helpers (browser storage; real backend later) ----
const STORE_KEY = 'prism_accounts_v5';

function loadAccounts() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw).map(a => ({ events: [], plan: null, archived: null, ...a }));
  } catch (e) { /* ignore */ }
  const seeded = seedAccounts();
  saveAccounts(seeded);
  return seeded;
}

function saveAccounts(accounts) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(accounts)); } catch (e) { /* ignore */ }
}

function resetAccounts() {
  try { localStorage.removeItem(STORE_KEY); localStorage.removeItem(AUDIT_KEY); } catch (e) { /* ignore */ }
}

// ---- Workspace audit log (changes that aren't tied to one account, e.g. stage settings, people) ----
const AUDIT_KEY = 'prism_audit_v1';
function loadAudit() { try { return JSON.parse(localStorage.getItem(AUDIT_KEY)) || []; } catch (e) { return []; } }
function auditLog(by, text) {
  const list = loadAudit();
  list.unshift({ by, at: new Date().toISOString(), text });
  try { localStorage.setItem(AUDIT_KEY, JSON.stringify(list.slice(0, 500))); } catch (e) { /* ignore */ }
}

function userById(id) {
  return USERS.find(u => u.id === id);
}

// True when target is an element matching the selector (events can also target the document itself).
const isEl = (t, sel) => t instanceof Element && t.matches(sel);

// ---- Sign-in storage ----
// In a browser tab the sign-in lasts for that tab (so two tabs can be two different people in the demo).
// Opened as an installed app, it stays signed in between launches.
const IS_APP = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const sessionStore = () => IS_APP ? localStorage : sessionStorage;

// ---- Settings: personal profile + appearance, and Team Lead workspace overrides (stages, people) ----
const SETTINGS_KEY = 'prism_settings_v1';
const DEFAULT_STAGES = STAGES.map(s => ({ ...s }));
const DEFAULT_USERS = USERS.map(u => ({ ...u }));
const AVATAR_COLORS = {
  violet: ['#7c3aed', '#a855f7'], ocean: ['#2563eb', '#06b6d4'], forest: ['#0d9488', '#22c55e'],
  sunset: ['#ea580c', '#f43f5e'], rose: ['#db2777', '#f472b6'], slate: ['#334155', '#64748b'],
};
// Pages a person may choose to open after sign-in, by role
const START_PAGES = {
  dashboard: ['TL', 'AM', 'DEV'], pipeline: ['TL', 'AM', 'DEV'], schedule: ['TL', 'AM', 'DEV'],
  approvals: ['TL', 'AM', 'HM'], messages: ['TL', 'AM', 'DEV', 'HM'], accounts: ['TL', 'AM', 'DEV'],
};

function loadSettings() { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch (e) { return {}; } }
function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } }
const profileOf = uid => ((loadSettings().profiles || {})[uid]) || {};
const appearanceOf = uid => ({ theme: 'system', density: 'comfortable', start: '', ...((loadSettings().appearance || {})[uid] || {}) });
// Demo only: real sign-in and password storage come with the backend.
const passwordFor = uid => ((loadSettings().passwords || {})[uid]) || DEMO_PASSWORD;

function startPageFor(u) {
  const p = appearanceOf(u.id).start;
  if (p && START_PAGES[p] && START_PAGES[p].includes(u.role)) return p + '.html';
  return u.role === 'HM' ? 'approvals.html' : 'dashboard.html';
}

// Apply the Team Lead's stage and people settings on top of the defaults (objects are updated in place).
function applyWorkspace() {
  const ws = loadSettings().workspace || {};
  STAGES.forEach((s, i) => Object.assign(s, DEFAULT_STAGES[i], (ws.stages || {})[s.id] || {}));
  USERS.splice(0, USERS.length, ...(ws.users || DEFAULT_USERS).map(u => ({ ...u })));
}

// Theme, density and personal avatar colours for whoever is signed in on this tab.
function applyAppearance() {
  let uid = null;
  try { uid = sessionStore().getItem('prism_session'); } catch (e) { /* ignore */ }
  const a = uid ? appearanceOf(uid) : { theme: 'system', density: 'comfortable' };
  const root = document.documentElement;
  if (a.theme === 'light' || a.theme === 'dark') root.dataset.theme = a.theme; else delete root.dataset.theme;
  root.dataset.density = a.density;
  const profiles = loadSettings().profiles || {};
  const css = Object.entries(profiles).filter(([, p]) => AVATAR_COLORS[p.color])
    .map(([id, p]) => `[data-u="${id}"]{background:linear-gradient(135deg,${AVATAR_COLORS[p.color][0]},${AVATAR_COLORS[p.color][1]})!important}`).join('');
  let el = document.getElementById('userColors');
  if (!el) { el = document.createElement('style'); el.id = 'userColors'; document.head.appendChild(el); }
  el.textContent = css;
}

applyWorkspace();
applyAppearance();
