<script lang="ts">
  import { marked } from 'marked';
  import { Bot, User, Wrench, CheckCircle2, AlertCircle } from 'lucide-svelte';

  export let role: 'user' | 'assistant' | 'system';
  export let content: string = '';
  export let toolCalls: any[] = [];
  export let isStreaming: boolean = false;

  $: htmlContent = marked.parse(content || '');
</script>

<div class="message-bubble-wrapper {role}">
  <div class="avatar">
    {#if role === 'assistant'}
      <Bot size={18} />
    {:else}
      <User size={18} />
    {/if}
  </div>

  <div class="bubble-body">
    <div class="sender-name">
      {role === 'assistant' ? 'WorkAgent 智能助手' : '你'}
    </div>

    <!-- Tool calls executed by agent -->
    {#if toolCalls && toolCalls.length > 0}
      <div class="tool-calls-container">
        {#each toolCalls as tc}
          <div class="tool-chip">
            <Wrench size={14} class="tool-icon" />
            <span class="tool-name">调用工具: <code>{tc.toolName || tc.name}</code></span>
            {#if tc.result?.error}
              <AlertCircle size={14} class="err-icon" />
            {:else}
              <CheckCircle2 size={14} class="success-icon" />
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Content -->
    <div class="markdown-body">
      {@html htmlContent}
      {#if isStreaming}
        <span class="typing-dots">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </span>
      {/if}
    </div>
  </div>
</div>

<style>
  .message-bubble-wrapper {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .avatar {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .user .avatar {
    background: linear-gradient(135deg, #007aff, #5856d6);
    color: #fff;
  }

  .assistant .avatar {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid var(--glass-border);
    color: var(--accent-blue);
  }

  .bubble-body {
    max-width: 82%;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .sender-name {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-muted);
  }

  .markdown-body {
    padding: 14px 18px;
    border-radius: var(--radius-lg);
    font-size: 14px;
    line-height: 1.6;
    word-break: break-word;
  }

  .user .markdown-body {
    background: var(--accent-blue);
    color: #ffffff;
    border-bottom-right-radius: 4px;
  }

  .assistant .markdown-body {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    color: var(--text-primary);
    border-bottom-left-radius: 4px;
  }

  .markdown-body :global(p) {
    margin-bottom: 10px;
  }

  .markdown-body :global(p:last-child) {
    margin-bottom: 0;
  }

  .markdown-body :global(ul), .markdown-body :global(ol) {
    padding-left: 20px;
    margin-bottom: 10px;
  }

  .markdown-body :global(code) {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12.5px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.12);
  }

  .markdown-body :global(pre) {
    background: rgba(0, 0, 0, 0.4);
    padding: 12px 16px;
    border-radius: var(--radius-md);
    overflow-x: auto;
    margin: 10px 0;
  }

  .tool-calls-container {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 4px;
  }

  .tool-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 8px;
    background: rgba(0, 122, 255, 0.12);
    border: 1px solid rgba(0, 122, 255, 0.25);
    color: var(--accent-blue);
    font-size: 12px;
    animation: chipIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes chipIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }

  .tool-chip code {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
  }

  .success-icon { color: var(--status-low); }
  .err-icon { color: var(--status-high); }

  /* Bouncing dots for streaming indicator */
  .typing-dots {
    display: inline-flex;
    gap: 4px;
    align-items: flex-end;
    margin-left: 6px;
    vertical-align: middle;
    height: 18px;
  }

  .typing-dots .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent-mid);
    animation: bounce 1.2s infinite cubic-bezier(0.16, 1, 0.3, 1);
  }

  .typing-dots .dot:nth-child(2) { animation-delay: 0.15s; }
  .typing-dots .dot:nth-child(3) { animation-delay: 0.3s; }

  @keyframes bounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-6px); opacity: 1; }
  }
</style>
