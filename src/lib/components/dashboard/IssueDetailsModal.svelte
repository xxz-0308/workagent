<script lang="ts">
  import { X, ShieldAlert, CheckCircle, Clock, Tag, Server, Code, FileText, Save, Trash2 } from 'lucide-svelte';
  import AppleSelect from '../shared/AppleSelect.svelte';

  export let issue: any = null;
  export let products: any[] = [];
  export let versions: any[] = [];
  export let services: any[] = [];
  export let onClose: () => void;
  export let onSaveIssue: (updatedIssue: any) => Promise<void>;
  export let onDeleteIssue: (id: number) => Promise<void>;
  export let onUpdateFixStatus: (issueId: number, versionName: string, fixStatus: string, patchVersion?: string) => Promise<void>;

  let activeData: any = null;
  let isCustomService: boolean = false;
  let customServiceName: string = '';

  $: if (issue) {
    activeData = JSON.parse(JSON.stringify(issue));
    if (!activeData.product_ids || activeData.product_ids.length === 0) {
      if (activeData.product_id) {
        activeData.product_ids = [activeData.product_id];
      } else {
        activeData.product_ids = products.map(p => p.id);
      }
    }
    const isKnown = services.some(s => s.name === activeData.service_name);
    if (!isKnown && activeData.service_name) {
      isCustomService = true;
      customServiceName = activeData.service_name;
    } else {
      isCustomService = false;
      customServiceName = '';
    }
  }

  $: groupedVersions = (() => {
    if (!activeData) return [];

    const result: { product_name: string; product_code: string; items: any[] }[] = [];
    const affectedMap = new Map<string, any>();
    if (activeData.affected_versions) {
      activeData.affected_versions.forEach((av: any) => {
        affectedMap.set(av.version_name, av);
      });
    }

    products.forEach(p => {
      const prodVers = versions.filter(v => v.product_id === p.id);
      if (prodVers.length > 0) {
        const items = prodVers.map(v => {
          const match = affectedMap.get(v.version_name);
          return {
            version_name: v.version_name,
            fix_status: match ? match.fix_status : 'na',
            patch_version: match ? (match.patch_version || '') : ''
          };
        });
        result.push({
          product_name: p.name,
          product_code: p.code.toUpperCase(),
          items
        });
      }
    });

    return result;
  })();

  function toggleProductSelection(prodId: number | 'all') {
    if (prodId === 'all') {
      if (activeData.product_ids?.length === products.length) {
        activeData.product_ids = [];
      } else {
        activeData.product_ids = products.map((p: any) => p.id);
      }
    } else {
      let current = activeData.product_ids || [];
      if (current.includes(prodId)) {
        current = current.filter((id: number) => id !== prodId);
      } else {
        current = [...current, prodId];
      }
      activeData.product_ids = current;
    }
  }

  async function handleStatusPillClick(verName: string, status: string, currentPatch?: string) {
    if (!activeData.affected_versions) activeData.affected_versions = [];
    let match = activeData.affected_versions.find((av: any) => av.version_name === verName);
    if (!match) {
      match = { version_name: verName, fix_status: status, patch_version: currentPatch || '' };
      activeData.affected_versions.push(match);
    } else {
      match.fix_status = status;
      if (currentPatch !== undefined) match.patch_version = currentPatch;
    }
    // Live save fix status
    await onUpdateFixStatus(activeData.id, verName, status, match.patch_version);
  }

  async function handleSave() {
    const finalSvc = isCustomService ? customServiceName.trim() : activeData.service_name;
    if (!activeData.title || !finalSvc) {
      alert('请填写问题标题与服务名称');
      return;
    }
    activeData.service_name = finalSvc;
    await onSaveIssue(activeData);
    onClose();
  }
</script>

