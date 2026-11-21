// TASK-B-360 ⒝-2 (Issue #1366) — 청구서 Excel 워크북 빌더 (An_17 부록 A v1.0)
//   §2 파일 구성(시트 2개·파일명) · §3 시트① 요약 · §4 시트② 오더별 상세(열 정의 배열)
//   §5 인쇄 설정(구조 단언 대상) · §6 서식 규칙 · §7 오류·보안
// 라벨은 EXCEL_LABELS 한 곳에 모아 둔다(§2 — 후속 다국어화 대비).

import ExcelJS from 'exceljs';
import { logger } from '@/lib/logger';
import { loadStatementExport } from './statement-excel-data';
import type { StatementExportData, StatementExportHeader, StatementExportRow } from './statement-excel-data';

export const SHEET_SUMMARY = '청구서';
export const SHEET_DETAIL = '오더별 상세';

/** 금액 표시 형식 — 음수는 괄호가 아니라 `-` (§6, 조정 청구서 대비) */
const MONEY_FMT = '#,##0.00;-#,##0.00';
const WEIGHT_FMT = '#,##0.00';
const DATE_FMT = 'yyyy-mm-dd';
const FONT = '맑은 고딕';

/** 한국어 라벨 상수 (§2 — 한 곳에 모아 두어 다국어화 용이) */
export const EXCEL_LABELS = {
  title: '청  구  서',
  draftBanner: '초안 — 발행 전 문서',
  draftPrefix: '[초안] ',
  statementNo: '청구서 번호',
  issuedAt: '발행일',
  period: '청구 기간',
  round: '차수',
  supplier: '공급자 (청구하는 쪽)',
  recipientBlock: '공급받는자 (청구 대상)',
  name: '상호',
  bizNo: '사업자번호',
  repName: '대표자',
  address: '주소',
  contact: '담당 / 연락처',
  summaryHead: '청구 내역 요약',
  colLabel: '구분',
  amountLabel: '금액(원)',
  baseFreight: '기본운임',
  fuelSurcharge: '유류할증료',
  surgeFee: '할증료(서지)',
  otherCharges: '기타 비용',
  supplyTotal: '공급가액 합계',
  vatNote: '※ 부가가치세 별도 (세금계산서는 별도 발행)',
  itemCount: (n: number) => `오더 건수 ${n}건`,
  totalWeight: (kg: number) => `총 청구중량 ${kg.toFixed(2)} kg`,
  statusLabel: '상태',
  statusText: { DRAFT: '초안', ISSUED: '발행됨', CLOSED: '입금완료' } as Record<string, string>,
  paidInfo: (date: string, amount: string) => `입금 확인 ${date} / 입금액 ${amount}`,
  noItems: '항목 없음',
  totalRow: '합계',
  detailTitle: '오더별 상세',
  fileNamePrefix: '청구서',
  detailCols: {
    no: 'No',
    orderNo: '오더번호',
    tracking: '운송장번호',
    basisDate: '기준일',
    shipperName: '화주명',
    recipient: '수하인',
    country: '도착국가',
    weight: '청구중량(kg)',
    baseFreight: '기본운임',
    fuelSurcharge: '유류할증료',
    surgeFee: '할증료',
    otherCharges: '기타',
    lineTotal: '합계',
  },
} as const;

const L = EXCEL_LABELS;

// ───────────────────────────────────────────── 시트 ② 열 정의 배열 (§4)

export interface DetailColumn {
  key: keyof typeof L.detailCols;
  width: number;
  align: 'left' | 'center' | 'right';
  numFmt?: string;
  bold?: boolean;
}

/** 화주명 열 제외 기본 11열 — ADMIN_TO_AGENCY는 화주명 1개 추가(총 12열). 열 문자는 배열 길이에서 계산(하드코딩 금지) */
const BASE_DETAIL_COLUMNS: DetailColumn[] = [
  { key: 'no', width: 5, align: 'center' },
  { key: 'orderNo', width: 17, align: 'left' },
  { key: 'tracking', width: 22, align: 'left' },
  { key: 'basisDate', width: 12, align: 'center', numFmt: DATE_FMT },
  { key: 'recipient', width: 16, align: 'left' },
  { key: 'country', width: 9, align: 'center' },
  { key: 'weight', width: 11, align: 'right', numFmt: WEIGHT_FMT },
  { key: 'baseFreight', width: 14, align: 'right', numFmt: MONEY_FMT },
  { key: 'fuelSurcharge', width: 14, align: 'right', numFmt: MONEY_FMT },
  { key: 'surgeFee', width: 14, align: 'right', numFmt: MONEY_FMT },
  { key: 'otherCharges', width: 14, align: 'right', numFmt: MONEY_FMT },
  { key: 'lineTotal', width: 15, align: 'right', numFmt: MONEY_FMT, bold: true },
];
const SHIPPER_COLUMN: DetailColumn = { key: 'shipperName', width: 16, align: 'left' };

