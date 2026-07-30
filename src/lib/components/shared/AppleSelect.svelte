<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ChevronDown, Check } from 'lucide-svelte';

  export let options: { value: any; label: string; group?: string }[] = [];
  export let value: any = null;
  export let placeholder: string = '请选择...';
  export let dropUp: boolean = false;
  export let onChange: ((val: any) => void) | undefined = undefined;

  let isOpen: boolean = false;
  let wrapperEl: HTMLDivElement;

  $: selectedOption = options.find(o => o.value === value);

  function toggle() {
    isOpen = !isOpen;
  }

  function selectOption(val: any) {
    value = val;
    isOpen = false;
    if (onChange) onChange(val);
  }

  function handleOutsideClick(e: MouseEvent) {
    if (wrapperEl && !wrapperEl.contains(e.target as Node)) {
      isOpen = false;
    }
  }

  onMount(() => {
    window.addEventListener('click', handleOutsideClick);
  });

  onDestroy(() => {
    window.removeEventListener('click', handleOutsideClick);
  });
</script>

<div class="apple-select-wrapper" bind:this={wrapperEl}>
  <!-- Trigger Button -->
  <button type="button" class="select-trigger glass-panel {isOpen ? 'open' : ''}" on:click={toggle}>
    <span class="trigger-label">
      {selectedOption ? selectedOption.label : placeholder}
    </span>
    <ChevronDown size={14} class="chevron-icon {isOpen ? 'rotate' : ''}" />
  </button>

  <!-- Floating Glass Dropdown Menu -->
  {#if isOpen}
    <div class="dropdown-menu {dropUp ? 'drop-up' : ''}">
      <div class="options-scroll">
        {#each options as option}
          <button
            type="button"
            class="option-item {value === option.value ? 'selected' : ''}"
            on:click={() => selectOption(option.value)}
          >
            <span class="option-label">{option.label}</span>
            {#if value === option.value}
              <Check size={14} class="check-icon" />
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .apple-select-wrapper {
    position: relative;
    width: 100%;
    user-select: none;
  }

  .select-trigger {
    width: 100%;
    height: 38px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    background: var(--bg-tertiary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .select-trigger:hover {
    background: var(--glass-bg-hover);
    border-color: var(--glass-border-hover);
  }

  .select-trigger.open {
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.25);
  }

  .trigger-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
  }

  .chevron-icon {
    color: var(--accent-blue);
    transition: transform var(--transition-fast);
    flex-shrink: 0;
  }

  .chevron-icon.rotate {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    width: 100%;
    min-width: 190px;
    background: var(--dropdown-bg, #1c2128);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 99999;
    padding: 6px;
    animation: menuFade 0.16s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .dropdown-menu.drop-up {
    top: auto;
    bottom: calc(100% + 6px);
  }

  [data-theme="light"] .dropdown-menu {
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.12);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  }

  @keyframes menuFade {
    from { opacity: 0; transform: translateY(-4px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .options-scroll {
    max-height: 240px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .option-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    border: none;
    background: transparent;
    font-size: 13px;
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
    transition: all var(--transition-fast);
    width: 100%;
  }

  .option-item:hover {
    background: var(--accent-blue);
    color: #ffffff;
  }

  .option-item.selected {
    background: rgba(0, 122, 255, 0.2);
    color: var(--accent-blue);
    font-weight: 600;
  }

  .option-item:hover .check-icon {
    color: #ffffff;
  }

  .check-icon {
    color: var(--accent-blue);
    flex-shrink: 0;
  }
</style>
