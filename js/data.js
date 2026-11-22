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
// Sample people exist only while sample data is loaded (Settings › Workspace › Workspace data).
const DEMO_PASSWORD = 'prism123';
const SAMPLE_USERS = [
  { id: 'u1', name: 'Hafiz Rahman', email: 'lead@prism.local', personalEmail: 'hafiz.rahman@example.com', role: 'TL', sample: true },
  { id: 'u2', name: 'Nurul Aina', email: 'aina@prism.local', personalEmail: 'nurul.aina@example.com', role: 'AM', sample: true },
  { id: 'u3', name: 'Daniel Lim', email: 'daniel@prism.local', personalEmail: 'daniel.lim@example.com', role: 'AM', sample: true },
  { id: 'u7', name: 'Farah Hanim', email: 'farah@prism.local', personalEmail: 'farah.hanim@example.com', role: 'AM', sample: true },
  { id: 'u4', name: 'Kavitha Raj', email: 'kavitha@prism.local', personalEmail: 'kavitha.raj@example.com', role: 'DEV', sample: true },
  { id: 'u5', name: 'Amir Zulkifli', email: 'amir@prism.local', personalEmail: 'amir.z@example.com', role: 'DEV', sample: true },
  { id: 'u8', name: 'Jason Tan', email: 'jason@prism.local', personalEmail: 'jason.tan@example.com', role: 'DEV', sample: true },
  { id: 'u6', name: 'Rosnah Ismail', email: 'mgmt@prism.local', personalEmail: 'rosnah.ismail@example.com', role: 'HM', sample: true },
];
// The real team, created in the app (first-run setup, then Settings › People and roles)
const USERS = [];

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

