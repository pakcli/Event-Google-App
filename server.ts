import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // AI Chat Route powered by Gemini API
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(200).json({
          fallbackNeeded: true,
          message: 'Server Gemini API key not set. Using smart client-side AI engine.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const { userPrompt, currentEvents, todayDate, currentUserRole } = req.body;

      // Provide event context to Gemini
      const simplifiedEvents = (currentEvents || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        start: e.start,
        startTime: e.startTime,
        end: e.end,
        endTime: e.endTime,
        location: e.location,
        status: e.status,
        requestedBy: e.requestedBy,
      }));

      const systemInstruction = `
You are the intelligent AI Assistant for "Event Inbox", a calendar & schedule app.
Today's date is: ${todayDate || new Date().toISOString().split('T')[0]}.
Current User Role: ${currentUserRole || 'admin'}.

Here is the current list of events in the calendar database:
${JSON.stringify(simplifiedEvents, null, 2)}

Your job is to analyze the user's prompt and generate a JSON response with:
1. "reply": A friendly, helpful, conversational answer in natural language explaining what you found or what action you are taking/requesting confirmation for.
2. "action": One of ["ADD_EVENT", "EDIT_EVENT", "CONFIRM_DELETE", "EXECUTE_DELETE", "NONE"]
3. "eventData":
   - For ADD_EVENT: { title, type ('work'|'social'|'reminder'|'other'), start (YYYY-MM-DD), startTime (HH:MM), end, endTime, location, description }
   - For EDIT_EVENT: { targetId, updates: { title, type, start, startTime, end, endTime, location, description } }
   - For CONFIRM_DELETE: { targetId, targetTitle, targetStart, targetTime }
   - For EXECUTE_DELETE: { targetId }
   - For NONE: null

RULES FOR DELETE:
- If the user asks to delete an event, NEVER delete immediately without user confirmation!
- Set action = "CONFIRM_DELETE" and specify targetId, targetTitle, targetStart, targetTime in eventData.
- In your "reply", ask the user to confirm deleting that specific event.

RULES FOR Q&A:
- If user asks about schedule (e.g. "What do I have today?", "Any work meetings?"), answer clearly based on the provided list of events. Set action = "NONE".

Output ONLY valid JSON matching this structure! Do not include markdown code block backticks if possible, or use standard raw JSON.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              action: { type: Type.STRING },
              eventData: {
                type: Type.OBJECT,
                properties: {
                  targetId: { type: Type.STRING },
                  targetTitle: { type: Type.STRING },
                  targetStart: { type: Type.STRING },
                  targetTime: { type: Type.STRING },
                  title: { type: Type.STRING },
                  type: { type: Type.STRING },
                  start: { type: Type.STRING },
                  startTime: { type: Type.STRING },
                  end: { type: Type.STRING },
                  endTime: { type: Type.STRING },
                  location: { type: Type.STRING },
                  description: { type: Type.STRING },
                  updates: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      type: { type: Type.STRING },
                      start: { type: Type.STRING },
                      startTime: { type: Type.STRING },
                      end: { type: Type.STRING },
                      endTime: { type: Type.STRING },
                      location: { type: Type.STRING },
                      description: { type: Type.STRING },
                    },
                  },
                },
              },
            },
            required: ['reply', 'action'],
          },
        },
      });

      const responseText = response.text || '';
      const parsed = JSON.parse(responseText);
      return res.json({ success: true, ...parsed });
    } catch (err: any) {
      console.error('Gemini API Chat error:', err);
      return res.status(200).json({
        fallbackNeeded: true,
        error: err.message,
        message: 'Falling back to client-side smart AI engine.',
      });
    }
  });

  // Vite development middleware vs production static
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
