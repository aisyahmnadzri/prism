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
  { id: 'u2', name: 'Kira', email: 'kira@prism.local', personalEmail: 'kira@example.com', role: 'AM', sample: true },
  { id: 'u3', name: 'Mala', email: 'mala@prism.local', personalEmail: 'mala@example.com', role: 'AM', sample: true },
  { id: 'u4', name: 'Aisyah', email: 'aisyah@prism.local', personalEmail: 'aisyah@example.com', role: 'DEV', sample: true },
  { id: 'u5', name: 'Raimi', email: 'raimi@prism.local', personalEmail: 'raimi@example.com', role: 'DEV', sample: true },
  { id: 'u7', name: 'Alia', email: 'alia@prism.local', personalEmail: 'alia@example.com', role: 'DEV', sample: true },
  { id: 'u8', name: 'Fiqry', email: 'fiqry@prism.local', personalEmail: 'fiqry@example.com', role: 'DEV', sample: true },
  { id: 'u9', name: 'Rian', email: 'rian@prism.local', personalEmail: 'rian@example.com', role: 'DEV', sample: true },
  { id: 'u10', name: 'Luqman', email: 'luqman@prism.local', personalEmail: 'luqman@example.com', role: 'DEV', sample: true },
  { id: 'u11', name: 'Fahim', email: 'fahim@prism.local', personalEmail: 'fahim@example.com', role: 'DEV', sample: true },
  { id: 'u12', name: 'Wan', email: 'wan@prism.local', personalEmail: 'wan@example.com', role: 'DEV', sample: true },
  { id: 'u13', name: 'Haziq', email: 'haziq@prism.local', personalEmail: 'haziq@example.com', role: 'DEV', sample: true },
  { id: 'u14', name: 'Hilman', email: 'hilman@prism.local', personalEmail: 'hilman@example.com', role: 'DEV', sample: true },
  { id: 'u15', name: 'Amir', email: 'amir@prism.local', personalEmail: 'amir@example.com', role: 'DEV', sample: true },
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
  return { sector: 'Public', code: '', tier: '', pocReady: null, cfaRemarks: '', tracker: null, pending: null, outcome: null, archived: null, updates: [], history: [], events: [], plan: null, approvals: [], evidenceBy: [], extension: null, ...o };
}

