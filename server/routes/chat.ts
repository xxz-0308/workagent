import { Router } from 'express';
import {
  getConversations,
  deleteConversation,
  updateConversationTitle,
  getMessages,
  saveMessage,
  getSettings
} from '../db/database.js';
import { runAgentConversation } from '../agent/llm-client.js';

export const chatRouter = Router();

// Create conversation with optional initial message
chatRouter.post('/conversations', (req, res) => {
  try {
    const { id, initialMessage } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });

    if (initialMessage) {
      saveMessage({
        conversation_id: id,
        role: 'assistant',
        content: initialMessage
      });
    }
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get conversation list
chatRouter.get('/conversations', (req, res) => {
  try {
    const { search } = req.query;
    const list = getConversations();

    if (search && typeof search === 'string' && search.trim()) {
      const keyword = search.trim().toLowerCase();
      const filtered = list.filter(conv => conv.title.toLowerCase().includes(keyword));
      return res.json(filtered);
    }

    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete conversation
chatRouter.delete('/conversations/:id', (req, res) => {
  try {
    deleteConversation(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update conversation title
chatRouter.patch('/conversations/:id', (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    const updated = updateConversationTitle(req.params.id, title.trim());
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate conversation title via LLM
chatRouter.post('/conversations/:id/generate-title', async (req, res) => {
  try {
    const msgs = getMessages(req.params.id);
    if (msgs.length === 0) {
      return res.json({ title: '新对话' });
    }

    // Take first user message to generate title
    const firstUserMsg = msgs.find(m => m.role === 'user');
    if (!firstUserMsg) {
      return res.json({ title: '新对话' });
    }

    const settings = getSettings();
    if (!settings.apiKey) {
      return res.status(400).json({ error: '请先配置 API Key' });
    }

    const url = `${settings.baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model || 'gpt-4o',
        messages: [
          { role: 'system', content: '你是一个技术对话标题生成器。根据用户消息提取核心技术主题，生成一个精炼的标题（8-15个汉字）。规则：1) 提取关键服务名/组件名+核心问题/操作 2) 如涉及具体服务如GaussDB/PT数据库/CGPLite等务必保留 3) 不要用"新对话""关于""讨论"之类空洞词 4) 只输出标题本身，无引号无标点' },
          { role: 'user', content: firstUserMsg.content.slice(0, 300) }
        ],
        max_tokens: 256,
        temperature: 0.3
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      return res.status(502).json({ error: `API 返回错误: ${response.status}` });
    }

    const data = await response.json() as any;
    const msg = data.choices?.[0]?.message || {};
    let raw = msg.content?.trim() || '';

    // Fallback: for reasoning models, extract from reasoning_content if content is empty
    if (!raw && msg.reasoning_content) {
      const rc = msg.reasoning_content;
      // Try to find the actual title after reasoning — look for patterns like "标题：xxx" or last sentence
      const m = rc.match(/(?:标题|命名)[：:]\s*(.+?)(?:[。！？\n]|$)/i);
      raw = m ? m[1].trim() : '';
      if (!raw) {
        // Take the last "sentence" that looks like a title
        const parts = rc.split(/[。！？\n]/);
        const last = parts.filter(p => p.trim().length >= 4 && p.trim().length <= 20).pop();
        raw = last ? last.trim() : '';
      }
    }

    // Clean up
    let title = raw
      .replace(/^["「『\s]+|["」』\s]+$/g, '')
      .replace(/^(标题|对话标题|好的|根据|以下|可以|需要|应)[：:，,\s]*/i, '')
      .replace(/[。！？；、\n\r]/g, '')
      .replace(/^[,，\s]+|[,，\s]+$/g, '')
      .trim()
      .slice(0, 30);
    console.log('[generate-title] raw:', JSON.stringify(raw?.slice(0, 80)), '→ cleaned:', JSON.stringify(title));

    // Reject useless titles
    const useless = ['', '新对话', '新定位探讨', '对话', '讨论', '问题', '咨询', '无', '标题', '命名'];
    if (!title || useless.includes(title) || title.length < 2) {
      title = firstUserMsg.content.slice(0, 25).replace(/\n/g, ' ');
    }

    // Save to DB
    updateConversationTitle(req.params.id, title);
    res.json({ title });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '生成标题失败' });
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
