<script lang="ts">
  export let title: string = '';
  export let value: number | string = 0;
  export let subtitle: string = '';
  export let icon: any = null;
  export let variant: 'blue' | 'amber' | 'red' | 'green' = 'blue';
</script>

<div class="stats-card glass-panel {variant}">
  <div class="card-header">
    <div class="title-row">
      <span class="indicator-dot"></span>
      <span class="title">{title}</span>
    </div>
    {#if icon}
      <div class="icon-wrap">
        <svelte:component this={icon} size={16} />
      </div>
    {/if}
  </div>

  <div class="card-body">
    <div class="value mono-font">{value}</div>
    {#if subtitle}
      <div class="subtitle">{subtitle}</div>
    {/if}
  </div>
</div>

<style>
  .stats-card {
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: relative;
    overflow: hidden;
    transition: transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .stats-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .indicator-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .blue .indicator-dot { background: var(--accent-blue); }
  .amber .indicator-dot { background: var(--status-medium); }
  .red .indicator-dot { background: var(--status-high); }
  .green .indicator-dot { background: var(--status-low); }

  .title {
    font-size: 12.5px;
    font-weight: 500;
    color: var(--text-secondary);
    letter-spacing: 0.2px;
  }

  .icon-wrap {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
  }

  .blue .icon-wrap { background: rgba(10, 132, 255, 0.1); color: var(--accent-blue); border-color: rgba(10, 132, 255, 0.2); }
  .amber .icon-wrap { background: rgba(255, 159, 10, 0.1); color: var(--status-medium); border-color: rgba(255, 159, 10, 0.2); }
  .red .icon-wrap { background: rgba(255, 69, 58, 0.1); color: var(--status-high); border-color: rgba(255, 69, 58, 0.2); }
  .green .icon-wrap { background: rgba(48, 209, 88, 0.1); color: var(--status-low); border-color: rgba(48, 209, 88, 0.2); }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .value {
    font-size: 26px;
    font-weight: 700;
    line-height: 1.1;
    color: var(--text-primary);
  }

  .subtitle {
    font-size: 12px;
    color: var(--text-muted);
  }
</style>
