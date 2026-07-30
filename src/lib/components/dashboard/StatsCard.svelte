<script lang="ts">
  import { tweened } from 'svelte/motion';

  export let title: string = '';
  export let value: number | string = 0;
  export let subtitle: string = '';
  export let icon: any = null;
  export let variant: 'blue' | 'amber' | 'red' | 'green' = 'blue';
  export let trend: string = '';

  const numValue = typeof value === 'number' ? value : parseInt(String(value)) || 0;
  const animated = tweened(0, { duration: 600, easing: (t: number) => 1 - Math.pow(1 - t, 3) });

  $: if (typeof value === 'number') {
    animated.set(value);
  } else {
    animated.set(parseInt(String(value)) || 0);
  }

  $: displayValue = Math.round($animated);
</script>

<div class="stats-card glass-panel {variant}">
  <div class="accent-stripe"></div>
  <div class="card-top">
    <div class="icon-box">
      {#if icon}
        <svelte:component this={icon} size={16} />
      {/if}
    </div>
    {#if trend}
      <span class="trend-badge">{trend}</span>
    {/if}
  </div>

  <div class="card-main">
    <div class="title">{title}</div>
    <div class="value mono-font">{displayValue}</div>
  </div>

  <div class="card-footer">
    <div class="progress-bar-track">
      <div class="progress-bar-fill"></div>
    </div>
    {#if subtitle}
      <span class="subtitle">{subtitle}</span>
    {/if}
  </div>
</div>

<style>
  .stats-card {
    padding: 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    position: relative;
    overflow: hidden;
    transition: all var(--transition-normal);
  }

  .accent-stripe {
    position: absolute;
    left: 0;
    top: 12px;
    bottom: 12px;
    width: 3px;
    border-radius: 0 2px 2px 0;
    transition: all var(--transition-normal);
  }

  .blue .accent-stripe { background: var(--accent-mid); box-shadow: 0 0 8px var(--accent-glow); }
  .amber .accent-stripe { background: var(--status-medium); box-shadow: 0 0 8px var(--status-medium-glow); }
  .red .accent-stripe { background: var(--status-high); box-shadow: 0 0 8px var(--status-high-glow); }
  .green .accent-stripe { background: var(--status-low); box-shadow: 0 0 8px var(--status-low-glow); }

  .stats-card:hover {
    transform: translateY(-3px);
    border-color: var(--glass-border-hover);
    box-shadow: var(--shadow-md);
  }

  .blue:hover { box-shadow: 0 8px 24px var(--accent-glow), var(--shadow-md); }
  .amber:hover { box-shadow: 0 8px 24px var(--status-medium-glow), var(--shadow-md); }
  .red:hover { box-shadow: 0 8px 24px var(--status-high-glow), var(--shadow-md); }
  .green:hover { box-shadow: 0 8px 24px var(--status-low-glow), var(--shadow-md); }

  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .icon-box {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
  }

  .blue .icon-box { background: rgba(10, 132, 255, 0.12); color: #0a84ff; border-color: rgba(10, 132, 255, 0.25); }
  .amber .icon-box { background: rgba(255, 159, 10, 0.12); color: #ff9f0a; border-color: rgba(255, 159, 10, 0.25); }
  .red .icon-box { background: rgba(255, 69, 58, 0.12); color: #ff453a; border-color: rgba(255, 69, 58, 0.25); }
  .green .icon-box { background: rgba(48, 209, 88, 0.12); color: #30d158; border-color: rgba(48, 209, 88, 0.25); }

  .trend-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 4px;
  }

  .blue .trend-badge { background: rgba(10, 132, 255, 0.15); color: #0a84ff; }
  .amber .trend-badge { background: rgba(255, 159, 10, 0.15); color: #ff9f0a; }
  .red .trend-badge { background: rgba(255, 69, 58, 0.15); color: #ff453a; }
  .green .trend-badge { background: rgba(48, 209, 88, 0.15); color: #30d158; }

  .card-main {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .title {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    letter-spacing: 0.2px;
  }

  .value {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.1;
  }

  .card-footer {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .progress-bar-track {
    width: 100%;
    height: 3px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    border-radius: 999px;
    width: 65%;
  }

  .blue .progress-bar-fill { background: #0a84ff; width: 75%; }
  .amber .progress-bar-fill { background: #ff9f0a; width: 45%; }
  .red .progress-bar-fill { background: #ff453a; width: 30%; }
  .green .progress-bar-fill { background: #30d158; width: 90%; }

  .subtitle {
    font-size: 11.5px;
    color: var(--text-muted);
  }
</style>
