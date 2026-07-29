<script lang="ts">
  import { onMount } from 'svelte';
  import { Key, Globe, Cpu, Check, BookOpen, Moon, Sun } from 'lucide-svelte';
  import { fetchJson } from '../../api/client';

  export let theme: 'dark' | 'light' = 'dark';
  export let onToggleTheme: () => void;

  let apiKey: string = '';
  let baseUrl: string = 'https://api.openai.com/v1';
  let model: string = 'gpt-4o';
  let isSaved: boolean = false;

  let rules: any[] = [];

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
      alert(`保存失败: ${err.message}`);
    }
  }
</script>

<div class="settings-container">
  <h2>系统设置 & 大模型配置</h2>

  <div class="settings-grid">
    <!-- LLM Configuration Panel -->
    <div class="settings-panel glass-panel">
      <div class="panel-header">
        <Cpu size={20} class="icon-blue" />
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
          placeholder="如: gpt-4o, claude-3-5-sonnet, deepseek-r1 等"
        />
      </div>

      <div class="btn-wrap">
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
        <Moon size={20} class="icon-indigo" />
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
        <BookOpen size={20} class="icon-purple" />
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
              <div class="rule-tag">{r.category}</div>
              <div class="rule-content">{r.content}</div>
              <div class="rule-date">{new Date(r.created_at).toLocaleString()}</div>
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
  }

  .rule-card {
    padding: 14px;
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
    border: 1px solid var(--glass-border);
    display: flex;
    flex-direction: column;
    gap: 6px;
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

  .rule-date {
    font-size: 11px;
    color: var(--text-muted);
  }

  .empty-rules {
    font-size: 13px;
    color: var(--text-muted);
    text-align: center;
    padding: 20px;
  }
</style>