// Account fields:
//   evidence — documents submitted for the CURRENT stage, one slot per deliverable (file name or null)
//   pending  — set when someone requests approval to move to the next stage
//   updates  — progress updates (newest first); history — activity log (newest first)
function acct(o) {
  return { sector: 'Public', pending: null, outcome: null, archived: null, updates: [], history: [], events: [], plan: null, approvals: [], evidenceBy: [], extension: null, ...o };
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
      evidence: ['POC_Proposal_PWD.pdf', 'Success_Criteria.xlsx'], pending: { by: 'u3', at: daysAgo(6) },
      history: [{ by: 'u3', at: daysAgo(6), text: 'Requested approval to move to Agreement & Kick-off' }] }),
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
    acct({ id: 'ACC-011', name: 'Fire and Rescue Department', useCase: 'Emergency call transcription', am: 'u7', devs: ['u8'], stage: 4, status: 'On Track', progress: 30, stageSince: daysAgo(8),
      evidence: ['Signed_LOI_Fire_Rescue.pdf', null],
      updates: [{ by: 'u7', at: daysAgo(2), status: 'On Track', progress: 30, note: 'Letter of intent signed. Data sharing agreement is with their legal team.', blockers: '' }],
      history: [{ by: 'u7', at: daysAgo(2), text: 'Posted a progress update (30%)' }] }),
    acct({ id: 'ACC-012', name: 'National Registration Department', useCase: 'Identity document fraud detection', am: 'u2', devs: ['u8', 'u4'], stage: 6, status: 'At Risk', progress: 48, stageSince: daysAgo(34),
      evidence: [null],
      updates: [
        { by: 'u8', at: daysAgo(1), status: 'At Risk', progress: 48, note: 'Detector catches 91% of tampered samples but false alarms are still high on worn cards.', blockers: 'Need 1,000 more genuine worn-card samples from the agency.' },
        { by: 'u2', at: daysAgo(12), status: 'On Track', progress: 30, note: 'Agency shared the first 5,000 labelled samples.', blockers: '' },
      ],
      history: [{ by: 'u8', at: daysAgo(1), text: 'Posted a progress update (48%)' }] }),
    acct({ id: 'ACC-013', name: 'Social Security Organisation', useCase: 'Claims form data extraction', am: 'u7', devs: ['u5'], stage: 9, status: 'On Track', progress: 95, stageSince: daysAgo(6),
      evidence: ['POC_Completion_Letter_SSO.pdf'], pending: { by: 'u5', at: daysAgo(1) },
      updates: [{ by: 'u7', at: daysAgo(3), status: 'On Track', progress: 95, note: 'Agency signed the completion letter. Extraction accuracy 96% across 12 form types.', blockers: '' }],
      history: [{ by: 'u5', at: daysAgo(1), text: 'Requested approval to move to Go / No-Go Decision' }] }),
    acct({ id: 'ACC-014', name: 'Harbour Logistics Sdn Bhd', sector: 'Private', useCase: 'Container damage inspection from photos', am: 'u3', devs: ['u8'], stage: 2, status: 'On Track', progress: 12, stageSince: daysAgo(7),
      evidence: ['Use_Case_Brief_Harbour.docx', null],
      updates: [{ by: 'u3', at: daysAgo(4), status: 'On Track', progress: 12, note: 'First private-sector POC. Site visit done; they have 3 years of inspection photos.', blockers: '' }] }),
    acct({ id: 'ACC-015', name: 'Ministry of Agriculture', useCase: 'Crop disease detection from leaf photos', am: 'u7', devs: ['u5', 'u8'], stage: 10, status: 'On Track', progress: 100, stageSince: daysAgo(26),
      evidence: ['Decision_Memo_MOA.pdf'], outcome: 'Converted',
      history: [{ by: 'u6', at: daysAgo(12), text: 'Decision: POC converted' }] }),
    acct({ id: 'ACC-016', name: 'Meteorological Department', useCase: 'Flood warning summariser', am: 'u3', devs: ['u4'], stage: 8, status: 'Delayed', progress: 72, stageSince: daysAgo(24),
      evidence: [null],
      updates: [{ by: 'u3', at: daysAgo(5), status: 'Delayed', progress: 72, note: 'Client demo moved twice because of the monsoon response.', blockers: 'Agency team busy with flood operations until next month.' }],
      history: [{ by: 'u1', at: daysAgo(31), text: 'Returned for rework: Internal Review' }] }),
    acct({ id: 'ACC-017', name: 'Ministry of Youth and Sports', useCase: 'Athlete performance insights', am: 'u2', devs: [], stage: 1, status: 'On Track', progress: 3, stageSince: daysAgo(2),
      evidence: ['Problem_Statement_KBS.pdf', null],
      history: [{ by: 'u2', at: daysAgo(2), text: 'Created the account' }] }),
  ];
  const about = {
    'ACC-001': ['Doctors spend up to two hours a day writing discharge summaries. Summarise clinical notes into a draft for review.', 'Head of Digital Health, MOH IT Division'],
    'ACC-002': ['Detect potholes and cracks from survey vehicle footage to prioritise road repairs.', 'Senior Engineer, Road Maintenance Unit'],
    'ACC-003': ['Check visa application documents automatically and flag mismatches for officers.', 'Deputy Director, Visa Division'],
    'ACC-004': ['Help teachers draft lesson plans aligned to the national curriculum.', 'Curriculum Development Division'],
    'ACC-005': ['Answer public questions about land title searches without a counter visit.', 'Customer Service Unit'],
    'ACC-006': ['Route tax enquiries to the right team and draft first replies.', 'Head of Contact Centre'],
    'ACC-007': ['Automate cleaning of household survey returns before analysis.', 'Data Processing Division'],
    'ACC-008': ['Classify citizen complaints and send them to the right department.', 'Smart City Unit'],
    'ACC-009': ['Handle licence renewal questions on the web and messaging apps.', 'Licensing Division'],
    'ACC-010': ['Recommend visitor itineraries from interests and travel dates.', 'Digital Marketing Unit'],
    'ACC-011': ['Transcribe emergency calls live so dispatchers can see key details.', 'Operations Centre'],
    'ACC-012': ['Spot tampered identity cards at registration counters.', 'Document Security Unit'],
    'ACC-013': ['Pull fields out of scanned claim forms to cut manual data entry.', 'Claims Processing Division'],
    'ACC-014': ['Find container damage in gate photos before cargo is accepted.', 'Head of Port Operations'],
    'ACC-015': ['Farmers photograph a leaf and get the likely disease and treatment.', 'Crop Protection Division'],
    'ACC-016': ['Turn flood forecasts into short plain-language warnings.', 'Forecasting Division'],
    'ACC-017': ['Give coaches insights from training and competition data.', 'Sports Science Unit'],
  };
  list.forEach(a => { if (about[a.id]) { a.description = about[a.id][0]; a.contact = about[a.id][1]; } });
  seedSchedule(list);
  seedApprovals(list);
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
const PLAN_SLIP = { 'ACC-001': 6, 'ACC-003': 4, 'ACC-004': 10, 'ACC-006': 2, 'ACC-007': 5, 'ACC-012': 7, 'ACC-016': 9 };
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
  ev('ACC-012', -2, 'Fraud sample review with agency', 'Workshop', '10:00', '12:00', 'Registration HQ');
  ev('ACC-013', 0, 'Completion letter handover', 'Meeting', '11:00', '11:30', 'Online');
  ev('ACC-011', 1, 'Data sharing agreement review', 'Meeting', '14:00', '15:00', 'Legal Division');
  ev('ACC-014', 2, 'Port gate site visit', 'Site visit', '09:00', '12:00', 'North Port');
  ev('ACC-016', 4, 'Rescheduled client demo', 'Client demo', '10:00', '11:30', 'Forecast Centre');
  ev('ACC-012', 6, 'False-alarm tuning review', 'Internal review', '15:00', '16:00', 'AI Team room');
  ev('ACC-017', 10, 'Discovery call with sports science', 'Meeting', '10:00', '11:00', 'Online');
  ev('ACC-013', 11, 'Go / No-Go briefing', 'Meeting', '15:00', '16:00', 'Boardroom');
}

