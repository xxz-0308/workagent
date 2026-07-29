<script lang="ts">
  export let title: string = '';
  export let value: number | string = 0;
  export let subtitle: string = '';
  export let icon: any = null;
  export let variant: 'blue' | 'amber' | 'red' | 'green' = 'blue';
</script>

<div class="stats-card glass-panel {variant}">
  <div class="header">
    <span class="title">{title}</span>
    {#if icon}
      <div class="icon-wrap">
        <svelte:component this={icon} size={18} />
      </div>
    {/if}
  </div>

  <div class="value">{value}</div>
  {#if subtitle}
    <div class="subtitle">{subtitle}</div>
  {/if}
</div>

<style>
  .stats-card {
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    overflow: hidden;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .icon-wrap {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .blue .icon-wrap { background: rgba(0, 122, 255, 0.15); color: var(--accent-blue); }
  .amber .icon-wrap { background: rgba(255, 159, 10, 0.15); color: var(--status-medium); }
  .red .icon-wrap { background: rgba(255, 69, 58, 0.15); color: var(--status-high); }
  .green .icon-wrap { background: rgba(48, 209, 88, 0.15); color: var(--status-low); }

  .value {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }

  .subtitle {
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
