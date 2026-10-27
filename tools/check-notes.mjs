import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export function proseLines(text) {
  let fence;
  const lines = text.split(/\r?\n/).map((text, index) => {
    const marker = text.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] &&
               marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
      return { text: '', line: index + 1 };
    }
    return { text: fence ? '' : text, line: index + 1 };
  });
  if (fence) throw new SyntaxError('Unclosed Markdown code fence');
  return lines;
}

export function markdownLinks(text) {
  const links = [];
  for (const { text: line, line: number } of proseLines(text)) {
    const starts = line.matchAll(/!?\[[^\]\n]*\]\(/g);
    for (const match of starts) {
      const start = match.index + match[0].length;
      let end = start;
      let depth = 1;
      let angled = false;
      for (; end < line.length; end++) {
        const char = line[end];
        if (char === '\\') { end++; continue; }
        if (end === start && char === '<') angled = true;
        if (char === '>' && angled) angled = false;
        if (angled) continue;
        if (char === '(') depth++;
        if (char === ')' && --depth === 0) break;
      }
      if (depth !== 0) continue;
      const raw = line.slice(start, end).trim();
      const destination = raw.startsWith('<')
        ? raw.slice(1, raw.indexOf('>'))
        : raw.split(/\s+["']/)[0];
      links.push({ destination, line: number });
    }
    const definition = line.match(/^ {0,3}\[[^\]]+\]:\s*(<[^>]+>|\S+)/);
    if (definition) {
      links.push({ destination: definition[1].replace(/^<|>$/g, ''), line: number });
    }
  }
  return links;
}

export function headingIds(text) {
  const ids = new Set();
  for (const { text: line } of proseLines(text)) {
    for (const match of line.matchAll(/<(?:a|h[1-6])\b[^>]*\b(?:id|name)=["']([^"']+)["']/gi)) {
      ids.add(match[1]);
    }
    const heading = line.match(/^ {0,3}#{1,6}\s+(.+?)(?:\s+#+)?\s*$/);
    if (!heading) continue;
    const slug = heading[1]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, '')
      .replace(/\s/g, '-');
    let id = slug;
    let suffix = 0;
    while (ids.has(id)) id = `${slug}-${++suffix}`;
    ids.add(id);
  }
  return ids;
}

export function checkNotes(root, files) {
  const issues = [];
  const anchors = new Map();
  let checkedLinks = 0;
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    let links;
    try {
      links = markdownLinks(text);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      issues.push(`${relative(root, file)}: ${error.message}`);
      continue;
    }
    for (const { destination, line } of links) {
      if (!destination || destination.includes('<NN>') || destination === 'YOUTUBE_URL') continue;
      if (/^(?:https?:|mailto:|data:|\/\/)/i.test(destination)) continue;
      checkedLinks++;
      const location = `${relative(root, file)}:${line}`;
      if (/^(?:file:|\/|[A-Za-z]:[\\/])/i.test(destination)) {
        issues.push(`${location}: nonportable path ${destination}`);
        continue;
      }
      if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(destination)) continue;
      const hash = destination.indexOf('#');
      const rawPath = (hash < 0 ? destination : destination.slice(0, hash)).split('?')[0];
      let path;
      let fragment;
      try {
        path = decodeURIComponent(rawPath);
        fragment = hash < 0 ? '' : decodeURIComponent(destination.slice(hash + 1));
      } catch (error) {
        if (!(error instanceof URIError)) throw error;
        issues.push(`${location}: invalid URL encoding ${destination}`);
        continue;
      }
      let target = path ? resolve(dirname(file), path) : file;
      if (!existsSync(target)) {
        issues.push(`${location}: missing target ${destination}`);
        continue;
      }
      let cursor = root;
      let exactCase = true;
      for (const part of relative(root, target).split(sep).filter(Boolean)) {
        if (part !== '..' && !readdirSync(cursor).includes(part)) {
          exactCase = false;
          break;
        }
        cursor = resolve(cursor, part);
      }
      if (!exactCase) {
        issues.push(`${location}: path case mismatch ${destination}`);
        continue;
      }
      if (statSync(target).isDirectory()) {
        const readme = ['README.md', 'Readme.md', 'readme.md']
          .map(name => resolve(target, name)).find(existsSync);
        if (!readme && fragment) issues.push(`${location}: no directory README for ${destination}`);
        if (!readme) continue;
        target = readme;
      }
      if (fragment && /\.md$/i.test(target)) {
        if (!anchors.has(target)) {
          try {
            anchors.set(target, headingIds(readFileSync(target, 'utf8')));
          } catch (error) {
            if (!(error instanceof SyntaxError)) throw error;
            issues.push(`${location}: ${relative(root, target)}: ${error.message}`);
            continue;
          }
        }
        if (!anchors.get(target).has(fragment)) {
          issues.push(`${location}: missing heading ${destination}`);
        }
      }
    }
  }
  return { markdownFiles: files.length, checkedLinks, issues };
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const names = execFileSync('git', ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' });
  const files = [...new Set(names.split('\0').filter(name => /\.md$/i.test(name)))]
    .map(name => resolve(root, name));
  const result = checkNotes(root, files);
  const args = process.argv.slice(2);
  if (args.length) {
    if (args.length !== 2 || args[0] !== '--json' || isAbsolute(args[1]) === false) {
      throw new Error('Usage: node tools/check-notes.mjs [--json /absolute/report.json]');
    }
    writeFileSync(args[1], `${JSON.stringify(result, null, 2)}\n`);
  }
  console.log(`Checked ${result.markdownFiles} Markdown files and ${result.checkedLinks} local links.`);
  for (const issue of result.issues.slice(0, 30)) console.error(issue);
  if (result.issues.length > 30) console.error(`${result.issues.length - 30} more issues; use --json for details.`);
  console.log(`${result.issues.length} documentation link issue(s).`);
  process.exitCode = result.issues.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
