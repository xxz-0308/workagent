const API_BASE = '/api';

export async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${url}`, options);
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Parse a single SSE frame into { event, data }.
 * Handles: multiline data fields, event before or after data, comments.
 */
function parseSSEFrame(frame: string): { event: string; data: string } | null {
  let event = 'message';
  const dataLines: string[] = [];

  for (const raw of frame.split('\n')) {
    const line = raw.trimEnd();
    if (!line || line.startsWith(':')) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const field = line.slice(0, colonIdx);
    let value = line.slice(colonIdx + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    if (field === 'event') {
      event = value;
    } else if (field === 'data') {
      dataLines.push(value);
    }
  }

  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

export function sendChatMessage(
  conversationId: string,
  content: string,
  onChunk: (chunk: string) => void,
  onToolCall?: (tool: any) => void
): { promise: Promise<string>; abort: () => void } {
  const controller = new AbortController();

  // Batch chunk updates to reduce array copies in Svelte reactivity
  let chunkBatch = '';
  let batchTimer: ReturnType<typeof setTimeout> | null = null;

  function flushBatch() {
    if (chunkBatch) {
      onChunk(chunkBatch);
      chunkBatch = '';
    }
    batchTimer = null;
  }

  const promise = new Promise<string>((resolve, reject) => {
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
        // SSE frames are separated by double newlines
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const frame = parseSSEFrame(part);
          if (!frame) continue;

          try {
            const data = JSON.parse(frame.data);
            if (frame.event === 'chunk') {
              fullResponse += data.text;
              chunkBatch += data.text;
              if (!batchTimer) {
                batchTimer = setTimeout(flushBatch, 30);
              }
            } else if (frame.event === 'tool_call' && onToolCall) {
              flushBatch();
              onToolCall(data);
            } else if (frame.event === 'done') {
              flushBatch();
              resolve(data.fullResponse || fullResponse);
            } else if (frame.event === 'error') {
              flushBatch();
              reject(new Error(data.error));
            }
          } catch {
            // JSON parse failure on a frame — skip
          }
        }
      }
      flushBatch();
      resolve(fullResponse);
    }).catch(err => {
      flushBatch();
      if (err.name === 'AbortError') {
        resolve('');
      } else {
        reject(err);
      }
    });
  });

  return { promise, abort: () => controller.abort() };
}
