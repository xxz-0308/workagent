<script lang="ts">
  import { onMount } from 'svelte';
  import { Plus, MessageSquare, Trash2, Bot, RefreshCw, Pencil } from 'lucide-svelte';
  import MessageBubble from './MessageBubble.svelte';
  import ChatInput from './ChatInput.svelte';
  import AppleConfirmModal from '../shared/AppleConfirmModal.svelte';
  import { fetchJson, sendChatMessage } from '../../api/client';
  import { toastError } from '../../stores/toast';

  let conversations: any[] = [];
  let currentConversationId: string = 'conv-default';
  let messages: any[] = [];
  let isSending: boolean = false;
  let chatScrollEl: HTMLDivElement;
  let loadingMessages: boolean = false;
  let loadMessagesSeq: number = 0; // race condition guard
  let activeAbort: (() => void) | null = null;
  let convSearch: string = '';
  let editingConvId: string | null = null;
  let editingTitle: string = '';
  let generatingTitle: string | null = null;

  $: filteredConversations = convSearch.trim()
    ? conversations.filter(c => (c.title || '').toLowerCase().includes(convSearch.toLowerCase()))
    : conversations;

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
      // Only switch conversation if we're not actively sending/streaming
      if (!isSending) {
        if (savedConvId && conversations.some(c => c.id === savedConvId)) {
          currentConversationId = savedConvId;
        } else if (conversations.length > 0) {
          currentConversationId = conversations[0].id;
        }
      }
      // Load messages only if none are currently displayed
      if (currentConversationId && messages.length === 0) {
        loadMessages(currentConversationId);
      }
    } catch {}
  }

  /** Refresh just the conversation list without switching or reloading messages */
  async function refreshConversationList() {
    try {
      conversations = await fetchJson('/chat/conversations');
    } catch {}
  }

  async function loadMessages(convId: string) {
    // Abort any in-progress streaming
    if (activeAbort) {
      activeAbort();
      activeAbort = null;
    }
    isSending = false;
    currentConversationId = convId;
    localStorage.setItem('workagent_active_conv_id', convId);
    const seq = ++loadMessagesSeq;
    loadingMessages = true;
    try {
      const msgs = await fetchJson(`/chat/conversations/${convId}/messages`);
      // Only apply if no newer loadMessages call has started
      if (seq === loadMessagesSeq) {
        messages = msgs;
        scrollToBottom();
      }
    } catch {
      if (seq === loadMessagesSeq) {
        messages = [];
      }
    } finally {
      if (seq === loadMessagesSeq) {
        loadingMessages = false;
      }
    }
  }

  async function startNewConversation() {
    const newId = `conv-${Date.now()}`;
    currentConversationId = newId;
    localStorage.setItem('workagent_active_conv_id', newId);
    const welcomeContent = '你好！我是 WorkAgent。你可以向我描述具体的在研/现网问题，提供错误日志或服务信息，我能帮你做定位方向排查、记录问题、固化版本划分规则，并在版本出补丁时为你整理完整的待合入清单。';
    messages = [
      {
        role: 'assistant',
        content: welcomeContent
      }
    ];
    conversations = [{ id: newId, title: '新定位探讨', updated_at: new Date().toISOString() }, ...conversations];

    // Persist to DB
    try {
      await fetchJson('/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newId, initialMessage: welcomeContent })
      });
    } catch {}
  }

  function startEditTitle(convId: string, currentTitle: string) {
    editingConvId = convId;
    editingTitle = currentTitle;
  }

  async function saveEditTitle(convId: string) {
    const title = editingTitle.trim();
    if (!title || title === (conversations.find(c => c.id === convId)?.title || '')) {
      editingConvId = null;
      return;
    }
    try {
      await fetchJson(`/chat/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      // Update local state
      const conv = conversations.find(c => c.id === convId);
      if (conv) conv.title = title;
      conversations = [...conversations];
    } catch (err: any) {
      toastError(`重命名失败: ${err.message}`);
    } finally {
      editingConvId = null;
    }
  }

  async function generateTitle(convId: string) {
    generatingTitle = convId;
    try {
      const result = await fetchJson(`/chat/conversations/${convId}/generate-title`, { method: 'POST' });
      if (result.title) {
        const conv = conversations.find(c => c.id === convId);
        if (conv) conv.title = result.title;
        conversations = [...conversations];
      }
    } catch (err: any) {
      toastError(`生成标题失败: ${err.message}`);
    } finally {
      generatingTitle = null;
    }
  }

  // Auto-generate title once, only after the first user message in a conversation
  async function maybeAutoGenerateTitle(convId: string) {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    // Only trigger on the first exchange: exactly 1 user message in the current view
    const userMsgCount = messages.filter(m => m.role === 'user').length;
    if (userMsgCount !== 1) return;
    // Trigger if title looks auto-generated
    const isAutoTitle = conv.title === '新定位探讨' || conv.title === '新对话' || conv.title.length > 20;
    if (isAutoTitle) {
      generateTitle(convId);
    }
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
      toastError(`删除对话失败: ${err.message}`);
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
      const { promise, abort } = sendChatMessage(
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
      activeAbort = abort;
      await promise;
    } catch (err: any) {
      messages[assistantIndex].content += `\n\n❌ **请求遇到错误**: ${err.message || '请检查设置中 API Key 与 BaseURL 是否正确'}`;
    } finally {
      messages[assistantIndex].isStreaming = false;
      messages = [...messages];
      isSending = false;
      activeAbort = null;
      refreshConversationList();
      maybeAutoGenerateTitle(currentConversationId);
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
      <input
        type="text"
        class="apple-input conv-search-input"
        placeholder="搜索对话..."
        bind:value={convSearch}
      />
      {#if filteredConversations.length === 0}
        <div class="empty-hint">{conversations.length === 0 ? '暂无历史对话' : '无匹配结果'}</div>
      {:else}
        {#each filteredConversations as c}
          <div class="conv-item-wrap {currentConversationId === c.id ? 'active' : ''}">
            <button
              class="conv-item"
              on:click={() => loadMessages(c.id)}
            >
              <span class="conv-icon"><MessageSquare size={15} /></span>
              {#if editingConvId === c.id}
                <input
                  type="text"
                  class="apple-input conv-title-edit"
                  bind:value={editingTitle}
                  on:keydown={(e) => {
                    if (e.key === 'Enter') saveEditTitle(c.id);
                    if (e.key === 'Escape') editingConvId = null;
                  }}
                  on:blur={() => saveEditTitle(c.id)}
                />
              {:else}
                <span
                  class="conv-title"
                  title="双击编辑标题"
                  on:dblclick={() => startEditTitle(c.id, c.title || '新定位对话')}
                >
                  {c.title || '新定位对话'}
                </span>
              {/if}
            </button>
            {#if generatingTitle === c.id}
              <span class="conv-action-btn spinning" title="生成中..."><RefreshCw size={12} /></span>
            {:else}
              <button
                class="conv-action-btn"
                on:click|stopPropagation={() => generateTitle(c.id)}
                title="AI 重新命名"
              >
                <RefreshCw size={12} />
              </button>
            {/if}
            <button
              class="conv-action-btn"
              on:click|stopPropagation={() => startEditTitle(c.id, c.title || '新定位对话')}
              title="手动重命名"
            >
              <Pencil size={12} />
            </button>
            <button
              class="conv-action-btn del-btn"
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

  .conv-search-input {
    padding: 7px 10px;
    font-size: 12px;
    flex-shrink: 0;
    margin-bottom: 6px;
    border-radius: var(--radius-md);
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
    cursor: default;
  }

  .conv-title-edit {
    padding: 2px 6px;
    font-size: 12px;
    height: 24px;
    width: 100%;
    box-sizing: border-box;
  }

  .conv-action-btn {
    padding: 4px 6px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    opacity: 0;
    transition: opacity var(--transition-fast), color var(--transition-fast);
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .conv-item-wrap:hover .conv-action-btn {
    opacity: 1;
  }

  .conv-action-btn:hover {
    color: var(--text-primary);
  }

  .conv-action-btn.del-btn:hover {
    color: var(--status-high);
  }

  .conv-action-btn.spinning {
    opacity: 1;
    animation: spin 1s linear infinite;
    color: var(--accent-blue);
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
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