// Demo approval records for stages already passed, plus who uploaded the current documents.
function seedApprovals(list) {
  const at = ymdStr => { const d = parseYmd(ymdStr); d.setHours(10, 30, 0, 0); return d.toISOString(); };
  const comments = { 2: 'Use case is clear and data looks usable.', 3: 'Approved. Keep the success criteria measurable.', 6: 'Prototype reviewed, good to go.' };
  list.forEach(a => {
    const lastStage = a.outcome ? 10 : a.stage;
    for (let id = lastStage - 1; id >= 1; id--) {
      const s = STAGES[id - 1], p = a.plan && a.plan[id];
      if (!p) continue;
      const approver = s.approver === 'AM' ? a.am : s.approver === 'HM' ? 'u6' : 'u1';
      const requester = s.approver === 'AM' ? (a.devs[0] || 'u1') : a.am;
      const decided = at(p.end);
      a.approvals.push({ stage: id, decision: 'approved', by: approver, at: decided, requestedBy: requester, requestedAt: new Date(new Date(decided) - 86400000).toISOString(), comment: comments[id] || '' });
    }
    a.approvals.sort((x, y) => y.at.localeCompare(x.at));
    a.evidenceBy = a.evidence.map(f => f ? { by: a.pending ? a.pending.by : a.am, at: a.pending ? a.pending.at : a.stageSince } : null);
  });
  const rtd = list.find(a => a.id === 'ACC-009'), stb = list.find(a => a.id === 'ACC-010');
  rtd.approvals.unshift({ stage: 10, decision: 'converted', by: 'u6', at: daysAgo(30), requestedBy: 'u2', requestedAt: daysAgo(32), comment: 'Strong results with the agency. Proceed to procurement planning.' });
  rtd.approvals.splice(1, 0, { stage: 10, decision: 'extended', by: 'u6', at: daysAgo(95), requestedBy: 'u2', requestedAt: daysAgo(97), comment: 'Extend to test with the renewal backlog.', until: ymd(new Date(Date.now() - 60 * 86400000)) });
  const moa = list.find(a => a.id === 'ACC-015'), met = list.find(a => a.id === 'ACC-016');
  moa.approvals.unshift({ stage: 10, decision: 'converted', by: 'u6', at: daysAgo(12), requestedBy: 'u7', requestedAt: daysAgo(14), comment: 'Excellent field results. Start the rollout plan with the ministry.' });
  met.approvals.splice(met.approvals.findIndex(x => x.stage === 7), 0, { stage: 7, decision: 'returned', by: 'u1', at: daysAgo(31), requestedBy: 'u4', requestedAt: daysAgo(32), comment: 'Add test results for the East Coast stations before the review.' });
  stb.approvals.unshift({ stage: 10, decision: 'closed', by: 'u6', at: daysAgo(45), requestedBy: 'u3', requestedAt: daysAgo(47), reason: 'Budget or procurement blocked', comment: 'No budget allocated for next year. Revisit if funding is approved.' });
}

