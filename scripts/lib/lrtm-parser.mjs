import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

export const TEST_PATH_RE =
  /tests\/[A-Za-z0-9_.\-/]+\.(?:test|spec)\.[tj]sx?|tests\/e2e\/[A-Za-z0-9_.\-/]+\.spec\.ts/g;

export function extractTestPaths(text) {
  return [...new Set(text.match(TEST_PATH_RE) || [])];
}

export function collectVitestFiles(rootDir) {
  const testsRoot = join(rootDir, 'tests');
  if (!existsSync(testsRoot)) return [];
  const out = [];

  function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      const rel = relative(rootDir, p).split('\\').join('/');
      if (e.isDirectory()) {
        if (rel === 'tests/e2e' || /^tests\/poc-[^/]+$/.test(rel)) continue;
        walk(p);
      } else if (/\.(?:test|spec)\.[tj]sx?$/.test(e.name)) {
        out.push(rel);
      }
    }
  }

  walk(testsRoot);
  return out.sort();
}

export function countVitestCases(fileAbs) {
  const src = readFileSync(fileAbs, 'utf8');
  const matches = src.match(/\b(?:it|test)(?:\.(?:only|skip|todo|concurrent|sequential))?\s*\(/g) || [];
  return matches.length;
}

export function parseRegressionItem(relPath, content) {
  const lines = content.split(/\r?\n/);
  const titleLine = lines.find((l) => l.startsWith('# ')) || '';
  const title = titleLine.replace(/^#\s+/, '').trim();

  const metaValue = (labelRe) => {
    for (const l of lines) {
      if (!l.trim().startsWith('|')) continue;
      const cells = l.split('|').map((c) => c.trim());
      if (cells.length >= 3 && labelRe.test(cells[1])) {
        return cells[2];
      }
    }
    return '';
  };

  const taskIssueRaw = metaValue(/Task\s*\/\s*Issue/i);
  const teamDateRaw = metaValue(/팀\s*\/\s*작성일/i);
  const modulesRaw = metaValue(/대상\s*모듈/i);
  const dimensionsRaw = metaValue(/검증\s*차원/i);

  const taskMatch = taskIssueRaw.match(/TASK-(?:[A-Z]-)?\d+/) || relPath.match(/TASK-(?:[A-Z]-)?\d+/);
  const taskId = taskMatch ? taskMatch[0] : relPath;
  const issueMatch = taskIssueRaw.match(/#\d+/);
  const issue = issueMatch ? issueMatch[0] : '-';

  const teamMatch = teamDateRaw.match(/Team\s+[A-Z]/i);
  const team = teamMatch ? teamMatch[0] : '-';
  const dateMatch = teamDateRaw.match(/\d{4}-\d{2}-\d{2}/);
  const date = dateMatch ? dateMatch[0] : '-';

  const modules = [...modulesRaw.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  const dimensions = [...new Set(dimensionsRaw.match(/D[1-9]/g) || [])];

  const caseIds = [];
  const e2eLinesWithoutNote = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim().startsWith('|')) {
      const cells = l.split('|').map((c) => c.trim());
      if (cells.length >= 3 && /^TC-[A-Za-z0-9_-]+/.test(cells[1])) {
        caseIds.push(cells[1].replace(/\*\*/g, ''));
      }
    }
    if (/tests\/e2e\//.test(l) && !/CI\s*미실행|수동/.test(l)) {
      e2eLinesWithoutNote.push({ line: i + 1, text: l.trim() });
    }
  }

  const testFiles = extractTestPaths(content);

  return {
    taskId,
    issue,
    team,
    date,
    modules,
    dimensions,
    testFiles,
    caseIds,
    caseCount: caseIds.length,
    title,
    relPath,
    hasE2e: testFiles.some((f) => f.startsWith('tests/e2e/')),
    e2eLinesWithoutNote,
  };
}
