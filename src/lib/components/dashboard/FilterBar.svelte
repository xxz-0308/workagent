<script lang="ts">
  import { Search, FileText } from 'lucide-svelte';
  import AppleSelect from '../shared/AppleSelect.svelte';

  export let products: any[] = [];
  export let versions: any[] = [];
  export let services: any[] = [];

  export let selectedProductId: number | null = null;
  export let selectedVersionId: number | null = null;
  export let selectedServiceId: number | null = null;
  export let selectedStatus: string = '';
  export let searchQuery: string = '';

  export let onFilterChange: () => void;
  export let onOpenChecklist: () => void;

  $: filteredVersions = selectedProductId
    ? versions.filter(v => v.product_id === selectedProductId)
    : versions;

  // Concise Product Code options (e.g. CSP, CGP)
  $: productOptions = [
    { value: null, label: '全部产品' },
    ...products.map(p => ({ value: p.id, label: p.code.toUpperCase() }))
  ];

  // Concise Version options (e.g. CSP 23.0, CGP 22.0)
  $: versionOptions = [
    { value: null, label: '全部版本' },
    ...filteredVersions.map(v => {
      const prodCode = products.find(p => p.id === v.product_id || p.name === v.product_name)?.code?.toUpperCase();
      const prefix = prodCode ? `${prodCode} ` : '';
      return {
        value: v.id,
        label: `${prefix}${v.version_name}`
      };
    })
  ];

  $: serviceOptions = [
    { value: null, label: '全部服务' },
    ...services.map(s => ({ value: s.id, label: s.name }))
  ];

  const statusOptions = [
    { value: '', label: '全部定位状态' },
    { value: 'analyzing', label: '分析中' },
    { value: 'located', label: '已定位' },
    { value: 'closed', label: '已关闭' }
  ];

  $: selectedProductObj = products.find(p => p.id === selectedProductId);
  $: selectedVersionObj = versions.find(v => v.id === selectedVersionId);
</script>

<div class="filter-bar glass-panel">
  <div class="search-input-wrap">
    <Search size={16} class="search-icon" />
    <input
      type="text"
      placeholder="搜索已知问题标题、描述、根因或服务..."
      bind:value={searchQuery}
      on:input={onFilterChange}
      class="apple-input search-input"
    />
  </div>

  <div class="filters-group">
    <!-- Product Select -->
    <div class="select-box">
      <span class="label">产品:</span>
      <div class="custom-select-wrap">
        <AppleSelect
          options={productOptions}
          bind:value={selectedProductId}
          onChange={() => { selectedVersionId = null; onFilterChange(); }}
        />
      </div>
    </div>

    <!-- Version Select -->
    <div class="select-box">
      <span class="label">版本:</span>
      <div class="custom-select-wrap">
        <AppleSelect
          options={versionOptions}
          bind:value={selectedVersionId}
          onChange={onFilterChange}
        />
      </div>
    </div>

    <!-- Service Select -->
    <div class="select-box">
      <span class="label">服务:</span>
      <div class="custom-select-wrap">
        <AppleSelect
          options={serviceOptions}
          bind:value={selectedServiceId}
          onChange={onFilterChange}
        />
      </div>
    </div>

    <!-- Status Select -->
    <div class="select-box">
      <span class="label">状态:</span>
      <div class="custom-select-wrap">
        <AppleSelect
          options={statusOptions}
          bind:value={selectedStatus}
          onChange={onFilterChange}
        />
      </div>
    </div>
  </div>

  <!-- Patch Checklist Button -->
  {#if selectedProductObj && selectedVersionObj}
    <button class="apple-button patch-checklist-btn" on:click={onOpenChecklist}>
      <FileText size={15} />
      <span>查看 {selectedProductObj.code.toUpperCase()} {selectedVersionObj.version_name} 补丁提醒清单</span>
    </button>
  {/if}
</div>

<style>
  .filter-bar {
    position: relative;
    z-index: 50;
    padding: 14px 18px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .search-input-wrap {
    position: relative;
    flex: 1;
    min-width: 260px;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    pointer-events: none;
    z-index: 5;
  }

  .search-input {
    width: 100%;
    height: 38px;
    padding-left: 36px !important;
    box-sizing: border-box;
  }

  .filters-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
  }

  .select-box {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary);
    height: 38px;
  }

  .custom-select-wrap {
    min-width: 140px;
  }

  .label {
    font-weight: 500;
    white-space: nowrap;
  }

  .patch-checklist-btn {
    height: 38px;
    background: linear-gradient(135deg, var(--accent-indigo), var(--accent-purple));
    box-shadow: 0 4px 12px rgba(175, 82, 222, 0.3);
  }
</style>
