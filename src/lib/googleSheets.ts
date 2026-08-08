import { EventItem, EventType, EventStatus } from '../types';
import { getTodayDateString } from '../utils/dateUtils';

// Extract Spreadsheet ID from standard Google Sheets URL or raw ID
export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  
  // URL pattern: https://docs.google.com/spreadsheets/d/1ABC.../edit
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  
  // If user pasted raw ID directly
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }
  
  return trimmed;
}

// Fetch spreadsheet values from Google Sheets API
export async function fetchGoogleSheetEvents(
  spreadsheetInput: string,
  accessToken?: string | null
): Promise<{ events: EventItem[]; sheetTitle: string; totalRows: number }> {
  const spreadsheetId = extractSpreadsheetId(spreadsheetInput);
  if (!spreadsheetId) {
    throw new Error('Please enter a valid Google Sheet URL or Spreadsheet ID.');
  }

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // 1. Fetch metadata to get the first sheet name
  let firstSheetName = 'Sheet1';
  let sheetTitle = 'Google Sheet';

  try {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`;
    const metaRes = await fetch(metaUrl, { headers });
    
    if (metaRes.ok) {
      const metaData = await metaRes.json();
      if (metaData.properties?.title) {
        sheetTitle = metaData.properties.title;
      }
      if (metaData.sheets && metaData.sheets.length > 0 && metaData.sheets[0].properties?.title) {
        firstSheetName = metaData.sheets[0].properties.title;
      }
    }
  } catch (err) {
    console.warn('Could not fetch spreadsheet metadata, falling back to default range:', err);
  }

  // 2. Fetch cell values
  const range = encodeURIComponent(`${firstSheetName}!A1:Z200`);
  const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const res = await fetch(valuesUrl, { headers });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      if (!accessToken) {
        throw new Error('This Google Sheet requires authentication. Please click "Sign in with Google" at the top to sync private sheets.');
      }
      throw new Error('Access denied to Google Sheet. Please verify that your Google account has permission to view this sheet.');
    }
    if (res.status === 404) {
      throw new Error('Spreadsheet not found. Please check the URL or Spreadsheet ID.');
    }
    const errText = await res.text();
    throw new Error(`Google Sheets API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const rows: string[][] = data.values || [];

  if (rows.length === 0) {
    return { events: [], sheetTitle, totalRows: 0 };
  }

  // 3. Header analysis & row parsing
  const headersRow = rows[0].map((h) => String(h).toLowerCase().trim());
  
  // Find column indices
  let titleIdx = headersRow.findIndex((h) => h.includes('title') || h.includes('event') || h.includes('name') || h.includes('summary'));
  let startIdx = headersRow.findIndex((h) => h.includes('start date') || h === 'start' || h.includes('date'));
  let startTimeIdx = headersRow.findIndex((h) => h.includes('start time') || h === 'starttime' || h === 'time');
  let endIdx = headersRow.findIndex((h) => h.includes('end date') || h === 'end');
  let endTimeIdx = headersRow.findIndex((h) => h.includes('end time') || h === 'endtime');
  let locationIdx = headersRow.findIndex((h) => h.includes('location') || h.includes('room') || h.includes('place') || h.includes('where'));
  let typeIdx = headersRow.findIndex((h) => h.includes('type') || h.includes('category'));
  let statusIdx = headersRow.findIndex((h) => h.includes('status') || h.includes('state'));

  // Fallbacks if header is not explicit
  if (titleIdx === -1) titleIdx = 0;
  if (startIdx === -1 && rows[0].length > 1) startIdx = 1;

  const todayStr = getTodayDateString();
  const parsedEvents: EventItem[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[titleIdx]) continue;

    const rawTitle = row[titleIdx]?.trim() || `Sheet Event #${i}`;
    const rawStart = (startIdx !== -1 ? row[startIdx] : '') || todayStr;
    const rawStartTime = (startTimeIdx !== -1 ? row[startTimeIdx] : '') || '09:00';
    const rawEnd = (endIdx !== -1 ? row[endIdx] : '') || rawStart || todayStr;
    const rawEndTime = (endTimeIdx !== -1 ? row[endTimeIdx] : '') || '10:00';
    const rawLocation = (locationIdx !== -1 ? row[locationIdx] : '') || 'Google Sheet Source';
    const rawType = (typeIdx !== -1 ? row[typeIdx]?.toLowerCase() : '') || 'work';
    const rawStatus = (statusIdx !== -1 ? row[statusIdx]?.toLowerCase() : '') || 'approved';

    // Normalize date format YYYY-MM-DD
    const cleanStart = normalizeDate(rawStart, todayStr);
    const cleanEnd = normalizeDate(rawEnd, cleanStart);
    const cleanType: EventType = ['work', 'social', 'reminder', 'other'].includes(rawType)
      ? (rawType as EventType)
      : 'work';
    const cleanStatus: EventStatus = ['pending', 'approved', 'rejected'].includes(rawStatus)
      ? (rawStatus as EventStatus)
      : 'approved';

    parsedEvents.push({
      id: `gsheet-${spreadsheetId}-${i}`,
      title: rawTitle,
      type: cleanType,
      start: cleanStart,
      startTime: formatTime(rawStartTime),
      end: cleanEnd,
      endTime: formatTime(rawEndTime),
      location: rawLocation,
      added: todayStr,
      status: cleanStatus,
      requestedBy: `Google Sheet (${sheetTitle})`,
      source: 'google_sheet',
      sheetRowIndex: i + 1,
    });
  }

  return {
    events: parsedEvents,
    sheetTitle,
    totalRows: rows.length,
  };
}

// Normalize various date representations to YYYY-MM-DD
function normalizeDate(raw: string, fallback: string): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  // MM/DD/YYYY or M/D/YYYY
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, m, d, y] = usMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Attempt JS Date parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return fallback;
}

// Format time string to HH:MM
function formatTime(raw: string): string {
  if (!raw) return '09:00';
  const trimmed = raw.trim();
  const match = trimmed.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = match[2];
    return `${h.toString().padStart(2, '0')}:${m}`;
  }
  return '09:00';
}
