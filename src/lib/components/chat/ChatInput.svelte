<script lang="ts">
  import { Send, Sparkles } from 'lucide-svelte';

  export let disabled: boolean = false;
  export let onSend: (text: string) => void;

  let text: string = '';

  const quickPrompts = [
    'CSP 23.1 版本出补丁，要合入哪些已知问题？',
    '记录一下：CSP 23.1 GaussDB 连接池超时问题，根因配置失效',
    '回顾之前关于 PT数据库 锁等待超时的定位结论与修复版本',
    '设置规则：CSP 的版本格式是 23.0 23.1 24.0 24.1，PT数据库跨 CGP 与 CSP'
  ];

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    text = '';
  }

  function selectPrompt(prompt: string) {
    text = prompt;
  }
</script>

<div class="chat-input-wrapper">
  <!-- Quick prompt pills -->
  <div class="prompts-bar">
    <span class="prompts-title"><Sparkles size={12} /> 快捷探讨：</span>
    <div class="pills-scroll">
      {#each quickPrompts as prompt}
        <button class="prompt-pill" on:click={() => selectPrompt(prompt)} {disabled}>
          {prompt}
        </button>
      {/each}
    </div>
  </div>

  <div class="input-box glass-panel">
    <textarea
      bind:value={text}
      placeholder="描述问题现象/请求回忆问题/询问补丁合入/设置版本规则... (Shift+Enter 换行)"
      on:keydown={handleKeyDown}
      {disabled}
      rows={2}
    ></textarea>

    <div class="input-footer">
      <span class="tip">WorkAgent 可以通过对话记录问题并自动化规则</span>
      <button class="send-btn apple-button" on:click={submit} disabled={!text.trim() || disabled}>
        <Send size={15} />
        <span>发送</span>
      </button>
    </div>
  </div>
</div>

<style>
  .chat-input-wrapper {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .prompts-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--text-muted);
    overflow: hidden;
  }

  .prompts-title {
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
    font-weight: 500;
  }

  .pills-scroll {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .prompt-pill {
    white-space: nowrap;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    color: var(--text-secondary);
    font-size: 12px;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .prompt-pill:hover:not(:disabled) {
    background: var(--glass-bg-hover);
    color: var(--text-primary);
    border-color: var(--accent-blue);
  }

  .input-box {
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  textarea {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-family: inherit;
    font-size: 14px;
    resize: none;
    line-height: 1.5;
  }

  textarea::placeholder {
    color: var(--text-muted);
  }

  .input-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 6px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .tip {
    font-size: 11px;
    color: var(--text-muted);
  }

  .send-btn {
    padding: 6px 14px;
    font-size: 13px;
  }
</style>
