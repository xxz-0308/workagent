<script lang="ts">
  import { onMount } from 'svelte';
  import { Plus, MessageSquare, Trash2, Bot } from 'lucide-svelte';
  import MessageBubble from './MessageBubble.svelte';
  import ChatInput from './ChatInput.svelte';
  import AppleConfirmModal from '../shared/AppleConfirmModal.svelte';
  import { fetchJson, sendChatMessage } from '../../api/client';

  let conversations: any[] = [];
  let currentConversationId: string = 'conv-default';
  let messages: any[] = [];
  let isSending: boolean = false;
  let chatScrollEl: HTMLDivElement;

  // Confirm delete state
  let showConfirmDelete: boolean = false;
  let targetDeleteConvId: string | null = null;
  let targetDeleteConvTitle: string = '';

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

  function promptDeleteConversation(id: string, title: string) {
    targetDeleteConvId = id;
    targetDeleteConvTitle = title || '对话';
    showConfirmDelete = true;
  }

  async function confirmDeleteConversation() {
    if (!targetDeleteConvId) return;
    try {
      await fetchJson(`/chat/conversations/${targetDeleteConvId}`, { method: 'DELETE' });
      showConfirmDelete = false;
      targetDeleteConvId = null;
      await loadConversations();
    } catch (err: any) {
      alert(`删除对话失败: ${err.message}`);
    }
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
          <div class="conv-item-wrap {currentConversationId === c.id ? 'active' : ''}">
            <button
              class="conv-item"
              on:click={() => loadMessages(c.id)}
            >
              <MessageSquare size={15} class="conv-icon" />
              <span class="conv-title">{c.title || '新定位对话'}</span>
            </button>
            <button
              class="del-conv-btn"
              on:click|stopPropagation={() => promptDeleteConversation(c.id, c.title)}
              title="删除此对话"
            >
              <Trash2 size={13} />
            </button>
          </div>
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

<!-- Custom Delete Confirmation Modal -->
<AppleConfirmModal
  open={showConfirmDelete}
  title="删除对话"
  message={`确定要删除对话 『${targetDeleteConvTitle}』 吗？此对话对应的全部历史聊天记录将被永久移除。`}
  confirmText="确认删除"
  onConfirm={confirmDeleteConversation}
  onCancel={() => { showConfirmDelete = false; targetDeleteConvId = null; }}
/>

<style>
  .chat-container {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 16px;
    height: calc(100vh - 85px);
    padding: 0 20px 20px 20px;
    max-width: 1280px;
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
    justify-content: center;
  }

  .conversations-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    flex: 1;

  }

  .empty-hint {
    padding: 20px 0;
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
  }

  .conv-item-wrap {
    display: flex;
    align-items: center;
    border-radius: var(--radius-md);
    background: transparent;
    transition: background var(--transition-fast);
  }

  .conv-item-wrap:hover {
    background: var(--glass-bg-hover);
  }

  .conv-item-wrap.active {
    background: rgba(124, 110, 248, 0.15);
    border: 1px solid rgba(124, 110, 248, 0.3);
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
    flex: 1;
    overflow: hidden;
  }

  .conv-item-wrap.active .conv-item {
    color: var(--accent-blue);
    font-weight: 600;
  }

  .conv-icon {
    flex-shrink: 0;
  }

  .conv-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .del-conv-btn {
    padding: 6px 8px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    opacity: 0;
    transition: opacity var(--transition-fast), color var(--transition-fast);
  }

  .conv-item-wrap:hover .del-conv-btn {
    opacity: 1;
  }

  .del-conv-btn:hover {
    color: var(--status-high);
  }

  .chat-main {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 10px 4px 20px 4px;
    display: flex;
    flex-direction: column;
  }

  .welcome-banner {
    margin: auto;
    max-width: 500px;
    padding: 32px 24px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .bot-badge {
    width: 60px;
    height: 60px;
    border-radius: 18px;
    background: linear-gradient(135deg, var(--accent-blue), var(--accent-indigo));
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-md);
  }

  .welcome-banner h2 {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .welcome-banner p {
    font-size: 13.5px;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .chat-input-area {
    padding-top: 10px;
    flex-shrink: 0;
  }
</style>