export function detailColumns(includeShipper: boolean): DetailColumn[] {
  if (!includeShipper) return [...BASE_DETAIL_COLUMNS];
  // 화주명은 기준일(D) 다음 열(§4-E) — 배열 삽입으로 위치 결정
  const cols = [...BASE_DETAIL_COLUMNS];
  cols.splice(4, 0, SHIPPER_COLUMN);
  return cols;
}

/** 열 정의 배열 → 인쇄 영역 마지막 열 문자 (12열=L, 13열=M) */
export function columnLetter(colCount: number): string {
  return String.fromCharCode(64 + colCount);
}

// ───────────────────────────────────────────── 스타일 (§6)

interface CellStyle {
  font?: Partial<ExcelJS.Font>;
  alignment?: Partial<ExcelJS.Alignment>;
  fill?: ExcelJS.Fill;
  border?: Partial<ExcelJS.Borders>;
}

const STYLES: Record<string, CellStyle> = {
  title: { font: { name: FONT, size: 18, bold: true }, alignment: { horizontal: 'center', vertical: 'middle' } },
  draft: { font: { name: FONT, size: 10, color: { argb: 'FFFF0000' } }, alignment: { horizontal: 'center' } },
  label: { font: { name: FONT, size: 10, bold: true }, alignment: { horizontal: 'left', vertical: 'middle' } },
  value: { font: { name: FONT, size: 10 }, alignment: { horizontal: 'left', vertical: 'middle' } },
  blockHead: {
    font: { name: FONT, size: 10, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7ECF3' } },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: { bottom: { style: 'thin' } },
  },
  head: {
    font: { name: FONT, size: 10, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7ECF3' } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
  },
  money: { font: { name: FONT, size: 10 }, alignment: { horizontal: 'right', vertical: 'middle' } },
  totalMoney: {
    font: { name: FONT, size: 14, bold: true },
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: { top: { style: 'double' } },
  },
  totalLabel: {
    font: { name: FONT, size: 14, bold: true },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: { top: { style: 'double' } },
  },
  note: { font: { name: FONT, size: 9 }, alignment: { horizontal: 'left' } },
  meta: { font: { name: FONT, size: 10 }, alignment: { horizontal: 'left', vertical: 'middle' } },
  detailBody: { font: { name: FONT, size: 10 }, alignment: { vertical: 'middle' } },
  detailBold: { font: { name: FONT, size: 10, bold: true }, alignment: { vertical: 'middle' } },
  totalRow: {
    font: { name: FONT, size: 10, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } },
    alignment: { vertical: 'middle' },
    border: { top: { style: 'thin' } },
  },
};

type StyleKey = keyof typeof STYLES;

function put(
  ws: ExcelJS.Worksheet,
  address: string,
  value: ExcelJS.CellValue,
  styleKey: StyleKey,
  numFmt?: string,
): void {
  const cell = ws.getCell(address);
  cell.value = value;
  const style = STYLES[styleKey];
  if (style.font) cell.font = style.font as ExcelJS.Font;
  if (style.alignment) cell.alignment = style.alignment as ExcelJS.Alignment;
  if (style.fill) cell.fill = style.fill;
  if (style.border) cell.border = style.border as ExcelJS.Borders;
  if (numFmt) cell.numFmt = numFmt;
}

/** 사용자 입력 문자열은 문자열 셀로만 기록한다(§1-4 수식 주입 방지) */
export function asText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

// ───────────────────────────────────────────── 보조

function issuedDateText(header: StatementExportHeader): string {
  if (!header.issuedAt) return '—';
  return kstIsoDate(header.issuedAt);
}

/** timestamptz → KST 달력일 (§3 발행일) */
function kstIsoDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

function periodText(header: StatementExportHeader): string {
  if (header.periodFrom && header.periodTo) return `${header.periodFrom} ~ ${header.periodTo}`;
  return `${header.periodYear}-${String(header.periodMonth).padStart(2, '0')}`;
}

function billedNameOf(header: StatementExportHeader): string {
  if (header.billedPartyType === 'ADHOC') return asText(header.billedName);
  return asText(header.billedOrgName);
}

function billedBizNoOf(header: StatementExportHeader): string {
  if (header.billedPartyType === 'ADHOC') return asText(header.billedBizNo);
  return asText(header.billedOrgBizNo);
}

// ───────────────────────────────────────────── 시트 ① 요약 (§3)

function labelValueRow(
  ws: ExcelJS.Worksheet,
  row: number,
  label1: string,
  value1: string,
  label2: string,
  value2: string,
): void {
  put(ws, `A${row}`, label1, 'label');
  ws.mergeCells(`B${row}:C${row}`);
  put(ws, `B${row}`, value1, 'value');
  put(ws, `D${row}`, label2, 'label');
  ws.mergeCells(`E${row}:F${row}`);
  put(ws, `E${row}`, value2, 'value');
}

function summaryHeaderRows(ws: ExcelJS.Worksheet, data: StatementExportData): void {
  const { header } = data;
  ws.mergeCells('A1:F1');
  put(ws, 'A1', L.title, 'title');
  ws.mergeCells('A2:F2');
  // ISSUED/CLOSED는 행을 숨기지 않고 공백으로 둔다(§3)
  put(ws, 'A2', header.status === 'DRAFT' ? L.draftBanner : '', header.status === 'DRAFT' ? 'draft' : 'value');

  labelValueRow(ws, 3, L.statementNo, header.statementNo, L.issuedAt, issuedDateText(header));
  labelValueRow(ws, 4, L.period, periodText(header), L.round, `${header.roundNo}차`);
}

function summaryPartyBlock(ws: ExcelJS.Worksheet, header: StatementExportHeader): void {
  ws.mergeCells('A6:C6');
  put(ws, 'A6', L.supplier, 'blockHead');
  ws.mergeCells('D6:F6');
  put(ws, 'D6', L.recipientBlock, 'blockHead');

  const issuer = header.issuer;
  labelValueRow(ws, 7, L.name, asText(issuer.name), L.name, billedNameOf(header));
  labelValueRow(ws, 8, L.bizNo, asText(issuer.bizNo), L.bizNo, billedBizNoOf(header));
  labelValueRow(ws, 9, L.repName, asText(issuer.repName), '', '');

  put(ws, 'A10', L.address, 'label');
  ws.mergeCells('B10:F10');
  put(ws, 'B10', asText(issuer.address), 'value');
  put(ws, 'A11', L.contact, 'label');
  ws.mergeCells('B11:F11');
  put(ws, 'B11', [issuer.contactName, issuer.contactPhone].filter(Boolean).join(' / '), 'value');
}

function summaryAmountBlock(ws: ExcelJS.Worksheet, data: StatementExportData): void {
  const { totals } = data;
  ws.mergeCells('A13:F13');
  put(ws, 'A13', L.summaryHead, 'blockHead');
  put(ws, 'A14', L.colLabel, 'label');
  ws.mergeCells('B14:C14');
  put(ws, 'B14', L.amountLabel, 'label');

  const lines: Array<[string, number]> = [
    [L.baseFreight, totals.baseFreight],
    [L.fuelSurcharge, totals.fuelSurcharge],
    [L.surgeFee, totals.surgeFee],
    [L.otherCharges, totals.otherCharges],
  ];
  lines.forEach(([label, amount], i) => {
    const row = 15 + i;
    put(ws, `A${row}`, label, 'value');
    ws.mergeCells(`B${row}:C${row}`);
    put(ws, `B${row}`, amount, 'money', MONEY_FMT);
  });

  put(ws, 'A20', L.supplyTotal, 'totalLabel');
  ws.mergeCells('B20:C20');
  put(ws, 'B20', totals.lineTotal, 'totalMoney', MONEY_FMT);
  ws.mergeCells('A21:F21');
  put(ws, 'A21', L.vatNote, 'note');
}

function summaryFooterBlock(ws: ExcelJS.Worksheet, data: StatementExportData): void {
  const { header, totals } = data;
  ws.mergeCells('A23:C23');
  put(ws, 'A23', L.itemCount(totals.itemCount), 'meta');
  ws.mergeCells('D23:F23');
  put(ws, 'D23', L.totalWeight(totals.chargeWeightKg), 'meta');

  put(ws, 'A24', L.statusLabel, 'label');
  ws.mergeCells('B24:F24');
  const statusText = L.statusText[header.status] ?? header.status;
  const extra =
    header.status === 'CLOSED' && header.paidDate
      ? ` — ${L.paidInfo(header.paidDate, Number(header.paidAmount ?? 0).toLocaleString('ko-KR'))}`
      : '';
  put(ws, 'B24', `${statusText}${extra}`, 'value');
}

function buildSummarySheet(wb: ExcelJS.Workbook, data: StatementExportData): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(SHEET_SUMMARY, {
    views: [{ showGridLines: false }],
    headerFooter: { oddFooter: '&C페이지 &P / &N' },
  });
  summaryHeaderRows(ws, data);
  summaryPartyBlock(ws, data.header);
  summaryAmountBlock(ws, data);
  summaryFooterBlock(ws, data);
  for (const [col, width] of [['A', 16], ['B', 18], ['C', 12], ['D', 14], ['E', 16], ['F', 16]] as const) {
    ws.getColumn(col).width = width;
  }
  return ws;
}

