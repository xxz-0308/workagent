import { getSettings } from '../db/database.js';
import { getSystemPrompt } from './system-prompt.js';
import { agentTools, executeTool } from './tools.js';
import type { Message } from '../types.js';

export async function runAgentConversation(
  conversationMessages: Message[],
  onChunk?: (text: string) => void,
  onToolCall?: (toolName: string, args: any, result: any) => void
): Promise<string> {
  const settings = getSettings();
  if (!settings.apiKey) {
    const errorMsg = '⚠️ 请先在【设置】界面配置大模型 API Key（支持 OpenAI / Claude 兼容接口及 Base URL）。';
    if (onChunk) onChunk(errorMsg);
    return errorMsg;
  }

  const systemPrompt = getSystemPrompt();

  // Format messages for OpenAI API
  let messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...conversationMessages.map(m => {
      const msgObj: any = { role: m.role, content: m.content || '' };
      if (m.tool_calls) {
        try {
          msgObj.tool_calls = JSON.parse(m.tool_calls);
        } catch {}
      }
      return msgObj;
    })
  ];

  let loopCount = 0;
  const maxLoops = 6;
  let finalContent = '';

  while (loopCount < maxLoops) {
    loopCount++;

    const payload = {
      model: settings.model || 'gpt-4o',
      messages,
      tools: agentTools,
      tool_choice: 'auto',
      temperature: 0.3
    };

    const baseUrl = settings.baseUrl.endsWith('/') ? settings.baseUrl.slice(0, -1) : settings.baseUrl;
    const url = `${baseUrl}/chat/completions`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM API 响应错误 (${res.status}): ${errText}`);
    }

    const data: any = await res.json();
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error('LLM 返回数据格式异常');
    }

    const assistantMsg = choice.message;

    if (assistantMsg.content) {
      finalContent += assistantMsg.content;
      if (onChunk) onChunk(assistantMsg.content);
    }

    // Check for tool calls
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      messages.push(assistantMsg);

      for (const tc of assistantMsg.tool_calls) {
        const fnName = tc.function.name;
        let fnArgs = {};
        try {
          fnArgs = JSON.parse(tc.function.arguments || '{}');
        } catch {}

        let result: any;
        try {
          result = await executeTool(fnName, fnArgs);
        } catch (err: any) {
          result = { error: err.message };
        }

        if (onToolCall) {
          onToolCall(fnName, fnArgs, result);
        }

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: fnName,
          content: JSON.stringify(result)
        });
      }
      // Continue loop so assistant can synthesize response from tool result
    } else {
      // No more tool calls, exit loop
      break;
    }
  }

  return finalContent;
}
