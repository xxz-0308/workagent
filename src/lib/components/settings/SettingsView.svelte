<script lang="ts">
  import { onMount } from 'svelte';
  import { Key, Globe, Cpu, Check, BookOpen, Moon, Sun, Trash2, Pencil, X, Save } from 'lucide-svelte';
  import { fetchJson } from '../../api/client';
  import { toastError, toastSuccess } from '../../stores/toast';

  export let theme: 'dark' | 'light' = 'dark';
  export let onToggleTheme: () => void;

  let apiKey: string = '';
  let baseUrl: string = 'https://api.openai.com/v1';
  let model: string = 'gpt-4o';
  let isSaved: boolean = false;
  let isTesting: boolean = false;

  let rules: any[] = [];
  let editingRuleId: number | null = null;
  let editRuleCategory: string = '';
  let editRuleContent: string = '';

  onMount(() => {
    loadSettings();
    loadRules();
  });

  async function loadSettings() {
    try {
      const data = await fetchJson('/settings');
      apiKey = data.apiKey || '';
      baseUrl = data.baseUrl || 'https://api.openai.com/v1';
      model = data.model || 'gpt-4o';
    } catch {}
  }

  async function loadRules() {
    try {
      rules = await fetchJson('/topology/rules');
    } catch {}
  }

  function startEditRule(rule: any) {
    editingRuleId = rule.id;
    editRuleCategory = rule.category;
    editRuleContent = rule.content;
  }

  function cancelEditRule() {
    editingRuleId = null;
  }

  async function saveEditRule(id: number) {
    if (!editRuleCategory.trim() || !editRuleContent.trim()) {
      toastError('分类和内容不能为空');
      return;
    }
    try {
      await fetchJson(`/topology/rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: editRuleCategory.trim(), content: editRuleContent.trim() })
      });
      editingRuleId = null;
      await loadRules();
      toastSuccess('规则已更新');
    } catch (err: any) {
      toastError(`更新失败: ${err.message}`);
    }
  }

  async function deleteRuleById(id: number) {
    if (!confirm('确定要删除这条规则吗？')) return;
    try {
      await fetchJson(`/topology/rules/${id}`, { method: 'DELETE' });
      await loadRules();
      toastSuccess('规则已删除');
    } catch (err: any) {
      toastError(`删除失败: ${err.message}`);
    }
  }

  async function saveSettings() {
    try {
      await fetchJson('/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, baseUrl, model })
      });
      isSaved = true;
      setTimeout(() => (isSaved = false), 2500);
    } catch (err: any) {
      toastError(`保存失败: ${err.message}`);
    }
  }

  async function testConnection() {
    if (!apiKey) {
      toastError('请先填写 API Key');
      return;
    }
    isTesting = true;
    try {
      const res = await fetchJson('/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, baseUrl, model })
      });
      if (res.ok) {
        toastSuccess('API 连接测试成功！');
      } else {
        toastError(res.error || '连接测试失败');
      }
    } catch (err: any) {
      toastError(`连接测试失败: ${err.message}`);
    } finally {
      isTesting = false;
    }
  }
</script>

<div class="settings-container">
  <h2>系统设置 & 大模型配置</h2>

  <div class="settings-grid">
    <!-- LLM Configuration Panel -->
    <div class="settings-panel glass-panel">
      <div class="panel-header">
        <span class="icon-blue"><Cpu size={20} /></span>
        <div>
          <h3>大模型 API 设置</h3>
          <p class="panel-sub">配置你的 OpenAI 或 Claude 格式 API 端点</p>
        </div>
      </div>

      <div class="form-group">
        <label><Key size={14} /> API Key</label>
        <input
          type="password"
          class="apple-input"
          bind:value={apiKey}
          placeholder="sk-..."
        />
        <span class="field-hint">直接存储在本地 SQLite 数据库中，安全可控</span>
      </div>

      <div class="form-group">
        <label><Globe size={14} /> Base URL (API 端点地址)</label>
        <input
          type="text"
          class="apple-input"
          bind:value={baseUrl}
          placeholder="如: https://api.openai.com/v1 或公司自建网关 URL"
        />
      </div>

      <div class="form-group">
        <label><Cpu size={14} /> 模型名称 (Model Name)</label>
        <input
          type="text"
          class="apple-input"
          bind:value={model}
          placeholder="如: gpt-4o, claude-3-5-sonnet, deepseek-chat 等"
        />
      </div>

      <div class="btn-wrap">
        <button class="apple-button-secondary apple-button" on:click={testConnection} disabled={isTesting}>
          {#if isTesting}
            <span>测试中...</span>
          {:else}
            <span>测试连接</span>
          {/if}
        </button>
        <button class="apple-button" on:click={saveSettings}>
          {#if isSaved}
            <Check size={16} />
            <span>配置已保存</span>
          {:else}
            <span>保存配置</span>
          {/if}
        </button>
      </div>
    </div>

    <!-- Theme & UI Settings -->
    <div class="settings-panel glass-panel">
      <div class="panel-header">
        <span class="icon-indigo"><Moon size={20} /></span>
        <div>
          <h3>界面与外观</h3>
          <p class="panel-sub">个性化调整界面效果与深浅色模式</p>
        </div>
      </div>

      <div class="theme-row">
        <span>外观主题模式</span>
        <button class="apple-button-secondary apple-button" on:click={onToggleTheme}>
          {#if theme === 'dark'}
            <Sun size={16} /> 切换为浅色模式
          {:else}
            <Moon size={16} /> 切换为深色模式
          {/if}
        </button>
      </div>
    </div>

    <!-- Solidified Rules Panel -->
    <div class="settings-panel glass-panel full-width">
      <div class="panel-header">
        <span class="icon-purple"><BookOpen size={20} /></span>
        <div>
          <h3>对话固化的业务规则列表</h3>
          <p class="panel-sub">通过 Agent 对话自动解析保存的产品、版本与服务划分规则</p>
        </div>
      </div>

      <div class="rules-list">
        {#if rules.length === 0}
          <div class="empty-rules">暂无规则。你可以在对话中直接告诉 WorkAgent 你的产品版本划分！</div>
        {:else}
          {#each rules as r}
            <div class="rule-card">
              {#if editingRuleId === r.id}
                <div class="rule-edit-form">
                  <input class="apple-input rule-edit-cat" bind:value={editRuleCategory} placeholder="分类" />
                  <textarea class="apple-input rule-edit-content" bind:value={editRuleContent} rows="2" placeholder="规则内容"></textarea>
                  <div class="rule-edit-actions">
                    <button class="apple-button" on:click={() => saveEditRule(r.id)}><Save size={13} /> 保存</button>
                    <button class="apple-button-secondary apple-button" on:click={cancelEditRule}><X size={13} /> 取消</button>
                  </div>
                </div>
              {:else}
                <div class="rule-tag">{r.category}</div>
                <div class="rule-content">{r.content}</div>
                <div class="rule-meta">
                  <span class="rule-date">{new Date(r.created_at).toLocaleString()}</span>
                  <div class="rule-actions">
                    <button class="icon-btn" on:click={() => startEditRule(r)} title="编辑"><Pencil size={13} /></button>
                    <button class="icon-btn del" on:click={() => deleteRuleById(r.id)} title="删除"><Trash2 size={13} /></button>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .settings-container {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .settings-container h2 {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.4px;
  }

  .settings-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .full-width {
    grid-column: 1 / -1;
  }

  .settings-panel {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 12px;

    border-bottom: 1px solid var(--glass-border);
    padding-bottom: 14px;
  }

  .icon-blue { color: var(--accent-blue); }
  .icon-indigo { color: var(--accent-indigo); }
  .icon-purple { color: var(--accent-purple); }

  .panel-header h3 {
    font-size: 16px;
    font-weight: 600;
  }

  .panel-sub {
    font-size: 12px;
    color: var(--text-muted);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .field-hint {
    font-size: 11.5px;
    color: var(--text-muted);
  }

  .btn-wrap {
    display: flex;
    justify-content: flex-end;
    padding-top: 10px;
  }

  .theme-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
  }

  .rules-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 400px;
    overflow-y: auto;
  }

  .rule-card {
    padding: 14px;
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
    border: 1px solid var(--glass-border);
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: border-color var(--transition-fast);
  }

  .rule-card:hover {
    border-color: var(--glass-border-hover);
  }

  .rule-tag {
    font-size: 11px;
    font-weight: 600;
    color: var(--accent-blue);
    text-transform: uppercase;
  }

  .rule-content {
    font-size: 13.5px;
    color: var(--text-primary);
  }

  .rule-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .rule-date {
    font-size: 11px;
    color: var(--text-muted);
  }

  .rule-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  .rule-card:hover .rule-actions {
    opacity: 1;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--glass-border);
    background: var(--bg-tertiary);
    color: var(--text-muted);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .icon-btn:hover {
    color: var(--text-primary);
    border-color: var(--glass-border-hover);
  }

  .icon-btn.del:hover {
    color: var(--status-high);
    border-color: rgba(255, 69, 58, 0.3);
  }

  .rule-edit-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .rule-edit-cat {
    padding: 4px 8px;
    font-size: 12px;
  }

  .rule-edit-content {
    padding: 6px 8px;
    font-size: 13px;
    resize: vertical;
  }

  .rule-edit-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  .empty-rules {
    font-size: 13px;
    color: var(--text-muted);
    text-align: center;
    padding: 20px;
  }
</style>