// ───────────────────────────────────────────── 시트 ② 오더별 상세 (§4)

function detailTitle(statementNo: string, draft: boolean): string {
  return `${draft ? L.draftPrefix : ''}${statementNo} ${L.detailTitle}`;
}

function writeDetailHeader(ws: ExcelJS.Worksheet, cols: DetailColumn[], title: string): void {
  ws.mergeCells(`A1:${columnLetter(cols.length)}1`);
  put(ws, 'A1', title, 'title');
  cols.forEach((col, i) => {
    put(ws, `${columnLetter(i + 1)}3`, L.detailCols[col.key], 'head');
    ws.getColumn(i + 1).width = col.width;
  });
}

function detailCellValue(row: StatementExportRow, col: DetailColumn, index: number): ExcelJS.CellValue {
  switch (col.key) {
    case 'no': return index;
    case 'orderNo': return asText(row.orderNo);
    case 'tracking': return asText(row.trackingNo);
    case 'basisDate': return row.basisDate;
    case 'shipperName': return asText(row.shipperName);
    case 'recipient': return asText(row.recipientName);
    case 'country': return asText(row.recipientCountry);
    case 'weight': return row.chargeWeightKg;
    case 'baseFreight': return row.baseFreight;
    case 'fuelSurcharge': return row.fuelSurcharge;
    case 'surgeFee': return row.surgeFee;
    case 'otherCharges': return row.otherCharges;
    case 'lineTotal': return row.lineTotal;
    default: return '';
  }
}

