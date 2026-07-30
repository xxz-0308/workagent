<script lang="ts">
  import { onMount } from 'svelte';
  import { AlertCircle, CheckCircle2, Clock, Plus, X, FileText, Check, ShieldAlert, Trash2 } from 'lucide-svelte';
  import StatsCard from './StatsCard.svelte';
  import FilterBar from './FilterBar.svelte';
  import IssueTable from './IssueTable.svelte';
  import AppleSelect from '../shared/AppleSelect.svelte';
  import AppleConfirmModal from '../shared/AppleConfirmModal.svelte';
  import IssueDetailsModal from './IssueDetailsModal.svelte';
  import { fetchJson } from '../../api/client';

  let products: any[] = [];
  let versions: any[] = [];
  let services: any[] = [];
  let issues: any[] = [];

  let selectedProductId: number | null = null;
  let selectedVersionId: number | null = null;
  let selectedServiceId: number | null = null;
  let selectedStatus: string = '';
  let selectedTag: string = '';
  let searchQuery: string = '';

  $: availableTags = Array.from(
    new Set(
      issues.flatMap(i => (i.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean))
    )
  ).sort();

  // Modal / Drawer state
  let showEditModal: boolean = false;
  let activeIssue: any = null;
  let selectedIssueForDetails: any = null;

  let showChecklistDrawer: boolean = false;
  let checklistData: any = null;

  onMount(() => {
    loadMetadata();
    loadIssues();
  });

  async function loadMetadata() {
    try {
      products = await fetchJson('/topology/products');
      versions = await fetchJson('/topology/versions');
      services = await fetchJson('/topology/services');
    } catch {}
  }

  async function loadIssues() {
    try {
      const params = new URLSearchParams();
      if (selectedProductId) params.append('productId', String(selectedProductId));
      if (selectedVersionId) params.append('versionId', String(selectedVersionId));
      if (selectedServiceId) params.append('serviceId', String(selectedServiceId));
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedTag) params.append('tag', selectedTag);
      if (searchQuery) params.append('search', searchQuery);

      issues = await fetchJson(`/issues?${params.toString()}`);
    } catch {
      issues = [];
    }
  }

  function handleFilterChange() {
    loadIssues();
  }

  async function openPatchChecklist() {
    const prod = products.find(p => p.id === selectedProductId);
    const ver = versions.find(v => v.id === selectedVersionId);
    if (!prod || !ver) return;

    try {
      checklistData = await fetchJson(`/issues/patch-checklist/${prod.code}/${ver.version_name}`);
      showChecklistDrawer = true;
    } catch (err: any) {
      alert(`无法获取补丁清单: ${err.message}`);
    }
  }

  // New Product Modal state
  let showCreateProductModal: boolean = false;
  let newProductData = {
    name: '',
    code: '',
    version_format: '23.0, 23.1, 24.0, 24.1',
    description: '',
    initial_versions_str: '23.0, 23.1, 24.0, 24.1'
  };

  // Service selection mode: 'existing' or 'custom'
  let isCustomService: boolean = false;
  let customServiceName: string = '';

  function openCreateModal() {
    isCustomService = false;
    customServiceName = '';
    const initialProductIds = selectedProductId ? [selectedProductId] : products.map(p => p.id);
    activeIssue = {
      title: '',
      product_ids: initialProductIds,
      service_name: services[0]?.name || 'GaussDB',
      severity: 'medium',
      status: 'analyzing',
      description: '',
      root_cause: '',
      impact: '',
      version_fixes: []
    };
    initVersionFixesForActiveIssue();
    showEditModal = true;
  }

  function openEditModal(issue: any) {
    activeIssue = JSON.parse(JSON.stringify(issue));
    if (!activeIssue.product_ids || activeIssue.product_ids.length === 0) {
      if (activeIssue.product_id) {
        activeIssue.product_ids = [activeIssue.product_id];
      } else {
        activeIssue.product_ids = products.map(p => p.id);
      }
    }
    const isKnownSvc = services.some(s => s.name === activeIssue.service_name);
    if (!isKnownSvc && activeIssue.service_name) {
      isCustomService = true;
      customServiceName = activeIssue.service_name;
    } else {
      isCustomService = false;
      customServiceName = '';
    }
    initVersionFixesForActiveIssue();
    showEditModal = true;
  }

  function toggleProductSelection(prodId: number | 'all') {
    if (prodId === 'all') {
      if (activeIssue.product_ids?.length === products.length) {
        activeIssue.product_ids = [];
      } else {
        activeIssue.product_ids = products.map(p => p.id);
      }
    } else {
      let current = activeIssue.product_ids || [];
      if (current.includes(prodId)) {
        current = current.filter((id: number) => id !== prodId);
      } else {
        current = [...current, prodId];
      }
      activeIssue.product_ids = current;
    }
    initVersionFixesForActiveIssue();
  }

  $: groupedModalVersionFixes = (() => {
    if (!activeIssue || !activeIssue.version_fixes) return [];
    const map = new Map<string, any[]>();
    activeIssue.version_fixes.forEach((vf: any) => {
      const code = vf.product_code || '通用';
      if (!map.has(code)) map.set(code, []);
      map.get(code)!.push(vf);
    });
    return Array.from(map.entries()).map(([code, items]) => ({ code, items }));
  })();

  function initVersionFixesForActiveIssue() {
    const prodIds = activeIssue.product_ids || [];
    let targetVers: any[] = [];
    if (prodIds.length === 0 || prodIds.length === products.length) {
      targetVers = versions;
    } else {
      targetVers = versions.filter(v => prodIds.includes(v.product_id));
    }
    const existingFixes = activeIssue.affected_versions || activeIssue.version_fixes || [];

    activeIssue.version_fixes = targetVers.map(v => {
      const match = existingFixes.find((e: any) => e.version_name === v.version_name);
      return {
        product_code: v.product_name,
        version_name: v.version_name,
        fix_status: match ? match.fix_status : 'unfixed',
        patch_version: match ? (match.patch_version || '') : ''
      };
    });
  }

  async function saveIssueForm() {
    const finalServiceName = isCustomService ? customServiceName.trim() : activeIssue.service_name;
    if (!activeIssue.title || !finalServiceName) {
      alert('请填写标题和服务名称');
      return;
    }

    activeIssue.service_name = finalServiceName;

    try {
      await fetchJson('/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeIssue)
      });
      showEditModal = false;
      await loadMetadata();
      await loadIssues();
    } catch (err: any) {
      alert(`保存失败: ${err.message}`);
    }
  }

  async function saveNewProduct() {
    if (!newProductData.name || !newProductData.code) {
      alert('请填写产品名称与产品代码');
      return;
    }
    try {
      const initial_versions = newProductData.initial_versions_str
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      await fetchJson('/topology/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProductData,
          initial_versions
        })
      });
      showCreateProductModal = false;
      newProductData = { name: '', code: '', version_format: '', description: '', initial_versions_str: '' };
      await loadMetadata();
    } catch (err: any) {
      alert(`新建产品失败: ${err.message}`);
    }
  }

  async function updateVersionFixStatus(issueId: number, versionName: string, fixStatus: string, patchVersion?: string, productCode?: string) {
    const prod = products.find(p => p.id === selectedProductId);
    const targetProdCode = productCode || prod?.code;
    try {
      await fetchJson(`/issues/${issueId}/version-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version_name: versionName,
          product_code: targetProdCode,
          fix_status: fixStatus,
          patch_version: patchVersion
        })
      });
      await loadIssues();
      if (selectedIssueForDetails && selectedIssueForDetails.id === issueId) {
        selectedIssueForDetails = issues.find(i => i.id === issueId) || selectedIssueForDetails;
      }
      if (showChecklistDrawer && selectedProductId && selectedVersionId) {
        openPatchChecklist();
      }
    } catch (err: any) {
      alert(`更新状态失败: ${err.message}`);
    }
  }

  async function handleSaveIssueDetails(updatedIssue: any) {
    try {
      await fetchJson(`/issues/${updatedIssue.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedIssue)
      });
      await loadMetadata();
      await loadIssues();
      selectedIssueForDetails = null;
    } catch (err: any) {
      alert(`保存修改失败: ${err.message}`);
    }
  }

  // Confirm dialog state for deletions
  let confirmDialog = {
    open: false,
    title: '',
    message: '',
    onConfirm: () => {}
  };

  function promptDeleteProduct(prodId: number, prodName: string) {
    confirmDialog = {
      open: true,
      title: '删除产品拓扑',
      message: `确定要删除产品 『${prodName}』 及其关联的版本信息吗？`,
      onConfirm: async () => {
        try {
          await fetchJson(`/topology/products/${prodId}`, { method: 'DELETE' });
          await loadMetadata();
          await loadIssues();
        } catch (err: any) {
          alert(`删除产品失败: ${err.message}`);
        } finally {
          confirmDialog.open = false;
        }
      }
    };
  }

  function promptDeleteIssue(id: number) {
    confirmDialog = {
      open: true,
      title: '删除已知问题',
      message: `确定要删除已知问题 #${id} 吗？相关数据与版本修复记录将被移除。`,
      onConfirm: async () => {
        try {
          await fetchJson(`/issues/${id}`, { method: 'DELETE' });
          await loadIssues();
          if (selectedIssueForDetails && selectedIssueForDetails.id === id) {
            selectedIssueForDetails = null;
          }
        } catch (err: any) {
          alert(`删除失败: ${err.message}`);
        } finally {
          confirmDialog.open = false;
        }
      }
    };
  }

  $: totalCount = issues.length;
  $: analyzingCount = issues.filter(i => i.status === 'analyzing').length;
  $: locatedCount = issues.filter(i => i.status === 'located').length;
  $: highSeverityCount = issues.filter(i => i.severity === 'high').length;
