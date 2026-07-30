<script lang="ts">
  import { AlertTriangle, X } from 'lucide-svelte';

  export let open: boolean = false;
  export let title: string = '确认操作';
  export let message: string = '确定要执行此操作吗？此操作无法撤销。';
  export let confirmText: string = '确认删除';
  export let cancelText: string = '取消';
  export let isDanger: boolean = true;

  export let onConfirm: () => void;
  export let onCancel: () => void;
</script>

{#if open}
  <div class="confirm-backdrop" on:click|self={onCancel}>
    <div class="confirm-card glass-panel">
      <div class="confirm-header">
        <div class="icon-wrap {isDanger ? 'danger' : 'warning'}">
          <AlertTriangle size={20} />
        </div>
        <button class="close-btn" on:click={onCancel}>
          <X size={16} />
        </button>
      </div>

      <div class="confirm-content">
        <h3>{title}</h3>
        <p>{message}</p>
      </div>

      <div class="confirm-actions">
        <button class="apple-button-secondary apple-button" on:click={onCancel}>
          {cancelText}
        </button>
        <button class="apple-button {isDanger ? 'danger-btn' : ''}" on:click={onConfirm}>
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .confirm-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(8px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .confirm-card {
    width: 100%;
    max-width: 420px;
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    border-radius: var(--radius-lg);
    background: var(--bg-secondary);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-lg);
    animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes popIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .confirm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .icon-wrap {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-wrap.danger {
    background: rgba(255, 69, 58, 0.15);
    color: var(--status-high);
    border: 1px solid rgba(255, 69, 58, 0.25);
  }

  .icon-wrap.warning {
    background: rgba(255, 159, 10, 0.15);
    color: var(--status-medium);
    border: 1px solid rgba(255, 159, 10, 0.25);
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
  }

  .confirm-content h3 {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 6px;
  }

  .confirm-content p {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .confirm-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 4px;
  }

  .danger-btn {
    background: #ff453a !important;
    color: #ffffff !important;
    box-shadow: 0 4px 12px rgba(255, 69, 58, 0.3) !important;
  }

  .danger-btn:hover {
    background: #e03b30 !important;
  }
</style>
