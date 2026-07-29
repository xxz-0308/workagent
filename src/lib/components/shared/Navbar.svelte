<script lang="ts">
  import { MessageSquare, LayoutDashboard, Settings, Sparkles, Sun, Moon, Activity } from 'lucide-svelte';

  export let activeTab: 'chat' | 'dashboard' | 'settings' = 'chat';
  export let theme: 'dark' | 'light' = 'dark';
  export let onTabChange: (tab: 'chat' | 'dashboard' | 'settings') => void;
  export let onToggleTheme: () => void;
</script>

<header class="navbar-wrapper">
  <div class="floating-island-navbar glass-panel">
    <!-- Brand Title & Breadcrumbs -->
    <div class="brand">
      <div class="logo-icon">
        <Sparkles size={18} class="sparkle-icon" />
      </div>
      <div class="brand-text">
        <span class="app-title">WorkAgent</span>
        <span class="breadcrumb-slash">/</span>
        <span class="tab-crumb">
          {#if activeTab === 'chat'}智能定位助手{:else if activeTab === 'dashboard'}已知问题看板{:else}系统设置{/if}
        </span>
      </div>
    </div>

    <!-- Center Nav Pills -->
    <nav class="nav-pills">
      <button
        class="nav-item {activeTab === 'chat' ? 'active' : ''}"
        on:click={() => onTabChange('chat')}
      >
        <MessageSquare size={15} />
        <span>智能定位助手</span>
      </button>

      <button
        class="nav-item {activeTab === 'dashboard' ? 'active' : ''}"
        on:click={() => onTabChange('dashboard')}
      >
        <LayoutDashboard size={15} />
        <span>结构化已知问题</span>
      </button>

      <button
        class="nav-item {activeTab === 'settings' ? 'active' : ''}"
        on:click={() => onTabChange('settings')}
      >
        <Settings size={15} />
        <span>系统配置</span>
      </button>
    </nav>

    <!-- Right Actions & Server Status Badge -->
    <div class="actions">
      <div class="server-status-pill" title="本地 SQLite 数据库与 Node 服务连通中">
        <span class="status-dot"></span>
        <span class="status-text">Server Online</span>
      </div>

      <button class="theme-btn" on:click={onToggleTheme} title="切换主题">
        {#if theme === 'dark'}
          <Sun size={17} />
        {:else}
          <Moon size={17} />
        {/if}
      </button>
    </div>
  </div>
</header>

<style>
  .navbar-wrapper {
    position: sticky;
    top: 12px;
    z-index: 100;
    padding: 0 20px;
    margin-bottom: 12px;
  }

  .floating-island-navbar {
    max-width: 1280px;
    margin: 0 auto;
    height: 52px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-secondary);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-md);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .logo-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--accent-blue), var(--accent-indigo));
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    box-shadow: 0 2px 10px rgba(10, 132, 255, 0.3);
  }

  .brand-text {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
  }

  .app-title {
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.3px;
  }

  .breadcrumb-slash {
    color: var(--text-muted);
    font-weight: 300;
  }

  .tab-crumb {
    color: var(--text-secondary);
    font-weight: 500;
    font-size: 13px;
  }

  .nav-pills {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(0, 0, 0, 0.2);
    padding: 4px;
    border-radius: var(--radius-lg);
    border: 1px solid rgba(255, 255, 255, 0.04);
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    background: transparent;
    border: none;
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
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(10, 132, 255, 0.35);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .server-status-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    background: rgba(48, 209, 88, 0.1);
    border: 1px solid rgba(48, 209, 88, 0.25);
    font-size: 11.5px;
    color: var(--status-low);
    font-weight: 500;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--status-low);
    box-shadow: 0 0 6px var(--status-low);
  }

  .theme-btn {
    background: transparent;
    border: 1px solid var(--glass-border);
    color: var(--text-secondary);
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .theme-btn:hover {
    background: var(--glass-bg-hover);
    color: var(--text-primary);
    border-color: var(--glass-border-hover);
  }
</style>
