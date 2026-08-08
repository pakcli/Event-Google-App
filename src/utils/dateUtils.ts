import { EventItem, EventType } from '../types';

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatReadableDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime12h(timeStr: string): string {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

export function isEventOnDate(event: EventItem, dateStr: string): boolean {
  return dateStr >= event.start && dateStr <= event.end;
}

export function generateGoogleCalendarUrl(event: EventItem): string {
  const cleanStart = (event.start || '').replace(/-/g, '');
  const cleanStartTime = (event.startTime || '09:00').replace(/:/g, '');
  const cleanEnd = (event.end || event.start || '').replace(/-/g, '');
  const cleanEndTime = (event.endTime || '10:00').replace(/:/g, '');

  const startIso = `${cleanStart}T${cleanStartTime.padEnd(4, '0')}00`;
  const endIso = `${cleanEnd}T${cleanEndTime.padEnd(4, '0')}00`;

  const baseUrl = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || 'Untitled Event',
    dates: `${startIso}/${endIso}`,
    location: event.location || '',
  });

  return `${baseUrl}?${params.toString()}`;
}

export function parseCSVInput(csvText: string): Partial<EventItem>[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const events: Partial<EventItem>[] = [];
  const todayStr = getTodayDateString();
  const validTypes: EventType[] = ['work', 'social', 'reminder', 'other'];

  for (const line of lines) {
    // Skip header line if present
    if (line.toLowerCase().startsWith('title,') || line.toLowerCase().startsWith('"title"')) {
      continue;
    }

    // Split CSV respecting quotes
    const parts = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((p) => p.replace(/^"|"$/g, '').trim());
    if (parts.length < 1 || !parts[0]) continue;

    const [title, start, startTime, end, endTime, location, type] = parts;
    const resolvedType: EventType = type ? type.toLowerCase() : 'other';

    events.push({
      title: title || 'Untitled Event',
      start: start && /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : todayStr,
      startTime: startTime && /^\d{2}:\d{2}$/.test(startTime) ? startTime : '09:00',
      end: end && /^\d{4}-\d{2}-\d{2}$/.test(end) ? end : (start || todayStr),
      endTime: endTime && /^\d{2}:\d{2}$/.test(endTime) ? endTime : '10:00',
      location: location || '',
      type: resolvedType,
    });
  }

  return events;
}

export function exportEventsToCSV(events: EventItem[]): string {
  const headers = ['title', 'start', 'startTime', 'end', 'endTime', 'location', 'type', 'status', 'requestedBy'];
  const rows = events.map((e) => [
    `"${(e.title || '').replace(/"/g, '""')}"`,
    e.start,
    e.startTime,
    e.end,
    e.endTime,
    `"${(e.location || '').replace(/"/g, '""')}"`,
    e.type,
    e.status,
    e.requestedBy || '',
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportEventsToJSON(events: EventItem[]): string {
  return JSON.stringify(events, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
