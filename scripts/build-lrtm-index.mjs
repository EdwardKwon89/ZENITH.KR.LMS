#!/usr/bin/env node
/**
 * 회귀 테스트 맵 추적 인덱스 자동 생성 — R-09 / IMP-186(B) / Issue #1309 (TASK-1150)
 *
 * 역할:
 *   1. `vitest.config.ts` 범위(`tests/e2e/`, `tests/poc-*` 제외)의 실제 테스트 파일 수·케이스 수 집계
 *   2. `docs/08_Self_Audit/Checklists/lrtm-archive/*.md` 요약 표 생성
 *   3. `docs/08_Self_Audit/Checklists/regression-items/TASK-*.md` 목록 표 생성
 *   4. `docs/08_Self_Audit/Checklists/LIVE_REGRESSION_TEST_MAP.md` 갱신
 *
 * 사용:
 *   node scripts/build-lrtm-index.mjs
 *   npm run build:lrtm
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectVitestFiles, countVitestCases, parseRegressionItem } from './lib/lrtm-parser.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECKLISTS_DIR = join(ROOT, 'docs/08_Self_Audit/Checklists');
const ARCHIVE_DIR = join(CHECKLISTS_DIR, 'lrtm-archive');
const ITEMS_DIR = join(CHECKLISTS_DIR, 'regression-items');
const INDEX_PATH = join(CHECKLISTS_DIR, 'LIVE_REGRESSION_TEST_MAP.md');

const vitestFiles = collectVitestFiles(ROOT);
const totalCases = vitestFiles.reduce((acc, rel) => acc + countVitestCases(join(ROOT, rel)), 0);

const archiveRows = [];
if (existsSync(ARCHIVE_DIR)) {
  const files = readdirSync(ARCHIVE_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();
  for (const f of files) {
    const text = readFileSync(join(ARCHIVE_DIR, f), 'utf8');
    const lines = text.replace(/\n$/, '').split('\n').length;
    const sections = text.split('\n').filter((l) => /^#{2,3}\s+\d+\./.test(l));
    const firstSec = sections[0]?.match(/^#{2,3}\s+(\d+)\./)?.[1] ?? '?';
    const lastSec = sections[sections.length - 1]?.match(/^#{2,3}\s+(\d+)\./)?.[1] ?? '?';
    archiveRows.push({
      file: f,
      range: `§${firstSec} ~ §${lastSec}`,
      sectionsCount: sections.length,
      lines,
    });
  }
}

const itemRows = [];
if (existsSync(ITEMS_DIR)) {
  const files = readdirSync(ITEMS_DIR)
    .filter((f) => /^TASK-.*\.md$/.test(f))
    .sort()
    .reverse();
  for (const f of files) {
    const content = readFileSync(join(ITEMS_DIR, f), 'utf8');
    itemRows.push(parseRegressionItem(`regression-items/${f}`, content));
  }
}

const archiveTable = archiveRows.length
  ? archiveRows
      .map(
        (r) =>
          `| [${r.file}](./lrtm-archive/${r.file}) | ${r.range} (${r.sectionsCount}개 절) | ${r.lines}줄 | 읽기 전용 |`,
      )
      .join('\n')
  : '| _(아카이브 파일 없음)_ | - | - | - |';

const itemsTable = itemRows.length
  ? itemRows
      .map(
        (r) =>
          `| **${r.taskId}** | ${r.issue} | ${r.team} | ${r.date} | ${r.caseCount}건 | ${r.testFiles.map((p) => `\`${p}\``).join(', ') || '-'} | ${r.dimensions.join(', ') || '-'} | [상세](./${r.relPath}) |`,
      )
      .join('\n')
  : '| _(신규 항목 없음)_ | - | - | - | - | - | - | - |';

const output = `# 🗺️ ZENITH_LMS 회귀 테스트 추적 인덱스 (LIVE_REGRESSION_TEST_MAP)

> **문서 용도 (R-09 v3.10, Issue #1309 / TASK-1150)**:
> 본 문서는 **자동 생성 추적 인덱스**입니다. 수동 편집을 금지하며, 신규 회귀 케이스는 \`docs/08_Self_Audit/Checklists/regression-items/TASK-*.md\`에 개별 파일로 등재합니다.
> - **인덱스 재생성**: \`npm run build:lrtm\` (\`scripts/build-lrtm-index.mjs\`)
> - **정합성 점검**: \`npm run check:lrtm\` (\`scripts/check-lrtm-sync.mjs\`)
> - **구 단일 맵(§1~§92) 아카이브**: \`docs/08_Self_Audit/Checklists/lrtm-archive/\` (읽기 전용)

---

## 📊 실측 Vitest 회귀 스위트 현황 (자동 집계)

- **스캔 범위**: \`tests/**/*.{test,spec}.{ts,tsx}\` (\`tests/e2e/**\`, \`tests/poc-*/**\` 제외 — \`vitest.config.ts\` 기준)
- **실측 테스트 파일 수**: **${vitestFiles.length}개**
- **실측 테스트 케이스 수 (\`it\`/\`test\` 블록)**: **${totalCases.toLocaleString()}건**
- **신규 구조 등재 Task 수**: **${itemRows.length}건**

---

## 📚 아카이브 인덱스 (구 단일 맵 분할본 — 읽기 전용)

과거 task file·SAR·문서 231의 \`§N\` 참조 호환을 위해 원형 절 번호를 보존하여 분할 보관합니다.

| 아카이브 파일 | 포함 절 범위 | 줄 수 | 상태 |
|:---|:---|---:|:---:|
${archiveTable}

---

## 📋 신규 Task별 회귀 항목 목록 (\`regression-items/\`)

<!-- LRTM_ITEMS_START -->
| Task | Issue | 팀 | 작성일 | 케이스 수 | 테스트 파일 | 차원(231) | 상세 |
|:---|:---:|:---:|:---:|---:|:---|:---:|:---:|
${itemsTable}
<!-- LRTM_ITEMS_END -->

---

## 📝 R-09 신규 등재 규칙 (옵션 A — PR 충돌 방지)

1. 각 Task PR에서는 [\`regression-items/_TEMPLATE_item.md\`](./regression-items/_TEMPLATE_item.md)를 복사해 \`regression-items/TASK-NNN_IssueNNNN_slug.md\` (Team B는 \`TASK-B-NNN_...\`) 파일 **1개만 추가**합니다.
2. 개별 PR에서 본 인덱스(\`LIVE_REGRESSION_TEST_MAP.md\`)를 직접 수정하지 마세요 (\`npm run check:lrtm\`이 \`regression-items/\`를 직접 스캔하여 정합성을 즉시 검증합니다).
3. \`develop\` 병합 후 \`npm run build:lrtm\`(또는 자동 갱신 PR)으로 본 인덱스를 갱신합니다.
4. \`tests/e2e/**\` 경로를 인용할 때는 같은 행 또는 섹션에 반드시 \`CI 미실행\` 또는 \`수동\` 표기를 포함해야 합니다.
`;

writeFileSync(INDEX_PATH, output, 'utf8');
console.log(
  `LIVE_REGRESSION_TEST_MAP.md 갱신 완료: Vitest ${vitestFiles.length}파일 / ${totalCases}케이스 | 아카이브 ${archiveRows.length}파트 | 신규 항목 ${itemRows.length}건`,
);