</script>

<div class="dashboard-container">
  <!-- Header with New Issue & New Product Buttons -->
  <div class="dashboard-header">
    <div class="header-title-group">
      <div class="crumb-row">
        <span class="crumb-app">WorkAgent</span>
        <span class="crumb-slash">/</span>
        <span class="crumb-page">Known Issues Dashboard</span>
      </div>
      <h2 class="main-title">结构化已知问题全景看板</h2>
    </div>
    <div class="header-btns">
      <button class="apple-button-secondary apple-button create-prod-btn" on:click={() => showCreateProductModal = true}>
        <Plus size={15} />
        <span>新建产品拓扑</span>
      </button>
      <button class="apple-button create-issue-btn" on:click={openCreateModal}>
        <Plus size={15} />
        <span>+ 新建已知问题</span>
      </button>
    </div>
  </div>

  <!-- Top Stats Grid -->
  <div class="stats-grid">
    <StatsCard title="已知结构化问题总数" value={totalCount} trend="+12% 本周" subtitle="全维度已收录问题" variant="blue" icon={AlertCircle} />
    <StatsCard title="正在分析排查" value={analyzingCount} trend="实时跟踪" subtitle="定位中未确认根因" variant="amber" icon={Clock} />
    <StatsCard title="已定位根因问题" value={locatedCount} trend="已确认代码Bug" subtitle="包含代码泄漏/死锁" variant="green" icon={CheckCircle2} />
    <StatsCard title="高严重度风险问题" value={highSeverityCount} trend="需优先修复" subtitle="重点影响现网及压测" variant="red" icon={ShieldAlert} />
  </div>

  <!-- Filter Bar -->
  <FilterBar
    {products}
    {versions}
    {services}
    bind:selectedProductId
    bind:selectedVersionId
    bind:selectedServiceId
    bind:selectedStatus
    bind:selectedTag
    {availableTags}
    bind:searchQuery
    onFilterChange={handleFilterChange}
    onOpenChecklist={openPatchChecklist}
  />

  <!-- Issue Table -->
  <IssueTable
    {issues}
    onSelectIssue={(issue) => selectedIssueForDetails = issue}
    onDeleteIssue={promptDeleteIssue}
    onQuickUpdateStatus={updateVersionFixStatus}
  />
