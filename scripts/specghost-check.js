#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function argument(name) {
  const position = process.argv.indexOf(name);
  return position === -1 ? undefined : process.argv[position + 1];
}
function usage() {
  console.log('Usage: node scripts/specghost-check.js --baseline <contract-file> --candidate <contract-file>');
}
function read(file) {
  if (!file) return '';
  return fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
}
function diff(baseline, candidate) {
  const changes = [];
  for (const field of ['dueDate', 'title', 'description', 'status', 'priority']) {
    const before = baseline.match(new RegExp(`${field}[^\\n]*`, 'i'))?.[0] || '';
    const after = candidate.match(new RegExp(`${field}[^\\n]*`, 'i'))?.[0] || '';
    if (before && !after) changes.push({ level:'BLOCK', field, message:`${field} was removed from the contract.` });
    else if (/optional/i.test(before) && /required/i.test(after)) changes.push({ level:'BLOCK', field, message:`${field} changed from optional to required.` });
    else if (before && after && before !== after) changes.push({ level:'REVIEW', field, message:`${field} behavior changed.` });
    else if (!before && after) changes.push({ level:'REVIEW', field, message:`${field} was introduced; validate the default behavior.` });
  }
  return changes;
}

const baselineFile = argument('--baseline');
const candidateFile = argument('--candidate');
if (!baselineFile || !candidateFile) { usage(); process.exit(2); }
let changes;
try { changes = diff(read(baselineFile), read(candidateFile)); }
catch (error) { console.error(`SpecGhost could not read a contract: ${error.message}`); process.exit(2); }

const blocked = changes.some(change => change.level === 'BLOCK');
const decision = blocked ? 'BLOCK' : changes.length ? 'REVIEW' : 'PASS';
console.log(`\nSpecGhost merge gate: ${decision}`);
if (!changes.length) console.log('✓ No semantic contract behavior changes detected.');
for (const change of changes) console.log(`${change.level === 'BLOCK' ? '✕' : '!'} ${change.level} ${change.field}: ${change.message}`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const summary = [`# SpecGhost Contract Gate`, ``, `## ${decision}`, ``, changes.length ? '| Level | Field | Finding |\n| --- | --- | --- |\n' + changes.map(c => `| ${c.level} | ${c.field} | ${c.message} |`).join('\n') : 'No semantic behavior changes detected.'].join('\n');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}
if (blocked) process.exitCode = 1;
