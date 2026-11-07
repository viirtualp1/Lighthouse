/**
 * Writes the notes for a release from the commits since the previous one, grouped for someone reading the
 * release page: what is new, what was fixed, what else changed. Commit bodies keep their bullet details.
 *
 * Usage: bun scripts/release-notes.ts <previous-tag-or-empty> <output-file>
 * GitHub adds the "Full Changelog" compare link under these notes itself.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

interface Commit {
  type: string;
  subject: string;
  details: string[];
}

const FIELD = '\u001f';
const RECORD = '\u001e';

const SECTIONS = [
  { title: 'New', types: ['feat'] },
  { title: 'Fixes', types: ['fix'] },
  { title: 'Other changes', types: ['perf', 'refactor', 'style', 'chore', 'ci', 'build', 'docs', 'test', ''] }
];

/** Lines that describe the commit, not the change: attribution and the like. */
const NOISE = /^(Co-Authored-By|Signed-off-by):/i;

function git (...args: string[]) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function parse (raw: string): Commit {
  const [subjectLine = '', body = ''] = raw.split(FIELD);
  const match = /^(\w+)(?:\([^)]*\))?!?:\s*(.+)$/.exec(subjectLine.trim());
  const type = match?.[1]?.toLowerCase() ?? '';
  const text = (match?.[2] ?? subjectLine).trim();

  return { type, subject: capitalise(text), details: bullets(body) };
}

/** Bullet points from a commit body; a bullet that wraps onto indented lines is joined back into one. */
function bullets (body: string) {
  const items: string[] = [];

  for (const line of body.split('\n')) {
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);

    if (bullet?.[1] !== undefined) {
      items.push(bullet[1].trim());
    } else if (/^\s+\S/.test(line) && items.length) {
      items[items.length - 1] += ` ${line.trim()}`;
    }
  }

  if (items.length) {
    return items.filter(item => !NOISE.test(item));
  }

  // No bullet list: the first paragraph of prose is the description.
  const paragraph = body.split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).find(p => p && !NOISE.test(p));

  return paragraph ? [paragraph] : [];
}

/** Uppercase the first letter, unless the first word already has its own casing (macOS, iPad, GitHub). */
function capitalise (text: string) {
  const first = text.split(/\s/)[0] ?? '';

  return /[A-Z]/.test(first) ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

function render (commits: Commit[]) {
  const parts: string[] = [];

  for (const section of SECTIONS) {
    const items = commits.filter(c => section.types.includes(c.type));

    if (!items.length) {
      continue;
    }

    parts.push(`## ${section.title}\n`);

    for (const item of items) {
      parts.push(`- **${item.subject}**`);
      item.details.forEach(detail => parts.push(`  - ${detail}`));
    }

    parts.push('');
  }

  if (!parts.length) {
    parts.push('No changes to the game since the previous release.');
  }

  return `${parts.join('\n').trim()}\n`;
}

function main () {
  const [previous = '', output = 'release-notes.md'] = process.argv.slice(2);
  const range = previous ? `${previous}..HEAD` : 'HEAD';
  const raw = git('log', range, `--format=%s${FIELD}%b${RECORD}`, '--no-merges');

  const commits = raw
    .split(RECORD)
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(parse);

  writeFileSync(output, render(commits));
}

main();
