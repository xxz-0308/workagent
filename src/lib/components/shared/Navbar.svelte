<script lang="ts">
  import { MessageSquare, LayoutDashboard, Settings, Sparkles, Sun, Moon } from 'lucide-svelte';

  export let activeTab: 'chat' | 'dashboard' | 'settings' = 'chat';
  export let theme: 'dark' | 'light' = 'dark';
  export let onTabChange: (tab: 'chat' | 'dashboard' | 'settings') => void;
  export let onToggleTheme: () => void;
</script>

<header class="navbar-header">
  <div class="brand">
    <div class="logo-icon">
      <Sparkles size={20} class="sparkle-icon" />
    </div>
    <div class="brand-text">
      <span class="app-title">WorkAgent</span>
      <span class="app-subtitle">补丁智能助手</span>
    </div>
  </div>

  <nav class="nav-pills">
    <button
      class="nav-item {activeTab === 'chat' ? 'active' : ''}"
      on:click={() => onTabChange('chat')}
    >
      <MessageSquare size={16} />
      <span>Agent 对话</span>
    </button>

    <button
      class="nav-item {activeTab === 'dashboard' ? 'active' : ''}"
      on:click={() => onTabChange('dashboard')}
    >
      <LayoutDashboard size={16} />
      <span>结构化已知问题</span>
    </button>

    <button
      class="nav-item {activeTab === 'settings' ? 'active' : ''}"
      on:click={() => onTabChange('settings')}
    >
      <Settings size={16} />
      <span>设置</span>
    </button>
  </nav>

  <div class="actions">
    <button class="theme-btn" on:click={onToggleTheme} title="切换主题">
      {#if theme === 'dark'}
        <Sun size={18} />
      {:else}
        <Moon size={18} />
      {/if}
    </button>
  </div>
</header>

<style>
  .navbar-header {
    height: 60px;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border-bottom: 1px solid var(--glass-border);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--accent-blue), var(--accent-indigo));
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
  }

  .app-title {
    font-weight: 700;
    font-size: 16px;
    letter-spacing: -0.3px;
    background: linear-gradient(135deg, var(--text-primary), var(--text-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .app-subtitle {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(0, 122, 255, 0.15);
    color: var(--accent-blue);
    font-weight: 500;
    margin-left: 8px;
  }

  .nav-pills {
    display: flex;
    align-items: center;
    background: var(--bg-tertiary);
    padding: 4px;
    border-radius: 12px;
    border: 1px solid var(--glass-border);
    gap: 4px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 16px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .nav-item:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.05);
  }

  .nav-item.active {
    background: var(--accent-blue);
    color: #ffffff;
    box-shadow: 0 2px 8px rgba(0, 122, 255, 0.35);
  }

  .theme-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid var(--glass-border);
    background: var(--glass-bg);
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .theme-btn:hover {
    background: var(--glass-bg-hover);
    transform: scale(1.05);
  }
</style>
