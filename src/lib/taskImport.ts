/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { TaskItem } from '../types';

export type TaskDraft = Omit<TaskItem, 'id' | 'userId' | 'createdAt'>;

export interface ImportResult {
  drafts: TaskDraft[];
  skippedRows: number;
}

export const IMPORT_ACCEPT = '.csv,.xlsx,.xls,text/csv';

/** Columns supported in the import file (header row). Only `title` is required. */
export const IMPORT_COLUMNS: Array<{ key: string; required: boolean; description: string }> = [
  { key: 'title', required: true, description: 'Task name — e.g. Read Physics Chapter 3' },
  { key: 'dueDate', required: false, description: 'Optional — YYYY-MM-DD or YYYY-MM-DD HH:MM (24h)' },
  { key: 'priority', required: false, description: 'high / medium / low (default: medium)' },
  { key: 'estimatedMinutes', required: false, description: 'Whole number of minutes (default: 30)' },
  { key: 'complete', required: false, description: 'true / false (default: false)' }
];

export const SAMPLE_CSV = [
  'title,dueDate,priority,estimatedMinutes,complete',
  'Read Physics Chapter 3,2025-09-01 14:00,high,45,false',
  'Solve integration problem set,,medium,30,false',
  'Revise biology flashcards,2025-09-02,low,20,true'
].join('\n');

const CANONICAL_COLUMNS = ['title', 'dueDate', 'priority', 'estimatedMinutes', 'complete'];

/** Parse delimiter-separated text (CSV / TSV / semicolon) handling quoted fields and escaped quotes. */
export function parseDelimited(text: string): string[][] {
  // Sniff the delimiter from the header line (outside quotes)
  const headerEnd = text.indexOf('\n') >= 0 ? text.indexOf('\n') : text.length;
  const headerLine = text.slice(0, headerEnd);
  const tally: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };
  let inQuotes = false;
  for (const ch of headerLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in tally) tally[ch] += 1;
  }
  const delimiter = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0].trim() !== '') rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.length > 1 || row[0].trim() !== '') rows.push(row);

  return rows;
}

/** Normalize any accepted date string to the `YYYY-MM-DDTHH:mm` format used by dueDate fields. */
function normalizeDueDate(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;

  const pad = (n: number) => String(n).padStart(2, '0');
  const toLocalString = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  // Date-only values (YYYY-MM-DD) must be treated as local midnight, not UTC
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}T00:00`;
  }

  let d = new Date(value);
  if (isNaN(d.getTime())) {
    // Try "YYYY-MM-DD HH:MM" with a space (not valid ISO in every engine)
    d = new Date(value.replace(' ', 'T'));
  }
  if (isNaN(d.getTime())) return undefined;

  return toLocalString(d);
}

function normalizePriority(raw: string): 'high' | 'medium' | 'low' {
  const v = raw.trim().toLowerCase();
  if (v.startsWith('h') || v === '1') return 'high';
  if (v.startsWith('l') || v === '3') return 'low';
  return 'medium';
}

function normalizeComplete(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return v === 'true' || v === 'yes' || v === 'y' || v === '1' || v === 'done';
}

/** Convert raw spreadsheet rows into validated task drafts. */
export function rowsToTaskDrafts(rows: string[][]): ImportResult {
  if (!rows.length) return { drafts: [], skippedRows: 0 };

  const normalizedHeader = rows[0].map((c) => String(c ?? '').trim().toLowerCase().replace(/[^a-z]/g, ''));

  // Column mapping: use the header row when present, otherwise assume canonical order
  let colIndex: Record<string, number> = {};
  const dataRows = [...rows];

  if (normalizedHeader.includes('title')) {
    dataRows.shift();
    CANONICAL_COLUMNS.forEach((key) => {
      const idx = normalizedHeader.indexOf(key.toLowerCase());
      if (idx >= 0) colIndex[key] = idx;
    });
  } else {
    colIndex = CANONICAL_COLUMNS.reduce((acc, key, idx) => ({ ...acc, [key]: idx }), {});
  }

  const getCell = (row: string[], key: string) => {
    const idx = colIndex[key];
    return idx !== undefined && idx < row.length ? String(row[idx] ?? '') : '';
  };

  const drafts: TaskDraft[] = [];
  let skippedRows = 0;

  for (const row of dataRows) {
    if (!row.some((cell) => String(cell ?? '').trim())) continue; // ignore fully blank lines

    const title = getCell(row, 'title').trim();
    if (!title) {
      skippedRows++;
      continue;
    }

    const minutesRaw = getCell(row, 'estimatedMinutes').replace(/[^0-9]/g, '');
    drafts.push({
      title,
      complete: normalizeComplete(getCell(row, 'complete')),
      dueDate: normalizeDueDate(getCell(row, 'dueDate')),
      priority: normalizePriority(getCell(row, 'priority')),
      estimatedMinutes: minutesRaw ? Math.min(1440, parseInt(minutesRaw, 10)) : 30
    });
  }

  return { drafts, skippedRows };
}

/** Read a CSV or Excel file and return validated task drafts. Excel uses the first sheet only. */
export async function parseTasksFile(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();

  let rows: string[][];
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('The workbook contains no sheets.');
    const sheet = workbook.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '', raw: false });
  } else if (name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'text/plain') {
    rows = parseDelimited(await file.text());
  } else {
    throw new Error('Unsupported file type. Please upload a .csv, .xlsx or .xls file.');
  }

  if (!rows.length) throw new Error('The file appears to be empty.');

  const result = rowsToTaskDrafts(rows);
  if (!result.drafts.length) {
    throw new Error(
      result.skippedRows > 0
        ? `No importable tasks found — ${result.skippedRows} row(s) were missing a title.`
        : 'No data rows found below the header row.'
    );
  }
  return result;
}
