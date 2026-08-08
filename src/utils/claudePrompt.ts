import { EventItem, EventType } from '../types';
import { getTodayDateString } from './dateUtils';

export const EXTRACTION_SKILL_PROMPT = `You extract calendar events from this image (screenshot, flyer, poster, schedule, chat, ticket).
Reply with ONLY one line of minified JSON — no prose, no markdown fences, no line breaks, no explanation.
Each item in the array must match exactly:
{"title":string,"type":"work"|"social"|"reminder"|"other","start":"YYYY-MM-DD","startTime":"HH:MM","end":"YYYY-MM-DD","endTime":"HH:MM","location":string}
Rules: extract every distinct event if there are multiple. Assume year 2026 if unstated. Resolve relative dates using 2026 as current year. Infer "type" from context. Use "" for unknown location, "00:00" for unknown time. If no events found, reply exactly: []`;

export function parsePastedExtraction(input: string): { success: boolean; events: Partial<EventItem>[]; error?: string } {
  if (!input || !input.trim()) {
    return { success: false, events: [], error: 'Input text is empty.' };
  }

  const todayStr = getTodayDateString();
  let cleaned = input.trim();

  // Strip markdown code fences if present (e.g. ```json ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    const array = Array.isArray(parsed) ? parsed : [parsed];

    const events: Partial<EventItem>[] = array.map((item: any) => {
      const type: EventType = item.type ? String(item.type).trim().toLowerCase() : 'other';
      return {
        title: String(item.title || 'Untitled Event').trim(),
        type,
        start: item.start && /^\d{4}-\d{2}-\d{2}$/.test(item.start) ? item.start : todayStr,
        startTime: item.startTime && /^\d{2}:\d{2}$/.test(item.startTime) ? item.startTime : '09:00',
        end: item.end && /^\d{4}-\d{2}-\d{2}$/.test(item.end) ? item.end : (item.start || todayStr),
        endTime: item.endTime && /^\d{2}:\d{2}$/.test(item.endTime) ? item.endTime : '10:00',
        location: String(item.location || '').trim(),
      };
    });

    return { success: true, events };
  } catch (err: any) {
    return {
      success: false,
      events: [],
      error: `Could not parse JSON. Please check formatting. (${err.message || 'Syntax error'})`,
    };
  }
}
