<script lang="ts">
  import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-svelte';
  import { toasts, removeToast, type ToastItem } from '../../stores/toast';

  function getIcon(type: ToastItem['type']) {
    switch (type) {
      case 'success': return CheckCircle;
      case 'error': return XCircle;
      case 'warning': return AlertTriangle;
      case 'info': return Info;
    }
  }
</script>

{#if $toasts.length > 0}
  <div class="toast-container">
    {#each $toasts as t (t.id)}
      <div class="toast-item glass-panel {t.type}">
        <span class="toast-icon">
          {#if t.type === 'success'}
            <CheckCircle size={16} />
          {:else if t.type === 'error'}
            <XCircle size={16} />
          {:else if t.type === 'warning'}
            <AlertTriangle size={16} />
          {:else}
            <Info size={16} />
          {/if}
        </span>
        <span class="toast-message">{t.message}</span>
        <button class="toast-close" onclick={() => removeToast(t.id)}>
          <X size={12} />
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 99999;
    display: flex;
    flex-direction: column-reverse;
    gap: 8px;
    pointer-events: none;
  }

  .toast-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    min-width: 300px;
    max-width: 440px;
    border-radius: var(--radius-md);
    background: var(--bg-secondary);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-lg);
    pointer-events: auto;
    animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes toastIn {
    from { opacity: 0; transform: translateY(12px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .toast-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .toast-message {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    line-height: 1.4;
  }

  .toast-close {
    flex-shrink: 0;
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 2px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    transition: color var(--transition-fast);
  }

  .toast-close:hover {
    color: var(--text-primary);
  }

  /* Type colors */
  .toast-item.success { border-left: 3px solid var(--status-low); }
  .toast-item.success .toast-icon { color: var(--status-low); }

  .toast-item.error { border-left: 3px solid var(--status-high); }
  .toast-item.error .toast-icon { color: var(--status-high); }

  .toast-item.warning { border-left: 3px solid var(--status-medium); }
  .toast-item.warning .toast-icon { color: var(--status-medium); }

  .toast-item.info { border-left: 3px solid var(--accent-blue); }
  .toast-item.info .toast-icon { color: var(--accent-blue); }
</style>