// ---- storage helpers (browser storage; real backend later) ----
const STORE_KEY = 'prism_accounts_v8';

function loadAccounts() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw).map(a => ({ events: [], plan: null, archived: null, approvals: [], evidenceBy: [], extension: null, ...a }));
  } catch (e) { /* ignore */ }
  saveAccounts([]); // real workspace starts empty; sample data can be loaded from Settings › Workspace
  return [];
}

function saveAccounts(accounts) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(accounts)); } catch (e) { /* ignore */ }
}

function resetAccounts() {
  try { localStorage.removeItem(STORE_KEY); localStorage.removeItem(AUDIT_KEY); } catch (e) { /* ignore */ }
}

// ---- Workspace audit log (changes that aren't tied to one account, e.g. stage settings, people) ----
const AUDIT_KEY = 'prism_audit_v3';
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
const SETTINGS_KEY = 'prism_settings_v2';
const DEFAULT_STAGES = STAGES.map(s => ({ ...s }));
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
// Prototype only: real sign-in and password storage come with the backend.
const passwordFor = uid => ((loadSettings().passwords || {})[uid]) || (SAMPLE_USERS.some(u => u.id === uid) ? DEMO_PASSWORD : null);
const newPersonId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

// First run: the first person to open PRISM becomes the AI Team Lead.
function createFirstTeamLead(name, email, password, personalEmail = '') {
  const s = loadSettings();
  if ((s.workspace && s.workspace.users && s.workspace.users.length)) return null;
  const tl = { id: newPersonId(), name, email, role: 'TL', ...(personalEmail ? { personalEmail } : {}) };
  s.workspace = { ...(s.workspace || {}), users: [tl] };
  s.passwords = { ...(s.passwords || {}), [tl.id]: password };
  saveSettings(s);
  applyWorkspace();
  auditLog(tl.id, `Set up PRISM and created the AI Team Lead account (${name})`);
  return tl;
}

function startPageFor(u) {
  const p = appearanceOf(u.id).start;
  if (p && START_PAGES[p] && START_PAGES[p].includes(u.role)) return p + '.html';
  return u.role === 'HM' ? 'approvals.html' : 'dashboard.html';
}

// Apply the Team Lead's stage and people settings on top of the defaults (objects are updated in place).
function applyWorkspace() {
  const ws = loadSettings().workspace || {};
  STAGES.forEach((s, i) => Object.assign(s, DEFAULT_STAGES[i], (ws.stages || {})[s.id] || {}));
  USERS.splice(0, USERS.length, ...(ws.users || []).map(u => ({ ...u })));
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

// Remove everything saved by earlier prototype versions so every browser starts completely fresh.
(function purgeLegacyData() {
  const legacy = ['prism_accounts_v1', 'prism_accounts_v2', 'prism_accounts_v3', 'prism_accounts_v4', 'prism_accounts_v5', 'prism_accounts_v6', 'prism_accounts_v7',
    'prism_messages_v1', 'prism_messages_v2', 'prism_tickets_v1', 'prism_tickets_v2', 'prism_feedback_v1', 'prism_feedback_v2',
    'prism_notifs_v1', 'prism_notifs_v2', 'prism_audit_v1', 'prism_audit_v2', 'prism_settings_v1'];
  try { legacy.forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
})();

applyWorkspace();
applyAppearance();
