<script lang="ts">
  import { onMount } from 'svelte';
  import Navbar from './lib/components/shared/Navbar.svelte';
  import ChatView from './lib/components/chat/ChatView.svelte';
  import DashboardView from './lib/components/dashboard/DashboardView.svelte';
  import SettingsView from './lib/components/settings/SettingsView.svelte';
  import ToastContainer from './lib/components/shared/ToastContainer.svelte';
  import { fetchJson } from './lib/api/client';

  let activeTab: 'chat' | 'dashboard' | 'settings' = 'chat';
  let theme: 'dark' | 'light' = 'dark';

  onMount(async () => {
    try {
      const s = await fetchJson('/settings');
      if (s.theme) {
        theme = s.theme;
      }
    } catch {}
    updateThemeAttr();
  });

  function handleTabChange(tab: 'chat' | 'dashboard' | 'settings') {
    activeTab = tab;
  }

  function handleToggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    updateThemeAttr();
    fetchJson('/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme })
    }).catch(() => {});
  }

  function updateThemeAttr() {
    document.documentElement.setAttribute('data-theme', theme);
  }
</script>

<div class="app-root" data-theme={theme}>
  <Navbar
    {activeTab}
    {theme}
    onTabChange={handleTabChange}
    onToggleTheme={handleToggleTheme}
  />

  <main class="view-content">
    <div class="tab-page" class:active={activeTab === 'chat'}>
      <ChatView />
    </div>
    <div class="tab-page" class:active={activeTab === 'dashboard'}>
      <DashboardView />
    </div>
    <div class="tab-page" class:active={activeTab === 'settings'}>
      <SettingsView {theme} onToggleTheme={handleToggleTheme} />
    </div>
  </main>

  <ToastContainer />
</div>

<style>
  .app-root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  .view-content {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .tab-page {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: 0;
    transform: translateY(10px);
    pointer-events: none;
    visibility: hidden;
    transition:
      opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1),
      transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
      visibility 0s 0.3s;
  }

  .tab-page.active {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
    visibility: visible;
    transition:
      opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),
      transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
      visibility 0s 0s;
  }
</style>
