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
    <div style="display: {activeTab === 'chat' ? 'block' : 'none'}; height: 100%;">
      <ChatView />
    </div>
    <div style="display: {activeTab === 'dashboard' ? 'block' : 'none'};">
      <DashboardView />
    </div>
    <div style="display: {activeTab === 'settings' ? 'block' : 'none'};">
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
    overflow-y: auto;
  }
</style>