</div>

<!-- Edit / Create Issue Modal -->
{#if showEditModal && activeIssue}
  <div class="modal-backdrop" on:click|self={() => showEditModal = false}>
    <div class="modal-card glass-panel">
      <div class="modal-header">
        <h3>{activeIssue.id ? `编辑问题 #${activeIssue.id}` : '新建已知问题'}</h3>
        <button class="close-btn" on:click={() => showEditModal = false}><X size={18} /></button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label>问题标题 *</label>
          <input type="text" class="apple-input" bind:value={activeIssue.title} placeholder="如: GaussDB 内存泄漏导致 504 错误" />
        </div>

        <div class="form-group">
          <label>所属产品 (支持多选) *</label>
          <div class="product-pills-selector">
            <button
              type="button"
              class="prod-pill {activeIssue.product_ids?.length === products.length ? 'active' : ''}"
              on:click={() => toggleProductSelection('all')}
            >
              🌐 通用 / 全产品
            </button>
            {#each products as p}
              <button
                type="button"
                class="prod-pill {activeIssue.product_ids?.includes(p.id) ? 'active' : ''}"
                on:click={() => toggleProductSelection(p.id)}
              >
                {p.code.toUpperCase()}
              </button>
            {/each}
          </div>
        </div>

        <div class="form-row">

          <div class="form-group">
            <label>所属服务 *</label>
            {#if !isCustomService}
              <AppleSelect
                options={[
                  ...services.map(s => ({ value: s.name, label: s.name })),
                  { value: '__custom__', label: '➕ 输入其他新服务...' }
                ]}
                bind:value={activeIssue.service_name}
                onChange={(val) => {
                  if (val === '__custom__') {
                    isCustomService = true;
                    customServiceName = '';
                  }
                }}
              />
            {:else}
              <div class="custom-svc-wrap">
                <input type="text" class="apple-input" bind:value={customServiceName} placeholder="如: GaussDB" />
                <button type="button" class="back-svc-btn" on:click={() => isCustomService = false}>选择已有服务</button>
              </div>
            {/if}
          </div>

          <div class="form-group">
            <label>严重程度</label>
            <AppleSelect
              options={[
                { value: 'high', label: 'HIGH (高)' },
                { value: 'medium', label: 'MEDIUM (中)' },
                { value: 'low', label: 'LOW (低)' }
              ]}
              bind:value={activeIssue.severity}
            />
          </div>

          <div class="form-group">
            <label>定位状态</label>
            <AppleSelect
              options={[
                { value: 'analyzing', label: '分析中' },
                { value: 'located', label: '已定位代码Bug' },
                { value: 'closed', label: '已关闭' }
              ]}
              bind:value={activeIssue.status}
            />
          </div>
        </div>

        <div class="form-group">
          <label>根因 / 代码疑点分析结论</label>
          <textarea class="apple-input" rows="2" bind:value={activeIssue.root_cause} placeholder="描述已确认或怀疑的代码 bug 所在位置与原理..."></textarea>
        </div>

        <div class="form-group">
          <label>现场现象 / 详细描述</label>
          <textarea class="apple-input" rows="2" bind:value={activeIssue.description} placeholder="问题场景、触发步骤或环境..."></textarea>
        </div>

        <!-- Version Fix Statuses Selection Section -->
        <div class="form-group">
          <label>涉及软件版本及其修复状态 * (点击标签直接点选)</label>
          <div class="version-fixes-editor glass-panel">
            {#if !groupedModalVersionFixes || groupedModalVersionFixes.length === 0}
              <div class="empty-fixes-hint">该产品暂无版本数据</div>
            {:else}
              {#each groupedModalVersionFixes as group}
                <div class="vf-group">
                  <div class="vf-group-header">
                    <span class="vf-group-code">{group.code}</span>
                  </div>
                  {#each group.items as vf}
                    <div class="vf-row">
                      <span class="vf-ver-name">{vf.version_name}</span>
                      <div class="vf-pills-row">
                        <button
                          type="button"
                          class="vf-pill na {vf.fix_status === 'na' ? 'active' : ''}"
                          on:click={() => vf.fix_status = 'na'}
                        >
                          ⚪ 不涉及
                        </button>
                        <button
                          type="button"
                          class="vf-pill unfixed {vf.fix_status === 'unfixed' ? 'active' : ''}"
                          on:click={() => vf.fix_status = 'unfixed'}
                        >
                          🔴 未修复
                        </button>
                        <button
                          type="button"
                          class="vf-pill fixed {vf.fix_status === 'fixed' ? 'active' : ''}"
                          on:click={() => vf.fix_status = 'fixed'}
                        >
                          🟡 已修复
                        </button>
                        <button
                          type="button"
                          class="vf-pill patched {vf.fix_status === 'patched' ? 'active' : ''}"
                          on:click={() => vf.fix_status = 'patched'}
                        >
                          🟢 已合入
                        </button>
                      </div>
                      {#if vf.fix_status === 'patched'}
                        <input type="text" class="apple-input vf-patch-input" placeholder="补丁号如 23.1_P01" bind:value={vf.patch_version} />
                      {/if}
                    </div>
                  {/each}
                </div>
              {/each}
            {/if}
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="apple-button-secondary apple-button" on:click={() => showEditModal = false}>取消</button>
        <button class="apple-button" on:click={saveIssueForm}>保存问题数据</button>
      </div>
    </div>
  </div>
{/if}

<!-- Create Product Modal -->
{#if showCreateProductModal}
  <div class="modal-backdrop" on:click|self={() => showCreateProductModal = false}>
    <div class="modal-card glass-panel">
      <div class="modal-header">
        <h3>产品拓扑管理与新建产品</h3>
        <button class="close-btn" on:click={() => showCreateProductModal = false}><X size={18} /></button>
      </div>

      <div class="modal-body">
        <!-- Existing Products List -->
        {#if products && products.length > 0}
          <div class="form-group">
            <label>已建立的产品列表 (支持删除产品及其版本)</label>
            <div class="existing-prods-list">
              {#each products as p}
                <div class="prod-item-row">
                  <div class="prod-item-left">
                    <span class="prod-code-badge">{p.code.toUpperCase()}</span>
                    <span class="prod-name-text">{p.name}</span>
                  </div>
                  <button
                    type="button"
                    class="del-prod-btn"
                    title="删除产品"
                    on:click={() => promptDeleteProduct(p.id, p.name)}
                  >
                    <Trash2 size={13} />
                    <span>删除产品</span>
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <div class="form-row">
          <div class="form-group">
            <label>新产品全称 *</label>
            <input type="text" class="apple-input" bind:value={newProductData.name} placeholder="如: Cloud Storage Platform" />
          </div>

          <div class="form-group">
            <label>新产品简称/Code *</label>
            <input type="text" class="apple-input" bind:value={newProductData.code} placeholder="如: csst" />
          </div>
        </div>

        <div class="form-group">
          <label>初始版本列表 (英文逗号分隔) *</label>
          <input type="text" class="apple-input" bind:value={newProductData.initial_versions_str} placeholder="如: 23.0, 23.1, 24.0, 24.1" />
        </div>

        <div class="form-group">
          <label>产品描述与说明</label>
          <textarea class="apple-input" rows="2" bind:value={newProductData.description} placeholder="描述该产品及核心功能..."></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button class="apple-button-secondary apple-button" on:click={() => showCreateProductModal = false}>取消</button>
        <button class="apple-button" on:click={saveNewProduct}>创建产品</button>
      </div>
    </div>
  </div>
{/if}

<!-- Patch Checklist Drawer -->
{#if showChecklistDrawer && checklistData}
  <div class="drawer-backdrop" on:click|self={() => showChecklistDrawer = false}>
    <div class="drawer-card glass-panel">
      <div class="drawer-header">
        <div class="drawer-title-wrap">
          <FileText size={20} class="text-indigo" />
          <div>
            <h3>{checklistData.product} {checklistData.version} 补丁合入提醒清单</h3>
            <p class="drawer-sub">共有 {checklistData.total_count} 个需关注/未合入的问题</p>
          </div>
        </div>
        <button class="close-btn" on:click={() => showChecklistDrawer = false}><X size={18} /></button>
      </div>

      <div class="drawer-body">
        {#if checklistData.checklist.length === 0}
          <div class="empty-drawer">🎉 该版本下暂无未合入的遗留问题！</div>
        {:else}
          {#each checklistData.checklist as item}
            <div class="checklist-item-card glass-panel">
              <div class="item-head">
                <span class="item-title">#{item.issue_id} {item.title}</span>
                <span class="svc-tag">{item.service_name}</span>
              </div>

              {#if item.root_cause}
                <div class="item-cause">根因: {item.root_cause}</div>
              {/if}

              <!-- Highlight cross-version fix warning! -->
              {#if item.fixed_in_other_versions && item.fixed_in_other_versions.length > 0}
                <div class="cross-version-alert">
                  <AlertCircle size={14} />
                  <span>核心提醒：该问题在其他版本已修复：<strong>{item.fixed_in_other_versions.join(', ')}</strong>，但当前 {checklistData.version} 版本尚未带上！</span>
                </div>
              {/if}

              <div class="item-actions">
                <span class="cur-status">当前状态: <strong>{item.current_version_status}</strong></span>
                <button
                  class="apple-button"
                  style="font-size: 12px; padding: 4px 10px;"
                  on:click={() => {
                    const patchNo = prompt('请输入合入的补丁版本号 (如 23.1_P01):', `${checklistData.version}_P01`);
                    if (patchNo) {
                      updateVersionFixStatus(item.issue_id, checklistData.version, 'patched', patchNo);
                    }
                  }}
                >
                  <Check size={14} />
                  <span>标记已合入补丁</span>
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Issue Details Modal -->
{#if selectedIssueForDetails}
  <IssueDetailsModal
    issue={selectedIssueForDetails}
    {products}
    {versions}
    {services}
    onClose={() => selectedIssueForDetails = null}
    onSaveIssue={handleSaveIssueDetails}
    onDeleteIssue={promptDeleteIssue}
    onUpdateFixStatus={updateVersionFixStatus}
  />
{/if}

<!-- Apple Confirm Modal -->
<AppleConfirmModal
  open={confirmDialog.open}
  title={confirmDialog.title}
  message={confirmDialog.message}
  confirmText="确认删除"
  onConfirm={confirmDialog.onConfirm}
  onCancel={() => confirmDialog.open = false}
/>

<style>
  .dashboard-container {
    padding: 0 20px 24px 20px;
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 14px;
  }

  .dashboard-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 4px 0;
  }

  .header-title-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .crumb-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }

  .crumb-app {
    color: var(--accent-blue);
    font-weight: 600;
  }

  .crumb-slash {
    color: var(--text-muted);
  }

  .crumb-page {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .main-title {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.4px;
  }

  .header-btns {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .create-issue-btn {
    background: var(--accent-blue);
    box-shadow: 0 4px 14px rgba(10, 132, 255, 0.35);
  }

  .modal-backdrop, .drawer-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-card {
    width: 100%;
    max-width: 640px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .modal-header, .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }

  .form-group label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
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

  .product-pills-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 6px 0;
  }

  .prod-pill {
    padding: 6px 14px;
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
    border: 1px solid var(--glass-border);
    color: var(--text-secondary);
    font-size: 13px;
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
    box-shadow: 0 2px 8px rgba(0, 122, 255, 0.25);
  }

  .header-btns {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .version-fixes-editor {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 180px;
    overflow-y: auto;
  }

  .vf-row {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
  }

  .vf-select-wrap {
    width: 190px;
  }

  .vf-group {
    margin-bottom: 12px;
  }

  .vf-group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .vf-group-code {
    font-size: 11px;
    font-weight: 700;
    color: var(--accent-blue);
    background: rgba(0, 122, 255, 0.15);
    padding: 2px 8px;
    border-radius: var(--radius-sm);
  }

  .vf-pills-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .vf-pill {
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--glass-border);
    color: var(--text-muted);
    font-size: 11.5px;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .vf-pill:hover {
    border-color: rgba(255, 255, 255, 0.3);
    color: var(--text-primary);
  }

  .vf-pill.na.active {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-secondary);
    border-color: rgba(255, 255, 255, 0.25);
    font-weight: 600;
  }

  .vf-pill.unfixed.active {
    background: rgba(255, 69, 58, 0.2);
    color: var(--status-high);
    border-color: var(--status-high);
    font-weight: 600;
  }

  .vf-pill.fixed.active {
    background: rgba(255, 159, 10, 0.2);
    color: var(--status-medium);
    border-color: var(--status-medium);
    font-weight: 600;
  }

  .vf-pill.patched.active {
    background: rgba(48, 209, 88, 0.2);
    color: var(--status-low);
    border-color: var(--status-low);
    font-weight: 600;
  }

  .existing-prods-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--bg-tertiary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 8px 10px;
    max-height: 160px;
    overflow-y: auto;
  }

  .prod-item-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius-sm);
  }

  .prod-item-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .prod-code-badge {
    background: rgba(0, 122, 255, 0.2);
    color: var(--accent-blue);
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: var(--radius-sm);
  }

  .prod-name-text {
    font-size: 13px;
    color: var(--text-primary);
  }

  .del-prod-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: 1px solid rgba(255, 69, 58, 0.3);
    color: var(--status-high);
    font-size: 11.5px;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .del-prod-btn:hover {
    background: rgba(255, 69, 58, 0.2);
  }

  .vf-select {
    width: 170px;
    padding: 6px 10px;
    font-size: 12.5px;
  }

  .vf-patch-input {
    flex: 1;
    padding: 6px 10px;
    font-size: 12.5px;
  }

  .empty-fixes-hint {
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
    padding: 10px;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--glass-border);
  }

  .drawer-card {
    position: absolute;
    right: 0;
    top: 0;
    height: 100vh;
    width: 580px;
    border-radius: 0;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .drawer-title-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .text-indigo { color: var(--accent-indigo); }
  .drawer-sub { font-size: 12px; color: var(--text-muted); }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .checklist-item-card {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .item-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .item-title {
    font-weight: 600;
    font-size: 14px;
  }

  .svc-tag {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(0, 122, 255, 0.15);
    color: var(--accent-blue);
  }

  .item-cause {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .cross-version-alert {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    background: rgba(255, 69, 58, 0.15);
    border: 1px solid rgba(255, 69, 58, 0.3);
    color: var(--status-high);
    font-size: 12px;
  }

  .item-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 12px;
  }
</style>
