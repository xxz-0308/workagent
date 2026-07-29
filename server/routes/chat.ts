import { Router } from 'express';
import {
  getConversations,
  getMessages,
  saveMessage
} from '../db/database.js';
import { runAgentConversation } from '../agent/llm-client.js';

export const chatRouter = Router();

// Get conversation list
chatRouter.get('/conversations', (req, res) => {
  try {
    const list = getConversations();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages for conversation
chatRouter.get('/conversations/:id/messages', (req, res) => {
  try {
    const msgs = getMessages(req.params.id);
    res.json(msgs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send message & stream Agent response via SSE
chatRouter.post('/send', async (req, res) => {
  const { conversationId, content } = req.body;
  if (!conversationId || !content) {
    return res.status(400).json({ error: 'conversationId and content are required' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // 1. Save user message
    saveMessage({
      conversation_id: conversationId,
      role: 'user',
      content
    });

    // 2. Fetch history
    const history = getMessages(conversationId);

    // 3. Run Agent Conversation
    let fullResponse = '';

    await runAgentConversation(
      history,
      (textChunk) => {
        fullResponse += textChunk;
        sendEvent('chunk', { text: textChunk });
      },
      (toolName, args, result) => {
        sendEvent('tool_call', { toolName, args, result });
      }
    );

    // 4. Save assistant response
    saveMessage({
      conversation_id: conversationId,
      role: 'assistant',
      content: fullResponse
    });

    sendEvent('done', { fullResponse });
    res.end();
  } catch (err: any) {
    sendEvent('error', { error: err.message || '内部处理出错' });
    res.end();
  }
});
