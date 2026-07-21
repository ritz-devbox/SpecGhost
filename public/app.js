const $ = selector => document.querySelector(selector);
const demoSpec = $('#spec').value;
const activityKey = 'specghost-contract-history';
const versionsKey = 'specghost-contract-versions';
let latestCode = '';
let latestDiff = null;
let latestRun = null;
let latestReview = null;

function escape(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c])); }
function timeNow() { return new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); }
function storage(key) { return JSON.parse(localStorage.getItem(key) || '[]'); }
function saveStorage(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

function addEvent(title, detail, accent = 'lime') {
  const events = storage(activityKey);
  events.unshift({ title, detail, accent, time:timeNow() });
  saveStorage(activityKey, events.slice(0, 8));
  renderHistory();
}
function renderHistory() {
  const baseline = { title:'TaskFlow contract loaded', detail:'Baseline promises are ready to inspect.', accent:'lime', time:'now' };
  $('#activity-feed').innerHTML = [baseline, ...storage(activityKey)].map(event => `<div class="event"><i class="event-dot" style="background:${event.accent === 'red' ? 'var(--red)' : event.accent === 'amber' ? '#ffc35c' : 'var(--lime)'}"></i><div><strong>${escape(event.title)}</strong><p>${escape(event.detail)}</p></div><time>${event.time}</time></div>`).join('');
}
function renderVersions() { $('#version-count').textContent = `${storage(versionsKey).length} saved`; }
function renderAnalysis(data) {
  $('#summary').textContent = data.summary;
  $('#model-status').textContent = data.source || 'Analysis ready';
  $('#promise-count').textContent = String(data.promises.length).padStart(2, '0');
  $('#promise-list').innerHTML = data.promises.map(p => `<div class="promise"><strong>${escape(p.title)}</strong><span class="risk ${p.risk.toLowerCase()}">${p.risk} RISK</span><p>${escape(p.impact)}</p></div>`).join('');
}
async function api(path, payload) {
  const response = await fetch(path, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'Request failed');
  return data;
}
async function analyze() {
  const button = $('#analyze'); button.disabled = true; button.textContent = 'Reading the contract…';
  try { const data = await api('/api/analyze', {spec:$('#spec').value}); renderAnalysis(data); addEvent('Contract intent analyzed', `${data.promises.length} behavioral promises discovered.`); }
  catch (error) { $('#model-status').textContent = 'Analysis unavailable: ' + error.message; }
  finally { button.disabled = false; button.innerHTML = '<span>✦</span> Analyze intent'; }
}
async function forge() {
  const button = $('#forge'); button.disabled = true; button.textContent = 'Forging suite…';
  try {
    const data = await api('/api/forge', {spec:$('#spec').value}); latestCode = data.code;
    $('#suite-name').textContent = data.suite; $('#forge-source').textContent = data.source.includes('GPT') ? 'GPT-5.6' : 'DEMO';
    $('#test-list').innerHTML = data.tests.map(test => `<div class="test"><i class="test-check">✓</i><div><strong>${escape(test.name)}</strong><small>${escape(test.kind)}</small></div><span>${escape(test.status)}</span></div>`).join('');
    $('#code-file').textContent = data.suite; $('#test-code').textContent = data.code;
    addEvent('Behavioral test suite forged', `${data.tests.length} runnable contract checks are ready.`);
  } catch (error) { $('#forge-source').textContent = 'ERROR'; addEvent('Test forge unavailable', error.message, 'red'); }
  finally { button.disabled = false; button.innerHTML = '<span>✦</span> Forge test suite'; }
}
function renderDiff(diff) {
  latestDiff = diff;
  const riskClass = diff.risk >= 60 ? 'high' : diff.risk >= 30 ? 'medium' : 'safe';
  $('#risk-orb').className = `risk-orb ${riskClass}`; $('#risk-number').textContent = diff.risk;
  $('#verdict').className = `verdict ${riskClass}`;
  $('#verdict').innerHTML = `<span>${escape(diff.verdict)}</span><strong>${diff.consumers ? `${diff.consumers} consumers at risk` : 'No consumer break found'}</strong><p>${diff.risk >= 60 ? 'Do not ship without restoring the promise or communicating a migration.' : diff.risk >= 30 ? 'Review the behavioral impact before approving this release.' : 'Protected promises remain consistent across these versions.'}</p>`;
  $('#change-list').innerHTML = diff.changes.map(change => `<div class="change"><span class="severity ${change.severity.toLowerCase()}">${change.severity} RISK</span><div><strong>${escape(change.title)}</strong><p>${escape(change.detail)}</p><small>→ ${escape(change.action)}</small></div></div>`).join('');
  $('#pack-copy').textContent = `${diff.verdict}: ${diff.changes.length} behavioral change${diff.changes.length === 1 ? '' : 's'} analyzed, with a test and remediation path ready.`;
}
async function compare() {
  const button = $('#compare'); button.disabled = true; button.textContent = 'Comparing…';
  try { const data = await api('/api/diff', {baseline:$('#baseline').value, candidate:$('#candidate').value}); renderDiff(data); addEvent('Release diff completed', `${data.verdict} · risk score ${data.risk}.`, data.risk >= 60 ? 'red' : data.risk >= 30 ? 'amber' : 'lime'); }
  catch (error) { addEvent('Contract diff unavailable', error.message, 'red'); }
  finally { button.disabled = false; button.innerHTML = '<span>✦</span> Compare contracts'; }
}
function renderRun(run) {
  latestRun = run;
  $('#run-results').innerHTML = `<div class="run-empty">${escape(run.mode)} · ${escape(run.target)}</div>` + run.results.map(result => `<div class="run ${result.status.toLowerCase()}"><i></i><div><strong>${escape(result.name)}</strong><p>${escape(result.detail)}</p></div><span>${escape(result.status)}</span></div>`).join('');
}
async function runChecks() {
  const button = $('#run-checks'); button.disabled = true; button.textContent = 'Running…';
  try { const data = await api('/api/run', {target:$('#target-url').value.trim()}); renderRun(data); addEvent('Contract checks completed', `${data.results.filter(r => r.status === 'PASS').length}/${data.results.length} checks passed.`, data.reachable ? 'lime' : 'red'); }
  catch (error) { addEvent('Check runner unavailable', error.message, 'red'); }
  finally { button.disabled = false; button.textContent = 'Run checks'; }
}
function regression(enabled) {
  const change = $('#change'), result = $('#result');
  if (enabled) {
    change.className='red'; change.textContent='// removed'; result.className='result broken';
    $('#result-title').textContent='Behavioral regression caught'; $('#result-copy').textContent='PATCH now rejects quick updates that omit dueDate—even though the endpoint may still return 200 elsewhere.';
    $('#status-pill').textContent='1 / 3 failing'; $('#confidence').textContent='58'; $('#meter').style.width='58%'; $('#meter').style.background='var(--red)';
    $('#affected').textContent='4 downstream consumers'; $('#impact-copy').textContent='Quick-add, CSV import, mobile edit, and calendar sync now fail for users without a due date.'; $('#fix').textContent='dueDate: z.string().datetime().optional(),';
    document.querySelectorAll('.consumer').forEach(node => node.style.borderColor='var(--red)'); addEvent('Regression simulated', 'Optional dueDate removed; four consumers are at risk.', 'red');
  } else {
    change.className='green'; change.textContent='.optional()'; result.className='result safe'; $('#result-title').textContent='Contract intact'; $('#result-copy').textContent='All behavioral promises hold. Ship with confidence.';
    $('#status-pill').textContent='3 / 3 passing'; $('#confidence').textContent='92'; $('#meter').style.width='92%'; $('#meter').style.background='var(--lime)'; $('#affected').textContent='0 downstream consumers'; $('#impact-copy').textContent='SpecGhost connects a technical change to the humans and workflows it interrupts.'; $('#fix').textContent='No action required.';
    document.querySelectorAll('.consumer').forEach(node => node.style.borderColor='#414756');
  }
}
function reportMarkdown() {
  const diff = latestDiff || {verdict:'NOT ANALYZED',risk:'—',consumers:'—',changes:[]};
  const run = latestRun || {mode:'NOT RUN',target:'Not run',results:[]};
  return `# SpecGhost Release Report\n\n## Decision\n**${diff.verdict}** · Risk score: **${diff.risk}/100** · Consumers at risk: **${diff.consumers}**\n\n## Behavioral changes\n${diff.changes.length ? diff.changes.map(c => `- **${c.severity}** — ${c.title}: ${c.detail}\n  - Action: ${c.action}`).join('\n') : '- No semantic diff has been run.'}\n\n## Contract checks\nTarget: ${run.target} (${run.mode})\n${run.results.length ? run.results.map(r => `- **${r.status}** — ${r.name}: ${r.detail}`).join('\n') : '- No checks run.'}\n\n## Suggested patch\n\`\`\`ts\n${$('#fix').textContent}\n\`\`\`\n\nGenerated by SpecGhost — Behavioral Contract Guard.`;
}
async function copy(text, button) { await navigator.clipboard?.writeText(text); const initial=button.textContent; button.textContent='Copied'; setTimeout(() => button.textContent=initial,1200); }
function downloadReport() { const blob=new Blob([reportMarkdown()],{type:'text/markdown'}); const link=document.createElement('a'); link.href=URL.createObjectURL(blob); link.download='specghost-release-report.md'; link.click(); URL.revokeObjectURL(link.href); addEvent('Release report exported', 'Markdown handoff pack downloaded.'); }
function saveVersion() { const versions=storage(versionsKey); versions.unshift({name:`TaskFlow v${versions.length + 1}`,contract:$('#candidate').value,created:timeNow()}); saveStorage(versionsKey,versions.slice(0,10)); renderVersions(); addEvent('Version saved', `${versions[0].name} added to the local library.`); }
function loadSnapshot() { const version=storage(versionsKey)[0]; if (version) { $('#candidate').value=version.contract; addEvent('Version loaded', `${version.name} loaded as the proposed contract.`); } else addEvent('No saved version yet', 'Save the current proposed contract to create one.', 'amber'); }
function renderReview(review) {
  latestReview = review;
  const state = review.severity.toLowerCase();
  $('#review-state').className = `review-state ${state}`;
  $('#review-state').innerHTML = `<span>${escape(review.severity)} MERGE</span><strong>${escape(review.summary)}</strong><p>Evidence supplied by ${escape(review.source)}.</p>`;
  $('#evidence-list').innerHTML = review.evidence.map(item => `<div class="evidence"><div class="evidence-top"><span>${escape(item.file)}:${escape(item.line)}</span><span>${escape(item.promise)}</span></div>${item.before ? `<code><del>- ${escape(item.before)}</del><br><ins>+ ${escape(item.after)}</ins></code>` : ''}<p>This line changes the promise: <b>${escape(item.promise)}</b>.</p></div>`).join('');
  $('#persona-count').textContent = `${review.personas.length} replay${review.personas.length === 1 ? '' : 's'}`;
  $('#persona-list').innerHTML = review.personas.map(persona => `<div class="persona ${persona.state.toLowerCase()}"><i class="persona-avatar">${escape(persona.name[0])}</i><div><strong>${escape(persona.name)} · ${escape(persona.role)}</strong><small>${escape(persona.impact)}</small></div><span>${escape(persona.state)}</span></div>`).join('');
}
async function reviewPR() {
  const button = $('#review-pr'); button.disabled = true; button.textContent = 'Reviewing diff…';
  try { const data = await api('/api/review', {diff:$('#pr-diff').value}); renderReview(data); addEvent('PR review completed', `${data.severity} · ${data.personas.length} user journey replays.`, data.severity === 'BLOCK' ? 'red' : data.severity === 'REVIEW' ? 'amber' : 'lime'); }
  catch (error) { addEvent('PR review unavailable', error.message, 'red'); }
  finally { button.disabled = false; button.innerHTML = '<span>✦</span> Review pull request'; }
}

$('#analyze').onclick=analyze; $('#forge').onclick=forge; $('#compare').onclick=compare; $('#run-checks').onclick=runChecks;
$('#review-pr').onclick=reviewPR;
$('#regression').onchange=event=>regression(event.target.checked); $('#copy-fix').onclick=()=>copy($('#fix').textContent,$('#copy-fix')); $('#copy-code').onclick=()=>latestCode&&copy(latestCode,$('#copy-code'));
$('#save-snapshot').onclick=()=>addEvent('Snapshot saved','TaskFlow contract snapshot saved to this browser.'); $('#save-version').onclick=saveVersion; $('#load-snapshot').onclick=loadSnapshot; $('#use-current').onclick=()=>{ $('#baseline').value=$('#spec').value; addEvent('Baseline updated','Current working contract loaded into the baseline.'); };
$('#copy-report').onclick=()=>copy(reportMarkdown(),$('#copy-report')); $('#download-report').onclick=downloadReport;
$('#copy-comment').onclick=()=>copy(latestReview ? latestReview.comment : 'Run SpecGhost PR Review Copilot to generate a merge-gate comment.', $('#copy-comment'));
$('#copy-yaml').onclick=()=>copy($('#ci-yaml').textContent,$('#copy-yaml'));
$('#load-demo-diff').onclick=()=>{ $('#pr-diff').value=`diff --git a/src/schemas/task.schema.ts b/src/schemas/task.schema.ts\n- dueDate: z.string().datetime().optional(),\n+ dueDate: z.string().datetime(),`; addEvent('Demo PR diff loaded','A required-field regression is ready for review.'); };
$('#clear-history').onclick=()=>{ localStorage.removeItem(activityKey); renderHistory(); }; $('#reset').onclick=()=>{ $('#spec').value=demoSpec; $('#regression').checked=false; regression(false); analyze(); };
renderHistory(); renderVersions(); analyze();