function totalCellValue(totals: StatementExportData['totals'], col: DetailColumn): ExcelJS.CellValue {
  switch (col.key) {
    case 'no': return L.totalRow;
    case 'weight': return totals.chargeWeightKg;
    case 'baseFreight': return totals.baseFreight;
    case 'fuelSurcharge': return totals.fuelSurcharge;
    case 'surgeFee': return totals.surgeFee;
    case 'otherCharges': return totals.otherCharges;
    case 'lineTotal': return totals.lineTotal;
    default: return '';
  }
}

function writeDetailBody(ws: ExcelJS.Worksheet, rows: StatementExportRow[], cols: DetailColumn[]): number {
  const sorted = [...rows].sort((a, b) => asText(a.orderNo).localeCompare(asText(b.orderNo)));
  sorted.forEach((r, idx) => {
    const rowNo = 4 + idx;
    cols.forEach((col, i) => {
      const addr = `${columnLetter(i + 1)}${rowNo}`;
      put(ws, addr, detailCellValue(r, col, idx + 1), col.bold ? 'detailBold' : 'detailBody', col.numFmt);
      // 수하인은 말줄임 없이 줄바꿈(§4-F), 나머지는 열 정의 정렬
      ws.getCell(addr).alignment = {
        horizontal: col.align,
        vertical: 'middle',
        wrapText: col.key === 'recipient',
      };
    });
  });
  return 3 + sorted.length;
}

function writeDetailTotal(ws: ExcelJS.Worksheet, totals: StatementExportData['totals'], cols: DetailColumn[], rowNo: number): void {
  cols.forEach((col, i) => {
    const addr = `${columnLetter(i + 1)}${rowNo}`;
    put(ws, addr, totalCellValue(totals, col), 'totalRow', col.numFmt);
    ws.getCell(addr).alignment = { horizontal: col.align, vertical: 'middle' };
  });
}

interface DetailSheetResult {
  ws: ExcelJS.Worksheet;
  lastRow: number;
  lastCol: string;
}

function buildDetailSheet(wb: ExcelJS.Workbook, data: StatementExportData): DetailSheetResult {
  const includeShipper = data.header.tier === 'ADMIN_TO_AGENCY';
  const cols = detailColumns(includeShipper);
  const ws = wb.addWorksheet(SHEET_DETAIL, {
    views: [{ state: 'frozen', ySplit: 3, showGridLines: true }],
  });
  writeDetailHeader(ws, cols, detailTitle(data.header.statementNo, data.header.status === 'DRAFT'));

  let lastRow = 3;
  if (data.rows.length) {
    lastRow = writeDetailBody(ws, data.rows, cols);
  } else {
    // 항목 0건 DRAFT 허용 — 빈 상세 + 합계 0 + 안내 행(§7)
    ws.mergeCells(`A4:${columnLetter(cols.length)}4`);
    put(ws, 'A4', L.noItems, 'note');
    lastRow = 4;
  }
  const totalRow = lastRow + 1;
  writeDetailTotal(ws, data.totals, cols, totalRow);
  return { ws, lastRow: totalRow, lastCol: columnLetter(cols.length) };
}

