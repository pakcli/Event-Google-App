import { EventItem, EventType, UserAuth } from '../types';
import { getTodayDateString, formatReadableDate } from './dateUtils';

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  action?: 'ADD_EVENT' | 'EDIT_EVENT' | 'CONFIRM_DELETE' | 'EXECUTE_DELETE' | 'NONE';
  actionStatus?: 'pending' | 'completed' | 'cancelled';
  eventData?: {
    targetId?: string;
    targetTitle?: string;
    targetStart?: string;
    targetTime?: string;
    title?: string;
    type?: EventType;
    start?: string;
    startTime?: string;
    end?: string;
    endTime?: string;
    location?: string;
    description?: string;
    updates?: Partial<EventItem>;
  };
}

// Client-Side Smart Natural Language Processor (Fallback & Instant Zero-Cost AI)
export function processLocalAIQuery(
  userPrompt: string,
  currentEvents: EventItem[],
  currentUser: UserAuth
): {
  reply: string;
  action: 'ADD_EVENT' | 'EDIT_EVENT' | 'CONFIRM_DELETE' | 'EXECUTE_DELETE' | 'NONE';
  eventData?: AIChatMessage['eventData'];
} {
  const text = userPrompt.trim();
  const lower = text.toLowerCase();
  const todayStr = getTodayDateString();

  // Helper to parse dates relative to today
  const parseRelativeDate = (input: string): string => {
    const today = new Date();
    if (input.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    if (input.includes('day after tomorrow')) {
      const dat = new Date(today);
      dat.setDate(today.getDate() + 2);
      return dat.toISOString().split('T')[0];
    }
    // Match explicit date YYYY-MM-DD
    const matchExplicit = input.match(/\b(20\d\d-\d\d-\d\d)\b/);
    if (matchExplicit) return matchExplicit[1];

    return todayStr;
  };

  // Helper to parse time string like "3pm", "3:30pm", "14:00", "9 am"
  const parseTimeString = (input: string): string => {
    const timeMatch = input.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (!timeMatch) return '10:00';
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] || '00';
    const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${minutes}`;
  };

  // Helper to find closest matching event by title/phrase
  const findMatchingEvent = (query: string): EventItem | null => {
    if (!currentEvents || currentEvents.length === 0) return null;
    const cleanQuery = query.toLowerCase();

    // 1. Exact or title contains
    let match = currentEvents.find((e) => e.title.toLowerCase().includes(cleanQuery));
    if (match) return match;

    // 2. Token overlap
    const tokens = cleanQuery.split(/\s+/).filter((t) => t.length > 2);
    for (const tok of tokens) {
      match = currentEvents.find((e) => e.title.toLowerCase().includes(tok));
      if (match) return match;
    }

    return null;
  };

  // 1. DELETE COMMAND PARSING (with required confirmation)
  if (lower.includes('delete') || lower.includes('remove') || lower.includes('cancel event') || lower.includes('erase')) {
    // Extract what event to delete
    const deleteTargetPhrase = lower
      .replace(/delete|remove|cancel event|erase|the event|event/gi, '')
      .trim();

    const matchedEvent = findMatchingEvent(deleteTargetPhrase);

    if (matchedEvent) {
      return {
        reply: `⚠️ Delete Confirmation Required:\n\nAre you sure you want to delete "${matchedEvent.title}" scheduled for ${matchedEvent.start || todayStr}${matchedEvent.startTime ? ` at ${matchedEvent.startTime}` : ''}?`,
        action: 'CONFIRM_DELETE',
        eventData: {
          targetId: matchedEvent.id,
          targetTitle: matchedEvent.title,
          targetStart: matchedEvent.start || todayStr,
          targetTime: matchedEvent.startTime || '',
        },
      };
    } else {
      return {
        reply: `I couldn't find an event matching "${deleteTargetPhrase || 'your request'}" to delete. Please specify the exact title of the event you wish to remove.`,
        action: 'NONE',
      };
    }
  }

  // 2. EDIT / UPDATE COMMAND PARSING
  if (lower.includes('edit') || lower.includes('change') || lower.includes('update') || lower.includes('move') || lower.includes('reschedule')) {
    // Look for target event
    const matchedEvent = findMatchingEvent(lower);

    if (matchedEvent) {
      const updates: Partial<EventItem> = {};
      let summaryStr = [];

      // Check if time update
      if (lower.includes('time') || lower.includes('at') || lower.includes('to')) {
        const newTime = parseTimeString(lower);
        updates.startTime = newTime;
        summaryStr.push(`time to ${newTime}`);
      }

      // Check if location update
      if (lower.includes('location') || lower.includes('place') || lower.includes('in ')) {
        const locMatch = text.match(/(?:location|place|in)\s+([^,.]+)/i);
        if (locMatch) {
          updates.location = locMatch[1].trim();
          summaryStr.push(`location to "${locMatch[1].trim()}"`);
        }
      }

      // Check category/type
      if (lower.includes('work')) updates.type = 'work';
      else if (lower.includes('social')) updates.type = 'social';
      else if (lower.includes('reminder')) updates.type = 'reminder';

      if (Object.keys(updates).length > 0) {
        return {
          reply: `✏️ Updating "${matchedEvent.title}": Changed ${summaryStr.join(', ') || 'details'}.`,
          action: 'EDIT_EVENT',
          eventData: {
            targetId: matchedEvent.id,
            updates,
          },
        };
      } else {
        return {
          reply: `I found "${matchedEvent.title}". What would you like to update? (e.g. "Change time to 3pm" or "Update location to Room B").`,
          action: 'NONE',
        };
      }
    } else {
      return {
        reply: `I couldn't find the event you want to edit. Here are your available events: ${currentEvents.slice(0, 5).map((e) => `"${e.title}"`).join(', ')}.`,
        action: 'NONE',
      };
    }
  }

  // 3. ADD / PROPOSE COMMAND PARSING
  if (lower.includes('add') || lower.includes('propose') || lower.includes('create') || lower.includes('schedule') || lower.includes('new event')) {
    // Extract title
    let titleCandidate = text
      .replace(/add|propose|create|schedule|new event|a new|an event|event/gi, '')
      .replace(/tomorrow|today|at\s+\d+:\d+|at\s+\d+\s*(?:am|pm)?/gi, '')
      .replace(/in\s+[^,.]+/gi, '')
      .trim();

    if (!titleCandidate || titleCandidate.length < 2) {
      titleCandidate = 'New AI Proposed Event';
    }

    const eventDate = parseRelativeDate(lower);
    const eventTime = parseTimeString(lower);

    // Determine category
    let type: EventType = 'other';
    if (lower.includes('meeting') || lower.includes('work') || lower.includes('sync') || lower.includes('office') || lower.includes('client')) {
      type = 'work';
    } else if (lower.includes('party') || lower.includes('dinner') || lower.includes('lunch') || lower.includes('social') || lower.includes('birthday')) {
      type = 'social';
    } else if (lower.includes('reminder') || lower.includes('call') || lower.includes('pay') || lower.includes('doctor')) {
      type = 'reminder';
    }

    // Determine location
    let location = 'TBD';
    const locMatch = text.match(/(?:at|in)\s+([A-Za-z0-9\s]+?)(?=\s+tomorrow|\s+today|\s+at\s+\d|\s+on|\.|$)/i);
    if (locMatch && locMatch[1] && locMatch[1].length > 2) {
      location = locMatch[1].trim();
    }

    const isViewer = currentUser.role === 'viewer';
    const actionText = isViewer ? 'proposed for review' : 'added to your schedule';

    return {
      reply: `📅 Event "${titleCandidate}" has been ${actionText} for ${eventDate} at ${eventTime} (${type.toUpperCase()}).`,
      action: 'ADD_EVENT',
      eventData: {
        title: titleCandidate,
        type,
        start: eventDate,
        startTime: eventTime,
        location,
        description: `Created via AI Chat Assistant on ${todayStr}`,
      },
    };
  }

  // 4. Q&A & SCHEDULE QUESTIONS
  if (lower.includes('today') || lower.includes('schedule') || lower.includes('what') || lower.includes('list') || lower.includes('show') || lower.includes('how many')) {
    const todayEvents = currentEvents.filter((e) => e.start === todayStr && e.status === 'approved');
    const pendingEvents = currentEvents.filter((e) => e.status === 'pending');

    if (lower.includes('today')) {
      if (todayEvents.length === 0) {
        return {
          reply: `You have 0 scheduled events for today (${formatReadableDate(todayStr)}). Your day is completely open!`,
          action: 'NONE',
        };
      }
      const eventListText = todayEvents
        .map((e, idx) => `${idx + 1}. **${e.title}** (${e.startTime || 'All Day'}) - ${e.location || 'No location'} [${e.type.toUpperCase()}]`)
        .join('\n');

      return {
        reply: `📅 Here is your schedule for today (${formatReadableDate(todayStr)}):\n\n${eventListText}`,
        action: 'NONE',
      };
    }

    if (lower.includes('pending') || lower.includes('review') || lower.includes('draft')) {
      if (pendingEvents.length === 0) {
        return {
          reply: `There are currently 0 events pending review in your queue. All proposed events have been processed!`,
          action: 'NONE',
        };
      }
      const pendingListText = pendingEvents
        .slice(0, 5)
        .map((e, idx) => `${idx + 1}. **${e.title}** requested by ${e.requestedBy || 'user'}`)
        .join('\n');

      return {
        reply: `⏳ You have **${pendingEvents.length}** event(s) pending review:\n\n${pendingListText}`,
        action: 'NONE',
      };
    }

    // Overall summary Q&A
    const workCount = currentEvents.filter((e) => e.type === 'work').length;
    const socialCount = currentEvents.filter((e) => e.type === 'social').length;
    const reminderCount = currentEvents.filter((e) => e.type === 'reminder').length;

    return {
      reply: `📊 **Schedule Summary**:\n• Total Events: **${currentEvents.length}**\n• Today's Events: **${todayEvents.length}**\n• Work: **${workCount}** | Social: **${socialCount}** | Reminders: **${reminderCount}**\n• Pending Approval: **${pendingEvents.length}**`,
      action: 'NONE',
    };
  }

  // Default conversational response & guidance
  return {
    reply: `I'm your AI Calendar Assistant! Here are things I can do for you automatically:\n\n• **Add Events**: *"Add team lunch tomorrow at 12pm in Central Cafe"*\n• **Schedule Q&A**: *"What do I have scheduled for today?"*\n• **Edit Events**: *"Change time of Gym to 7am"*\n• **Delete Events**: *"Delete event Gym session"* (with safety confirmation button!)`,
    action: 'NONE',
  };
}

// Master AI Chat Send Function - Tries Server Gemini API with strict timeout, falls back to instant zero-cost local NPL
export async function sendAIChatMessage(
  userPrompt: string,
  currentEvents: EventItem[],
  currentUser: UserAuth
): Promise<{
  reply: string;
  action: 'ADD_EVENT' | 'EDIT_EVENT' | 'CONFIRM_DELETE' | 'EXECUTE_DELETE' | 'NONE';
  eventData?: AIChatMessage['eventData'];
}> {
  const todayDate = getTodayDateString();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        userPrompt,
        currentEvents,
        todayDate,
        currentUserRole: currentUser.role,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      clearTimeout(timeoutId);
      if (data && data.success && !data.fallbackNeeded && data.reply) {
        return {
          reply: data.reply,
          action: data.action || 'NONE',
          eventData: data.eventData,
        };
      }
    } else {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    console.log('Server Gemini route unavailable or timed out (using local zero-cost NPL):', err);
  }

  // Zero-cost, instantaneous local natural language executor
  return processLocalAIQuery(userPrompt, currentEvents, currentUser);
}
