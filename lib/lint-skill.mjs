// Validates every bundled stack pack against the shared Agent Skills constraints
// that both Claude Code and opencode enforce, plus the common/stack merge rules.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, basename, relative } from 'node:path';
import { bundledCommonDir, bundledStackDir, bundledStackIds } from './assets.mjs';

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
}

function listFiles(dir, base = dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...listFiles(p, base));
    else out.push(relative(base, p).replaceAll('\\', '/'));
  }
  return out;
}

function lintSkillMd(skillDir) {
  const dirName = basename(skillDir);
  const skillMd = join(skillDir, 'SKILL.md');
  if (!existsSync(skillMd)) {
    fail(`${dirName}: missing SKILL.md`);
    return;
  }
  const raw = readFileSync(skillMd, 'utf8');

  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) {
    fail(`${dirName}: SKILL.md has no YAML frontmatter block.`);
    return;
  }
  const body = fm[1];
  const nameLine = body.match(/^name:\s*(.+)$/m);
  const descLine = body.match(/^description:\s*([\s\S]+?)(?:\n[a-z_]+:|$)/m);

  let ok = true;
  if (!nameLine) {
    fail(`${dirName}: missing required frontmatter field: name`);
    ok = false;
  } else {
    const name = nameLine[1].trim();
    if (!NAME_RE.test(name)) {
      fail(`${dirName}: name "${name}" must be kebab-case (^[a-z0-9]+(-[a-z0-9]+)*$).`);
      ok = false;
    }
    if (name !== dirName) {
      fail(`${dirName}: name "${name}" must match the skill directory "${dirName}".`);
      ok = false;
    }
  }

  if (!descLine) {
    fail(`${dirName}: missing required frontmatter field: description`);
    ok = false;
  } else {
    const desc = descLine[1].replace(/\s+/g, ' ').trim();
    if (desc.length < 1 || desc.length > 1024) {
      fail(`${dirName}: description must be 1–1024 chars (got ${desc.length}).`);
      ok = false;
    }
  }

  if (ok) console.log(`✓ ${dirName}: SKILL.md valid.`);
}

const commonDir = bundledCommonDir();
const commonFiles = listFiles(commonDir);

// The common layer is a fragment merged under each stack, so it must never
// carry its own SKILL.md — each stack pack owns that file.
if (commonFiles.includes('SKILL.md')) {
  fail('common/: must not contain a SKILL.md (it belongs to each stack pack).');
}
console.log(`• common layer: ${commonFiles.length} file(s).`);

const stacks = bundledStackIds();
if (!stacks.length) fail('No bundled stack packs found under assets/stacks/.');

for (const stack of stacks) {
  const stackDir = bundledStackDir(stack);
  lintSkillMd(stackDir);
  const overrides = listFiles(stackDir).filter((f) => commonFiles.includes(f));
  if (overrides.length) {
    console.log(`  ${stack}: overrides ${overrides.length} common file(s): ${overrides.join(', ')}`);
  }
}

if (!process.exitCode) {
  console.log(`\n✓ All ${stacks.length} bundled stack pack(s) valid.`);
}