function seedAccounts() {
  // From the AI Team's Account Allocation & POC Lifecycle Tracker (Nov 2026), mapped onto PRISM's 10 stages.
  // Team order in devs = Primary, Secondary, Tertiary.
  const on = (ds, h = 10) => { const d = parseYmd(ds); d.setHours(h, 0, 0, 0); return d.toISOString(); };
  const K = 'u2', M = 'u3', Ai = 'u4', Ra = 'u5', Al = 'u7', Fi = 'u8', Ri = 'u9', Lu = 'u10', Fa = 'u11', Wa = 'u12', Ha = 'u13', Hi = 'u14', Am = 'u15';
  const TBC = 'Use case to be confirmed';
  // Lifecycle columns from the tracker, shown on each account as they appear in the spreadsheet
  const T = (o) => Object.entries({ 'POC agreement': o.ag, 'Fact finding': o.ff, 'Requirement mapping': o.rm, 'Workflow presentation': o.wp,
    'POC implementation': o.impl, 'Immersion execution': o.imm, 'Immersion date': o.immDate, 'Solution training': o.st, 'Finetuning': o.ft,
    'Lunch & Learn': o.ll, 'Post L&L': o.pll, 'CFA paper': o.cfa, 'POC status': o.ps }).filter(([, v]) => v).map(([k, v]) => [k, v]);
  const list = [
    acct({ id: 'ACC-001', name: 'Kementerian Kewangan Malaysia', code: 'MOF', tier: 'Tier 1', pocReady: true, useCase: TBC, am: K, devs: [], stage: 9, status: 'On Track', progress: 50, stageSince: daysAgo(24),
      cfaRemarks: 'Open tender process. Waiting for AWS to finalise.', evidence: [null],
      tracker: T({ ag: 'received', ff: 'done', rm: 'todo', wp: 'todo', impl: 'deployed', imm: 'Done', cfa: 'ongoing', ps: 'ongoing' }),
      updates: [{ by: K, at: on('2026-10-16'), status: 'On Track', progress: 50, note: 'CFA paper ongoing. Open tender process.', blockers: 'Waiting for AWS to finalise.' }] }),
    acct({ id: 'ACC-002', name: 'Pejabat Perdana Menteri', code: 'PMO', tier: 'Tier 2', pocReady: true, useCase: TBC, am: K, devs: [Ai], stage: 6, status: 'On Track', progress: 33, stageSince: daysAgo(75),
      evidence: [null], tracker: T({ ag: 'received', ff: 'done', rm: 'todo', wp: 'todo', impl: 'development', imm: 'Done', immDate: 'Monday, 14 September 2026', cfa: 'not started', ps: 'ongoing' }) }),
    acct({ id: 'ACC-003', name: 'Institut Integriti Malaysia (IIM)', code: 'IIM', tier: 'Tier 3', pocReady: true, useCase: TBC, am: M, devs: [Ai, Al, Fi], stage: 6, status: 'At Risk', progress: 33, stageSince: daysAgo(45),
      evidence: [null], tracker: T({ ag: 'received', ff: 'done', rm: 'todo', wp: 'todo', impl: 'finetune', imm: 'Done', ft: 'iteration needed', cfa: 'not started', ps: 'not started' }),
      updates: [{ by: Ai, at: daysAgo(4), status: 'At Risk', progress: 33, note: 'Finetuning results reviewed. Another iteration is needed.', blockers: 'Finetuning needs another iteration.' }] }),
    acct({ id: 'ACC-004', name: 'Kementerian Ekonomi', code: 'KE', tier: 'Tier 2', pocReady: true, useCase: TBC, am: K, devs: [Ai], stage: 9, status: 'On Track', progress: 50, stageSince: daysAgo(20),
      cfaRemarks: '16/10: To submit at JPP CFA on 18/11.', evidence: [null],
      tracker: T({ ag: 'received', ff: 'done', rm: 'todo', wp: 'todo', impl: 'deployed', imm: 'Done', ll: 'done', pll: 'new use case', cfa: 'not started', ps: 'ongoing' }),
      updates: [{ by: K, at: on('2026-10-16'), status: 'On Track', progress: 50, note: 'Lunch & Learn done and a new use case came out of it. To submit at JPP CFA on 18/11.', blockers: '' }] }),
    acct({ id: 'ACC-005', name: 'Pertubuhan Keselamatan Sosial (PERKESO)', code: 'PERKESO', tier: 'Tier 3', pocReady: true, useCase: TBC, am: K, devs: [Ri], stage: 6, status: 'On Track', progress: 33, stageSince: daysAgo(28),
      evidence: [null], tracker: T({ ag: 'received', ff: 'done', rm: 'todo', wp: 'todo', impl: 'development', imm: 'Not Yet', cfa: 'not started', ps: 'not started' }) }),
    acct({ id: 'ACC-006', name: 'Kementerian Perumahan dan Kerajaan Tempatan', code: 'KPKT', tier: 'Tier 2', pocReady: true, useCase: TBC, am: M, devs: [Ai, Lu, Fa], stage: 6, status: 'On Track', progress: 33, stageSince: daysAgo(32),
      evidence: [null], tracker: T({ ag: 'received', ff: 'done', rm: 'todo', wp: 'todo', impl: 'development', imm: 'Not Yet', cfa: 'not started', ps: 'ongoing' }) }),
    acct({ id: 'ACC-007', name: 'Parlimen Malaysia', code: 'PARLIMEN', tier: 'Tier 3', pocReady: false, useCase: TBC, am: M, devs: [Ra, Wa, Lu], stage: 5, status: 'At Risk', progress: 33, stageSince: daysAgo(38),
      evidence: [null, null], tracker: T({ ag: 'received', ff: 'done', rm: 'todo', wp: 'todo', imm: 'Not Yet', cfa: 'not started', ps: 'not started' }),
      updates: [{ by: M, at: daysAgo(6), status: 'At Risk', progress: 33, note: 'Implementation can start once the POC account is ready.', blockers: 'POC account not ready.' }] }),
    acct({ id: 'ACC-008', name: 'Kementerian Peralihan Tenaga Dan Transformasi Air (PETRA)', code: 'PETRA', tier: 'Tier 2', pocReady: true, useCase: TBC, am: K, devs: [Ra, Al], stage: 8, status: 'On Track', progress: 50, stageSince: daysAgo(56),
      evidence: [null], tracker: T({ ag: 'received', ff: 'done', rm: 'todo', wp: 'todo', impl: 'deployed', imm: 'Done', immDate: 'Monday, 28 September 2026', ll: 'to have', cfa: 'not started', ps: 'ongoing' }) }),
    acct({ id: 'ACC-009', name: 'Kementerian Pengangkutan Malaysia', code: 'MOT', tier: 'Tier 1', pocReady: true, useCase: TBC, am: K, devs: [Ra, Ha, Hi], stage: 10, status: 'On Track', progress: 50, stageSince: daysAgo(38),
      cfaRemarks: '16/10: Submitted the CGSO paper. The next JDN JPPCSA will be in November.', evidence: ['CGSO_Paper_MOT.pdf'], pending: { by: K, at: on('2026-10-16', 15) },
      tracker: T({ ag: 'received', ff: 'done', rm: 'todo', wp: 'todo', impl: 'deployed', imm: 'Done', ll: 'to have', cfa: 'ongoing', ps: 'ongoing' }),
      updates: [{ by: K, at: on('2026-10-16'), status: 'On Track', progress: 50, note: 'Submitted the CGSO paper. The next JDN JPPCSA will be in November.', blockers: '' }],
      history: [{ by: K, at: on('2026-10-16', 15), text: 'Requested Go / No-Go decision' }] }),
    acct({ id: 'ACC-010', name: 'Unit Transformasi Masyarakat India Malaysia (MITRA)', code: 'MITRA', tier: 'Tier 1', pocReady: true, useCase: TBC, am: M, devs: [Ra, Ha, Hi], stage: 9, status: 'On Track', progress: 50, stageSince: daysAgo(30),
      cfaRemarks: '16/10: Just entered the sectoral approval process phase.', evidence: [null],
      tracker: T({ ag: 'received', ff: 'done', rm: 'todo', wp: 'todo', impl: 'deployed', imm: 'Done', cfa: 'ongoing', ps: 'ongoing' }),
      updates: [{ by: M, at: on('2026-10-16'), status: 'On Track', progress: 50, note: 'Just entered the sectoral approval process phase.', blockers: '' }] }),
    acct({ id: 'ACC-011', name: 'Suruhanjaya Koperasi Malaysia (SKM)', code: 'SKM', tier: 'Tier 3', pocReady: null, useCase: TBC, am: M, devs: [], stage: 10, status: 'On Track', progress: 33, stageSince: daysAgo(40),
      evidence: [null], outcome: 'Closed', tracker: T({ ag: 'received', ff: 'done', rm: 'todo', wp: 'todo', imm: 'Done', immDate: 'Thursday, 11 June 2026', cfa: 'not started', ps: 'ended' }),
      history: [{ by: 'u6', at: daysAgo(20), text: 'Decision: POC closed' }] }),
    acct({ id: 'ACC-012', name: 'Kementerian Kemajuan Desa dan Wilayah', code: 'KKDW', tier: 'Tier 4', pocReady: null, useCase: TBC, am: K, devs: [], stage: 2, status: 'On Hold', progress: 0, stageSince: daysAgo(48),
      evidence: [null, null], tracker: T({ ag: 'pending', ff: 'onhold', rm: 'todo', wp: 'todo', cfa: 'not started', ps: 'not started' }) }),
    acct({ id: 'ACC-013', name: 'Kementerian Kerja Raya', code: 'KKR', tier: 'Tier 4', pocReady: null, useCase: TBC, am: M, devs: [], stage: 2, status: 'On Hold', progress: 0, stageSince: daysAgo(48),
      evidence: [null, null], tracker: T({ ag: 'pending', ff: 'onhold', rm: 'todo', wp: 'todo', cfa: 'not started', ps: 'not started' }) }),
    acct({ id: 'ACC-014', name: 'Kementerian Pendidikan Malaysia', code: 'KPM', tier: 'Tier 4', pocReady: null, useCase: TBC, am: K, devs: [], stage: 2, status: 'On Hold', progress: 0, stageSince: daysAgo(55),
      cfaRemarks: 'Waiting for approval from Pengarah on Oct 11.', evidence: [null, null],
      tracker: T({ ag: 'pending', ff: 'onhold', rm: 'todo', wp: 'todo', cfa: 'not started', ps: 'not started' }),
      updates: [{ by: K, at: on('2026-10-11'), status: 'On Hold', progress: 0, note: 'Fact finding on hold.', blockers: 'Waiting for approval from Pengarah.' }] }),
    acct({ id: 'ACC-016', name: 'Jabatan Kimia', code: 'KIMIA', tier: 'Tier 3', pocReady: true, useCase: TBC, am: K, devs: [Ri], stage: 5, status: 'On Track', progress: 67, stageSince: daysAgo(14),
      evidence: ['Data_Received_Checklist_KIMIA.xlsx', 'Environment_Ready_KIMIA.pdf'], pending: { by: Ri, at: daysAgo(2) },
      tracker: T({ ag: 'received', ff: 'done', rm: 'done', wp: 'done', imm: 'Not Yet', immDate: 'Wednesday, 18 November 2026', cfa: 'not started', ps: 'not started' }),
      history: [{ by: Ri, at: daysAgo(2), text: 'Requested approval to move to POC Development' }] }),
    acct({ id: 'ACC-017', name: 'Kementerian Pembangunan Usahawan dan Koperasi', code: 'KUSKOP', tier: 'Tier 2', pocReady: true, useCase: TBC, am: M, devs: [Ra, Am], stage: 7, status: 'On Track', progress: 50, stageSince: daysAgo(6),
      evidence: ['Internal_Review_Notes_KUSKOP.docx'], pending: { by: Ra, at: daysAgo(1) },
      tracker: T({ ag: 'received', ff: 'ongoing', rm: 'done', impl: 'deployed', imm: 'Not Yet', ll: 'to have', cfa: 'not started', ps: 'ongoing' }),
      history: [{ by: Ra, at: daysAgo(1), text: 'Requested approval to move to Client Demo & Evaluation' }] }),
    acct({ id: 'ACC-018', name: 'Kementerian Kesihatan Malaysia', code: 'KKM', tier: 'Tier 4', pocReady: true, useCase: TBC, am: K, devs: [Ra, Fi, Ha], stage: 2, status: 'On Track', progress: 0, stageSince: daysAgo(12),
      evidence: [null, null], tracker: T({ ag: 'pending', ff: 'ongoing', rm: 'ongoing', imm: 'Not Yet', cfa: 'not started', ps: 'not started' }) }),
    acct({ id: 'ACC-019', name: 'Kementerian Belia dan Sukan', code: 'KBS', tier: 'Tier 3', pocReady: true, useCase: TBC, am: K, devs: [Ai], stage: 2, status: 'On Track', progress: 17, stageSince: daysAgo(18),
      evidence: ['Use_Case_Brief_KBS.docx', 'Data_Assessment_KBS.pdf'], pending: { by: K, at: daysAgo(3) },
      tracker: T({ ag: 'received', ff: 'ongoing', rm: 'ongoing', imm: 'Not Yet', cfa: 'not started', ps: 'not started' }),
      history: [{ by: K, at: daysAgo(3), text: 'Requested approval to move to POC Proposal & Scoping' }] }),
    acct({ id: 'ACC-020', name: 'Kementerian Perpaduan Negara', code: 'KPN', tier: 'Tier 3', pocReady: true, useCase: TBC, am: K, devs: [Ai], stage: 2, status: 'On Track', progress: 17, stageSince: daysAgo(18),
      evidence: ['Use_Case_Brief_KPN.docx', null], tracker: T({ ag: 'received', ff: 'ongoing', rm: 'ongoing', imm: 'Not Yet', cfa: 'not started', ps: 'not started' }) }),
    acct({ id: 'ACC-021', name: 'Indah Water Konsortium', code: 'IWK', tier: 'Tier 4', pocReady: null, useCase: TBC, am: M, devs: [Ra, Al], stage: 2, status: 'On Hold', progress: 0, stageSince: daysAgo(40),
      evidence: [null, null], tracker: T({ ag: 'pending', ff: 'onhold', imm: 'Not Yet' }) }),
    acct({ id: 'ACC-022', name: 'Jabatan Audit Negara', code: 'JAN', tier: 'Tier 4', pocReady: null, useCase: TBC, am: '', devs: [Ai], stage: 2, status: 'On Hold', progress: 0, stageSince: daysAgo(40),
      evidence: [null, null], tracker: T({ ag: 'pending', ff: 'onhold', rm: 'ongoing', imm: 'Not Yet' }) }),
    acct({ id: 'ACC-023', name: 'Jabatan Pengairan & Saliran', code: 'JPS', tier: 'Tier 4', pocReady: null, useCase: TBC, am: M, devs: [], stage: 1, status: 'On Track', progress: 0, stageSince: daysAgo(6),
      evidence: [null, null] }),
    acct({ id: 'ACC-024', name: 'Institut Keusahawanan Negara (INSKEN)', code: 'INSKEN', tier: 'Tier 4', pocReady: null, useCase: TBC, am: M, devs: [], stage: 1, status: 'On Track', progress: 0, stageSince: daysAgo(6),
      evidence: [null, null] }),
  ];
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
const PLAN_SLIP = { 'ACC-003': 8, 'ACC-007': 10, 'ACC-012': 14, 'ACC-013': 14, 'ACC-014': 20, 'ACC-021': 9, 'ACC-022': 9, 'ACC-002': 12 };
function seedSchedule(list) {
  list.forEach(a => { a.plan = autoPlan(a.stage, addDays(new Date(a.stageSince), -(PLAN_SLIP[a.id] || 0))); });
  let n = 0;
  const add = (id, date, title, type, start, end, location) => {
    list.find(x => x.id === id).events.push({ id: 'EV-' + (++n), title, type, date, start, end, location, notes: '', by: 'u1' });
  };
  const ev = (id, day, ...rest) => add(id, ymd(addDays(new Date(), day)), ...rest);
  // Dates from the tracker
  add('ACC-011', '2026-06-11', 'Immersion session', 'Workshop', '09:00', '13:00', 'SKM');
  add('ACC-002', '2026-09-14', 'Immersion session', 'Workshop', '09:00', '13:00', 'PMO');
  add('ACC-008', '2026-09-28', 'Immersion session', 'Workshop', '09:00', '13:00', 'PETRA');
  add('ACC-004', '2026-11-18', 'JPP CFA submission', 'Meeting', '10:00', '11:00', 'Kementerian Ekonomi');
  add('ACC-016', '2026-11-18', 'Immersion session', 'Workshop', '09:00', '13:00', 'Jabatan Kimia');
  // Upcoming follow-ups for items marked ongoing or "to have"
  ev('ACC-003', 1, 'Finetuning iteration review', 'Internal review', '14:30', '15:30', 'AI Team room');
  ev('ACC-019', 2, 'Fact finding session', 'Meeting', '10:00', '12:00', 'KBS');
  ev('ACC-007', 3, 'POC account readiness follow-up', 'Meeting', '11:00', '11:30', 'Online');
  ev('ACC-009', 4, 'JDN JPPCSA meeting (date to confirm)', 'Meeting', '10:00', '12:00', 'JDN');
  ev('ACC-020', 5, 'Fact finding session', 'Meeting', '10:00', '12:00', 'KPN');
  ev('ACC-017', 6, 'Immersion planning', 'Meeting', '15:00', '16:00', 'Online');
  ev('ACC-018', 7, 'Requirement mapping workshop', 'Workshop', '09:30', '12:30', 'KKM');
  ev('ACC-008', 9, 'Lunch & Learn', 'Client demo', '12:30', '14:00', 'PETRA');
  ev('ACC-001', 10, 'Tender status check-in', 'Meeting', '10:00', '10:30', 'Online');
  ev('ACC-009', 12, 'Lunch & Learn', 'Client demo', '12:30', '14:00', 'MOT');
  ev('ACC-017', 14, 'Lunch & Learn', 'Client demo', '12:30', '14:00', 'KUSKOP');
  ev('ACC-023', 15, 'Opportunity discussion', 'Meeting', '10:00', '11:00', 'JPS');
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
      const approver = s.approver === 'AM' ? (a.am || 'u1') : s.approver === 'HM' ? 'u6' : 'u1';
      const requester = s.approver === 'AM' ? (a.devs[0] || 'u1') : (a.am || 'u1');
      const decided = at(p.end);
      a.approvals.push({ stage: id, decision: 'approved', by: approver, at: decided, requestedBy: requester, requestedAt: new Date(new Date(decided) - 86400000).toISOString(), comment: comments[id] || '' });
    }
    a.approvals.sort((x, y) => y.at.localeCompare(x.at));
    a.evidenceBy = a.evidence.map(f => f ? { by: a.pending ? a.pending.by : (a.am || 'u1'), at: a.pending ? a.pending.at : a.stageSince } : null);
  });
  const skm = list.find(a => a.id === 'ACC-011');
  skm.approvals.unshift({ stage: 10, decision: 'closed', by: 'u6', at: daysAgo(20), requestedBy: 'u3', requestedAt: daysAgo(22), reason: 'Other', comment: 'POC ended.' });
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