// ───────────────────────────────────────────── 인쇄 설정 (§5 — 구조 단언 대상)

const PRINT_MARGINS: ExcelJS.Margins = {
  left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3,
};
const FOOTER = '&C페이지 &P / &N';
const SUMMARY_LAST_ROW = 24;

function applySummaryPrintSetup(ws: ExcelJS.Worksheet, statementNo: string): void {
  ws.pageSetup = {
    ...ws.pageSetup,
    paperSize: 9,
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    margins: PRINT_MARGINS,
    horizontalCentered: true,
    showGridLines: false,
    printArea: `A1:F${SUMMARY_LAST_ROW}`,
  };
  ws.headerFooter = { oddHeader: `&R${statementNo}`, oddFooter: FOOTER };
  ws.views = [{ showGridLines: false }];
}

function applyDetailPrintSetup(
  ws: ExcelJS.Worksheet,
  statementNo: string,
  lastRow: number,
  lastCol: string,
): void {
  ws.pageSetup = {
    ...ws.pageSetup,
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: PRINT_MARGINS,
    horizontalCentered: true,
    showGridLines: false,
    printTitlesRow: '3:3',
    printArea: `A1:${lastCol}${lastRow}`,
  };
  ws.headerFooter = {
    oddHeader: `&L${statementNo}&R${L.detailTitle}`,
    oddFooter: FOOTER,
  };
}

// ───────────────────────────────────────────── 파일명 · 응답 헤더 (§2, §7)

const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|\s]+/g;

export function buildExportFilename(header: StatementExportHeader): string {
  const target =
    (header.billedPartyType === 'ADHOC' ? header.billedName : header.billedOrgName) || '미지정';
  const base = `${L.fileNamePrefix}_${header.statementNo}_${target}`.replace(ILLEGAL_FILENAME_CHARS, '_');
  return `${[...base].slice(0, 80).join('')}.xlsx`;
}

/** RFC 5987 attr-char(`ALPHA / DIGIT / !#$&+-.^_`|~`)만 미인코딩, 나머지는 %XX (UTF-8 바이트) */
function encodeRfc5987(value: string): string {
  const attrChars = /^[A-Za-z0-9!#$&+\-.^_`|~]$/;
  let out = '';
  for (const byte of Buffer.from(value, 'utf8')) {
    const ch = String.fromCharCode(byte);
    out += attrChars.test(ch) ? ch : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
  }
  return out;
}

/** RFC 5987 — `filename*=UTF-8''…` 로 한글 파일명 보존 (attr-char 집합을 엄밀히 지킨다) */
export function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeRfc5987(filename)}`;
}

// ───────────────────────────────────────────── 빌드 · 오케스트레이션

export async function buildStatementWorkbook(data: StatementExportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const summary = buildSummarySheet(wb, data);
  const detail = buildDetailSheet(wb, data);
  applySummaryPrintSetup(summary, data.header.statementNo);
  applyDetailPrintSetup(detail.ws, data.header.statementNo, detail.lastRow, detail.lastCol);
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}

export type StatementExportResult =
  | { ok: true; body: Buffer; filename: string }
  | { ok: false; status: 404 | 500; reason: string };

/** 청구서 Excel 출력 — 404(존재 비노출) / 500(조회 실패·합계 불일치·빌드 실패) */
export async function exportStatementXlsx(
  supabase: any,
  id: string,
): Promise<StatementExportResult> {
  const loaded = await loadStatementExport(supabase, id);
  if (!loaded.ok) {
    if (loaded.status === 404) logger.warn(`[statement-export] not found/not visible (${id})`);
    return loaded;
  }
  try {
    const body = await buildStatementWorkbook(loaded.data);
    // 금액·상호 제외 (§7 로깅)
    logger.info(`[statement-export] ok (${id}, items=${loaded.data.rows.length})`);
    return { ok: true, body, filename: buildExportFilename(loaded.data.header) };
  } catch (err) {
    logger.error('[statement-export] workbook build failed', err);
    return { ok: false, status: 500, reason: 'BUILD_FAILED' };
  }
}