{#if activeData}
  <div class="modal-backdrop" on:click|self={onClose}>
    <div class="modal-card glass-panel">
      <!-- Header -->
      <div class="modal-header">
        <div class="window-controls">
          <button class="win-dot close-dot" on:click={onClose} title="关闭"></button>
          <span class="win-dot min-dot"></span>
          <span class="win-dot max-dot"></span>
        </div>
        <div class="header-left">
          <span class="issue-id mono-font">#{activeData.id}</span>
          <input
            type="text"
            class="apple-input title-edit-input"
            bind:value={activeData.title}
            placeholder="问题标题..."
          />
        </div>
        <div class="header-actions">
          <button class="apple-button-secondary apple-button delete-btn" on:click={() => onDeleteIssue(activeData.id)}>
            <Trash2 size={14} />
            <span>删除</span>
          </button>
          <button class="close-btn" on:click={onClose}><X size={16} /></button>
        </div>
      </div>

      <!-- Main Body -->
      <div class="modal-body">
        <!-- Form Controls Row -->
        <div class="form-row">
          <!-- Product Selector -->
          <div class="form-group flex-2">
            <label><Tag size={13} /> 所属产品 (支持多选)</label>
            <div class="product-pills-selector">
              <button
                type="button"
                class="prod-pill {activeData.product_ids?.length === products.length ? 'active' : ''}"
                on:click={() => toggleProductSelection('all')}
              >
                🌐 全产品
              </button>
              {#each products as p}
                <button
                  type="button"
                  class="prod-pill {activeData.product_ids?.includes(p.id) ? 'active' : ''}"
                  on:click={() => toggleProductSelection(p.id)}
                >
                  {p.code.toUpperCase()}
                </button>
              {/each}
            </div>
          </div>

          <!-- Service Selector -->
          <div class="form-group flex-1">
            <label><Server size={13} /> 所属服务 *</label>
            {#if !isCustomService}
              <AppleSelect
                options={[
                  ...services.map(s => ({ value: s.name, label: s.name })),
                  { value: '__custom__', label: '➕ 输入其他新服务...' }
                ]}
                bind:value={activeData.service_name}
                onChange={(val) => {
                  if (val === '__custom__') {
                    isCustomService = true;
                    customServiceName = '';
                  }
                }}
              />
            {:else}
              <div class="custom-svc-wrap">
                <input type="text" class="apple-input" bind:value={customServiceName} placeholder="新服务名称" />
                <button type="button" class="back-svc-btn" on:click={() => isCustomService = false}>选择已有服务</button>
              </div>
            {/if}
          </div>

          <!-- Severity -->
          <div class="form-group flex-1">
            <label><ShieldAlert size={13} /> 严重程度</label>
            <AppleSelect
              options={[
                { value: 'high', label: '🔴 HIGH (高)' },
                { value: 'medium', label: '🟡 MEDIUM (中)' },
                { value: 'low', label: '🟢 LOW (低)' }
              ]}
              bind:value={activeData.severity}
            />
          </div>

          <!-- Status -->
          <div class="form-group flex-1">
            <label><Clock size={13} /> 定位状态</label>
            <AppleSelect
              options={[
                { value: 'analyzing', label: '⏳ 分析中' },
                { value: 'located', label: '🎯 已定位代码Bug' },
                { value: 'closed', label: '✅ 已关闭' }
              ]}
              bind:value={activeData.status}
            />
          </div>
        </div>

        <!-- Section 1: Root Cause & Code Analysis -->
        <div class="info-section cause-section glass-panel">
          <div class="section-title">
            <Code size={16} class="title-icon" />
            <span>根因 / 代码 Bug 疑点分析结论</span>
          </div>
          <textarea
            class="apple-input section-textarea"
            rows="3"
            bind:value={activeData.root_cause}
            placeholder="填写问题已确认或怀疑的代码 bug 所在位置、内存泄漏原因或原理结论..."
          ></textarea>
        </div>

        <!-- Section 2: Detailed Description -->
        <div class="info-section glass-panel">
          <div class="section-title">
            <FileText size={16} class="title-icon" />
            <span>现场现象与问题详细描述</span>
          </div>
          <textarea
            class="apple-input section-textarea"
            rows="3"
            bind:value={activeData.description}
            placeholder="描述触发场景、复现步骤、环境信息等..."
          ></textarea>
        </div>

        <!-- Section 3: Version Fix Matrix -->
        <div class="info-section glass-panel">
          <div class="section-title">
            <CheckCircle size={16} class="title-icon" />
            <span>各产品版本修复与补丁全景矩阵 (直接点按修改)</span>
          </div>

          <div class="version-groups-container">
            {#each groupedVersions as group}
              <div class="product-group-card">
                <div class="group-header">
                  <span class="prod-badge">{group.product_code}</span>
                  <span class="prod-name">{group.product_name}</span>
                </div>

                <div class="group-versions-list">
                  {#each group.items as item}
                    <div class="version-row">
                      <span class="ver-name">{item.version_name}</span>
                      
                      <div class="status-pills-selector">
                        <button
                          type="button"
                          class="status-pill na {item.fix_status === 'na' ? 'active' : ''}"
                          on:click={() => handleStatusPillClick(item.version_name, 'na')}
                        >
                          ⚪ 不涉及
                        </button>
                        <button
                          type="button"
                          class="status-pill unfixed {item.fix_status === 'unfixed' ? 'active' : ''}"
                          on:click={() => handleStatusPillClick(item.version_name, 'unfixed')}
                        >
                          🔴 未修复
                        </button>
                        <button
                          type="button"
                          class="status-pill fixed {item.fix_status === 'fixed' ? 'active' : ''}"
                          on:click={() => handleStatusPillClick(item.version_name, 'fixed')}
                        >
                          🟡 已修复
                        </button>
                        <button
                          type="button"
                          class="status-pill patched {item.fix_status === 'patched' ? 'active' : ''}"
                          on:click={() => handleStatusPillClick(item.version_name, 'patched', item.patch_version)}
                        >
                          🟢 已合入 {item.patch_version ? `(${item.patch_version})` : ''}
                        </button>
                      </div>

                      {#if item.fix_status === 'patched'}
                        <input
                          type="text"
                          class="apple-input patch-num-input"
                          placeholder="补丁号如 23.1_P01"
                          value={item.patch_version}
                          on:change={(e) => handleStatusPillClick(item.version_name, 'patched', e.currentTarget.value)}
                        />
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="apple-button-secondary apple-button" on:click={onClose}>取消 / 关闭</button>
        <button class="apple-button save-btn" on:click={handleSave}>
          <Save size={15} />
          <span>保存修改</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-card {
    width: 100%;
    max-width: 880px;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-secondary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }

  .modal-header {
    padding: 16px 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--glass-border);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }

  .issue-id {
    font-size: 14px;
    font-weight: 700;
    color: var(--accent-blue);
    background: rgba(0, 122, 255, 0.15);
    padding: 4px 10px;
    border-radius: var(--radius-sm);
  }

  .title-edit-input {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    border: 1px solid transparent;
    background: rgba(255, 255, 255, 0.04);
  }

  .title-edit-input:focus {
    border-color: var(--accent-blue);
    background: var(--bg-tertiary);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: 12px;
  }

  .delete-btn {
    color: var(--status-high);
    border-color: rgba(255, 69, 58, 0.3);
  }

  .delete-btn:hover {
    background: rgba(255, 69, 58, 0.15);
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 6px;
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
  }

  .window-controls {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-right: 8px;
  }

  .win-dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
  }

  .close-dot { background: #ff5f56; border: 1px solid #e0443e; }
  .min-dot { background: #ffbd2e; border: 1px solid #dea123; }
  .max-dot { background: #27c93f; border: 1px solid #1aab29; }

  .modal-body {
    padding: 20px 22px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .form-row {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-group label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .flex-1 { flex: 1; min-width: 140px; }
  .flex-2 { flex: 2; min-width: 260px; }

  .product-pills-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .prod-pill {
    padding: 5px 12px;
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
    border: 1px solid var(--glass-border);
    color: var(--text-secondary);
    font-size: 12.5px;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .prod-pill:hover {
    background: var(--glass-bg-hover);
    color: var(--text-primary);
  }

  .prod-pill.active {
    background: rgba(0, 122, 255, 0.2);
    color: var(--accent-blue);
    border-color: var(--accent-blue);
    font-weight: 600;
  }

  .custom-svc-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .back-svc-btn {
    background: transparent;
    border: none;
    color: var(--accent-blue);
    font-size: 11.5px;
    cursor: pointer;
    text-align: right;
  }

  .info-section {
    padding: 14px 16px;
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .cause-section {
    background: rgba(0, 122, 255, 0.04);
    border-color: rgba(0, 122, 255, 0.2);
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .title-icon {
    color: var(--accent-blue);
  }

  .section-textarea {
    font-size: 13px;
    line-height: 1.5;
    resize: vertical;
  }

  .version-groups-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 4px;
  }

  .product-group-card {
    background: var(--bg-tertiary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 10px 12px;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--glass-border);
  }

  .prod-badge {
    background: var(--accent-blue);
    color: #ffffff;
    font-size: 10.5px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: var(--radius-sm);
  }

  .prod-name {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .group-versions-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .version-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 5px 8px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: var(--radius-sm);
  }

  .ver-name {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-primary);
    min-width: 60px;
  }

  .status-pills-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .status-pill {
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    background: var(--bg-secondary);
    border: 1px solid var(--glass-border);
    color: var(--text-muted);
    font-size: 11.5px;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .status-pill:hover {
    border-color: rgba(255, 255, 255, 0.3);
    color: var(--text-primary);
  }

  .status-pill.na.active {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-secondary);
    border-color: rgba(255, 255, 255, 0.25);
    font-weight: 600;
  }

  .status-pill.unfixed.active {
    background: rgba(255, 69, 58, 0.2);
    color: var(--status-high);
    border-color: var(--status-high);
    font-weight: 600;
  }

  .status-pill.fixed.active {
    background: rgba(255, 159, 10, 0.2);
    color: var(--status-medium);
    border-color: var(--status-medium);
    font-weight: 600;
  }

  .status-pill.patched.active {
    background: rgba(48, 209, 88, 0.2);
    color: var(--status-low);
    border-color: var(--status-low);
    font-weight: 600;
  }

  .patch-num-input {
    width: 140px;
    padding: 3px 8px;
    font-size: 12px;
  }

  .modal-footer {
    padding: 12px 22px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    border-top: 1px solid var(--glass-border);
  }

  .save-btn {
    background: linear-gradient(135deg, var(--accent-blue), #0051a8);
    box-shadow: 0 4px 14px rgba(0, 122, 255, 0.3);
  }
</style>
