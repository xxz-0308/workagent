<script lang="ts">
  import { onMount } from 'svelte';
  import { Plus, MessageSquare, Trash2, Bot } from 'lucide-svelte';
  import MessageBubble from './MessageBubble.svelte';
  import ChatInput from './ChatInput.svelte';
  import { fetchJson, sendChatMessage } from '../../api/client';

  let conversations: any[] = [];
  let currentConversationId: string = 'conv-default';
  let messages: any[] = [];
  let isSending: boolean = false;
  let chatScrollEl: HTMLDivElement;

  onMount(() => {
    const savedConvId = localStorage.getItem('workagent_active_conv_id');
    if (savedConvId) {
      currentConversationId = savedConvId;
    }
    loadConversations();
  });

  async function loadConversations() {
    try {
      conversations = await fetchJson('/chat/conversations');
      const savedConvId = localStorage.getItem('workagent_active_conv_id');
      if (savedConvId && conversations.some(c => c.id === savedConvId)) {
        currentConversationId = savedConvId;
      } else if (conversations.length > 0) {
        currentConversationId = conversations[0].id;
      }
      if (currentConversationId) {
        loadMessages(currentConversationId);
      }
    } catch {}
  }

  async function loadMessages(convId: string) {
    currentConversationId = convId;
    localStorage.setItem('workagent_active_conv_id', convId);
    try {
      messages = await fetchJson(`/chat/conversations/${convId}/messages`);
      scrollToBottom();
    } catch {
      messages = [];
    }
  }

  function startNewConversation() {
    const newId = `conv-${Date.now()}`;
    currentConversationId = newId;
    messages = [
      {
        role: 'assistant',
        content: '你好！我是 WorkAgent。你可以向我描述具体的在研/现网问题，提供错误日志或服务信息，我能帮你做定位方向排查、记录问题、固化版本划分规则，并在版本出补丁时为你整理完整的待合入清单。'
      }
    ];
    conversations = [{ id: newId, title: '新定位探讨', updated_at: new Date().toISOString() }, ...conversations];
  }

  async function handleSend(text: string) {
    if (isSending) return;

    // Add user message locally
    messages = [...messages, { role: 'user', content: text }];
    scrollToBottom();

    // Prepare assistant placeholder message
    const assistantIndex = messages.length;
    messages = [
      ...messages,
      { role: 'assistant', content: '', toolCalls: [], isStreaming: true }
    ];
    isSending = true;

    try {
      await sendChatMessage(
        currentConversationId,
        text,
        (chunk) => {
          messages[assistantIndex].content += chunk;
          messages = [...messages];
          scrollToBottom();
        },
        (toolData) => {
          messages[assistantIndex].toolCalls = [
            ...(messages[assistantIndex].toolCalls || []),
            toolData
          ];
          messages = [...messages];
        }
      );
    } catch (err: any) {
      messages[assistantIndex].content += `\n\n❌ **请求遇到错误**: ${err.message || '请检查设置中 API Key 与 BaseURL 是否正确'}`;
    } finally {
      messages[assistantIndex].isStreaming = false;
      messages = [...messages];
      isSending = false;
      loadConversations();
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (chatScrollEl) {
        chatScrollEl.scrollTop = chatScrollEl.scrollHeight;
      }
    }, 50);
  }
</script>

<div class="chat-container">
  <!-- Conversation Sidebar -->
  <aside class="chat-sidebar glass-panel">
    <div class="sidebar-header">
      <span class="sidebar-title">定位与探讨对话</span>
      <button class="new-chat-btn apple-button" on:click={startNewConversation}>
        <Plus size={16} />
        <span>新建对话</span>
      </button>
    </div>

    <div class="conversations-list">
      {#if conversations.length === 0}
        <div class="empty-hint">暂无历史对话</div>
      {:else}
        {#each conversations as c}
          <button
            class="conv-item {currentConversationId === c.id ? 'active' : ''}"
            on:click={() => loadMessages(c.id)}
          >
            <MessageSquare size={16} class="conv-icon" />
            <span class="conv-title">{c.title || '新定位对话'}</span>
          </button>
        {/each}
      {/if}
    </div>
  </aside>

  <!-- Chat Main Area -->
  <main class="chat-main">
    <div class="chat-messages" bind:this={chatScrollEl}>
      {#if messages.length === 0}
        <div class="welcome-banner glass-panel">
          <div class="bot-badge"><Bot size={32} /></div>
          <h2>欢迎使用 WorkAgent</h2>
          <p>智能协助定位问题、记忆历史经验、按产品版本整理补丁清单，并自动固化划分规则。</p>
        </div>
      {:else}
        {#each messages as msg}
          <MessageBubble
            role={msg.role}
            content={msg.content}
            toolCalls={msg.toolCalls}
            isStreaming={msg.isStreaming}
          />
        {/each}
      {/if}
    </div>

    <div class="chat-input-area">
      <ChatInput disabled={isSending} onSend={handleSend} />
    </div>
  </main>
</div>

<style>
  .chat-container {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 20px;
    height: calc(100vh - 60px);
    padding: 20px;
    max-width: 1600px;
    margin: 0 auto;
  }

  .chat-sidebar {
    display: flex;
    flex-direction: column;
    padding: 16px;
    gap: 16px;
    height: 100%;
    overflow: hidden;
  }

  .sidebar-header {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sidebar-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .new-chat-btn {
    width: 100%;
  }

  .conversations-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    flex: 1;
  }

  .conv-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    transition: all var(--transition-fast);
  }

  .conv-item:hover {
    background: var(--glass-bg-hover);
    color: var(--text-primary);
  }

  .conv-item.active {
    background: rgba(0, 122, 255, 0.15);
    color: var(--accent-blue);
    border: 1px solid rgba(0, 122, 255, 0.3);
    font-weight: 500;
  }

  .conv-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chat-main {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    gap: 16px;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding-right: 8px;
    display: flex;
    flex-direction: column;
  }

  .welcome-banner {
    margin: auto;
    padding: 40px;
    text-align: center;
    max-width: 540px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }

  .bot-badge {
    width: 60px;
    height: 60px;
    border-radius: 20px;
    background: linear-gradient(135deg, var(--accent-blue), var(--accent-indigo));
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    box-shadow: 0 8px 20px rgba(0, 122, 255, 0.35);
  }

  .empty-hint {
    font-size: 13px;
    color: var(--text-muted);
    text-align: center;
    padding: 20px 0;
  }
</style>
