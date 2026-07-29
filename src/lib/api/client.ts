const API_BASE = '/api';

export async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${url}`, options);
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function sendChatMessage(
  conversationId: string,
  content: string,
  onChunk: (chunk: string) => void,
  onToolCall?: (tool: any) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();

    fetch(`${API_BASE}/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, content }),
      signal: controller.signal
    }).then(async (response) => {
      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullResponse = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          let eventType = 'message';
          let dataStr = '';

          const eventMatch = line.match(/^event:\s*(.+)$/m);
          if (eventMatch) eventType = eventMatch[1].trim();

          const dataMatch = line.match(/^data:\s*(.+)$/m);
          if (dataMatch) dataStr = dataMatch[1].trim();

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (eventType === 'chunk') {
              fullResponse += data.text;
              onChunk(data.text);
            } else if (eventType === 'tool_call' && onToolCall) {
              onToolCall(data);
            } else if (eventType === 'done') {
              resolve(data.fullResponse || fullResponse);
            } else if (eventType === 'error') {
              reject(new Error(data.error));
            }
          } catch {}
        }
      }
      resolve(fullResponse);
    }).catch(err => {
      reject(err);
    });
  });
}
