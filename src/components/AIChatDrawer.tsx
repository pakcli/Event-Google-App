import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Trash2,
  Check,
  Calendar,
  Clock,
  MapPin,
  Tag,
  AlertTriangle,
  RotateCcw,
  Edit,
  Plus,
  HelpCircle,
} from 'lucide-react';
import { EventItem, EventType, UserAuth } from '../types';
import { AIChatMessage, sendAIChatMessage } from '../utils/aiEngine';
import { getTodayDateString } from '../utils/dateUtils';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  currentUser: UserAuth;
  onCreateEvent: (eventData: Omit<EventItem, 'id'>) => Promise<void>;
  onUpdateEvent: (id: string, updates: Partial<EventItem>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  isOpen,
  onClose,
  events,
  currentUser,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
}) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: `Hello ${currentUser.displayName || 'there'}! 👋 I am your AI Schedule Assistant.\n\nI can automatically **add events**, **answer questions (Q&A)**, **edit schedule details**, and **delete events with confirmation** — completely free!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputText).trim();
    if (!prompt || isProcessing) return;

    const userMsg: AIChatMessage = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsProcessing(true);

    try {
      const aiResponse = await sendAIChatMessage(prompt, events, currentUser);

      const assistantMsg: AIChatMessage = {
        id: 'ast-' + Date.now(),
        sender: 'assistant',
        text: aiResponse.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: aiResponse.action,
        actionStatus: aiResponse.action === 'CONFIRM_DELETE' ? 'pending' : 'completed',
        eventData: aiResponse.eventData,
      };

      // 1. Render assistant message in chat stream immediately so user sees reply without delay
      setMessages((prev) => [...prev, assistantMsg]);
      setIsProcessing(false);

      // 2. Perform background DB mutation safely
      if (aiResponse.action === 'ADD_EVENT' && aiResponse.eventData) {
        try {
          const todayStr = getTodayDateString();
          const isViewer = currentUser.role === 'viewer';
          await onCreateEvent({
            title: aiResponse.eventData.title || 'New AI Event',
            type: aiResponse.eventData.type || 'other',
            start: aiResponse.eventData.start || todayStr,
            startTime: aiResponse.eventData.startTime || '10:00',
            location: aiResponse.eventData.location || 'TBD',
            description: aiResponse.eventData.description || 'Added via AI Chat',
            added: todayStr,
            status: isViewer ? 'pending' : 'approved',
            requestedBy: currentUser.email || 'anonymous',
          });
        } catch (dbErr) {
          console.error('Error saving AI generated event to Firestore:', dbErr);
        }
      } else if (aiResponse.action === 'EDIT_EVENT' && aiResponse.eventData?.targetId && aiResponse.eventData?.updates) {
        try {
          await onUpdateEvent(aiResponse.eventData.targetId, aiResponse.eventData.updates);
        } catch (dbErr) {
          console.error('Error updating AI event in Firestore:', dbErr);
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          sender: 'assistant',
          text: 'Sorry, I ran into an error processing that request. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm and execute event deletion when user clicks the Confirm Delete button
  const handleConfirmDelete = async (messageId: string, targetId: string) => {
    try {
      await onDeleteEvent(targetId);

      // Update message status
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                actionStatus: 'completed',
                text: msg.text + '\n\n✅ **Event has been successfully deleted.**',
              }
            : msg
        )
      );
    } catch (err: any) {
      alert('Failed to delete event: ' + err.message);
    }
  };

  // Cancel deletion
  const handleCancelDelete = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              actionStatus: 'cancelled',
              text: msg.text + '\n\n❌ **Deletion cancelled.** No changes were made.',
            }
          : msg
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in">
      {/* Slide-over Drawer */}
      <div className="w-full max-w-lg bg-white dark:bg-[#121214] h-full flex flex-col shadow-2xl border-l border-slate-200 dark:border-[#2C2C2E] animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-[#2C2C2E] bg-slate-50 dark:bg-[#1C1C1E] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">AI Calendar Assistant</h3>
                <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  FREE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#8E8E93]">
                Automate add, Q&A, edit & delete confirmation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#2C2C2E] transition"
            title="Close Assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-3 py-2 bg-slate-100/70 dark:bg-[#08080A] border-b border-slate-200 dark:border-[#2C2C2E] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleSendMessage("What's on my schedule today?")}
            className="whitespace-nowrap px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#2C2C2E] hover:border-blue-400 dark:hover:border-blue-500 rounded-lg transition"
          >
            📅 What's today?
          </button>
          <button
            onClick={() => handleSendMessage('Add meeting tomorrow at 2pm in Office')}
            className="whitespace-nowrap px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#2C2C2E] hover:border-blue-400 dark:hover:border-blue-500 rounded-lg transition"
          >
            ➕ Add meeting tomorrow
          </button>
          <button
            onClick={() => handleSendMessage('Summarize my events count')}
            className="whitespace-nowrap px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#2C2C2E] hover:border-blue-400 dark:hover:border-blue-500 rounded-lg transition"
          >
            📊 Schedule summary
          </button>
          <button
            onClick={() => handleSendMessage('Delete an event')}
            className="whitespace-nowrap px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#2C2C2E] hover:border-red-400 dark:hover:border-red-500 rounded-lg transition text-red-600 dark:text-red-400"
          >
            🗑️ Delete event
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content */}
              <div className={`max-w-[85%] space-y-2`}>
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-100 dark:bg-[#1C1C1E] text-slate-800 dark:text-zinc-200 border border-slate-200/80 dark:border-[#2C2C2E] rounded-tl-none shadow-xs'
                  }`}
                >
                  {msg.text}
                </div>

                {/* DELETE CONFIRMATION INTERACTIVE CARD */}
                {msg.action === 'CONFIRM_DELETE' && msg.eventData?.targetId && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-xl space-y-2.5">
                    <div className="flex items-center space-x-1.5 text-red-700 dark:text-red-400 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Confirm Event Deletion</span>
                    </div>

                    <div className="text-[11px] text-slate-700 dark:text-zinc-300 bg-white/80 dark:bg-black/40 p-2 rounded-lg border border-red-100 dark:border-red-900/40 space-y-1 font-mono">
                      <div>
                        <strong>Event:</strong> {msg.eventData.targetTitle}
                      </div>
                      <div>
                        <strong>Date:</strong> {msg.eventData.targetStart}{' '}
                        {msg.eventData.targetTime && `at ${msg.eventData.targetTime}`}
                      </div>
                    </div>

                    {msg.actionStatus === 'pending' ? (
                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          onClick={() => handleConfirmDelete(msg.id, msg.eventData!.targetId!)}
                          className="flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Confirm Delete</span>
                        </button>
                        <button
                          onClick={() => handleCancelDelete(msg.id)}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-[#2C2C2E] hover:bg-slate-300 dark:hover:bg-[#3A3A3C] text-slate-800 dark:text-zinc-200 text-xs font-bold transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : msg.actionStatus === 'completed' ? (
                      <div className="flex items-center space-x-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <Check className="w-4 h-4" />
                        <span>Deleted successfully</span>
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-slate-500">Deletion cancelled</div>
                    )}
                  </div>
                )}

                {/* ADD EVENT CONFIRMATION BADGE */}
                {msg.action === 'ADD_EVENT' && msg.eventData && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl flex items-center space-x-2 text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                    <Plus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      Event "{msg.eventData.title}" created for {msg.eventData.start} at{' '}
                      {msg.eventData.startTime}
                    </span>
                  </div>
                )}

                {/* EDIT EVENT CONFIRMATION BADGE */}
                {msg.action === 'EDIT_EVENT' && (
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center space-x-2 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                    <Edit className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Event updated in calendar database!</span>
                  </div>
                )}

                <div className="text-[10px] text-slate-400 font-mono px-1">{msg.timestamp}</div>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center space-x-2 text-slate-400 text-xs py-2">
              <Sparkles className="w-4 h-4 animate-spin text-blue-500" />
              <span>AI Assistant is analyzing schedule & preparing response...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 dark:border-[#2C2C2E] bg-slate-50 dark:bg-[#1C1C1E]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type e.g. 'Add team sync tomorrow at 3pm' or 'Delete Gym event'..."
              className="flex-1 bg-white dark:bg-[#050505] border border-slate-300 dark:border-[#2C2C2E] focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none placeholder-slate-400"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isProcessing}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition shadow-sm"
              title="Send to AI Assistant"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
