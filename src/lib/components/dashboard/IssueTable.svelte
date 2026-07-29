<script lang="ts">
  import { AlertTriangle, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-svelte';

  export let issues: any[] = [];
  export let onSelectIssue: (issue: any) => void;
  export let onDeleteIssue: (id: number) => void;

  let currentPage: number = 1;
  let pageSize: number = 10;

  $: totalCount = issues.length;
  $: totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Reset to page 1 whenever total issues array changes
  $: if (issues) {
    if (currentPage > totalPages) {
      currentPage = 1;
    }
  }

  $: startIndex = (currentPage - 1) * pageSize;
  $: endIndex = Math.min(totalCount, currentPage * pageSize);
  $: paginatedIssues = issues.slice(startIndex, endIndex);

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
    }
  }

  function handlePageSizeChange(e: Event) {
    const val = Number((e.target as HTMLSelectElement).value);
    pageSize = val;
    currentPage = 1;
  }

  function getSeverityClass(sev: string) {
    if (sev === 'high') return 'high';
    if (sev === 'medium') return 'medium';
    return 'low';
  }

  function getStatusBadge(status: string) {
    if (status === 'closed') return { label: '已关闭', color: 'var(--status-low)' };
    if (status === 'located') return { label: '已定位', color: 'var(--accent-blue)' };
    return { label: '分析中', color: 'var(--status-medium)' };
  }
</script>

<div class="table-card glass-panel">
  <div class="table-container">
    {#if issues.length === 0}
      <div class="empty-state">
        <AlertTriangle size={32} class="empty-icon" />
        <p>未找到符合要求的结构化已知问题</p>
        <span class="sub">你可以通过 AI 对话快捷创建，或修改上方筛选条件</span>
      </div>
    {:else}
      <table class="issue-table">
        <thead>
          <tr>
            <th style="width: 70px;">ID</th>
            <th>问题标题 / 现象描述</th>
            <th style="width: 140px;">所属产品</th>
            <th style="width: 140px;">所属服务</th>
            <th style="width: 100px;">严重度</th>
            <th style="width: 120px;">定位状态</th>
            <th style="width: 120px; text-align: right;">操作</th>
          </tr>
        </thead>
        <tbody>
          {#each paginatedIssues as issue}
            <tr class="issue-row">
              <td class="id-col">#{issue.id}</td>
              
              <td class="title-col" on:click={() => onSelectIssue(issue)}>
                <div class="title-text">{issue.title}</div>
                {#if issue.description}
                  <div class="desc-snippet">{issue.description}</div>
                {/if}
              </td>

              <td>
                <span class="product-tag">{issue.product_summary || '通用/跨产品'}</span>
              </td>

              <td>
                <span class="service-tag">{issue.service_name}</span>
              </td>

              <td>
                <span class="severity-badge {getSeverityClass(issue.severity)}">
                  {issue.severity.toUpperCase()}
                </span>
              </td>

              <td>
                <span class="status-badge" style="color: {getStatusBadge(issue.status).color}; border-color: {getStatusBadge(issue.status).color}">
                  {getStatusBadge(issue.status).label}
                </span>
              </td>

              <td class="actions-col">
                <button class="action-btn detail-btn" on:click={() => onSelectIssue(issue)} title="查看详情与修改">
                  <Eye size={14} />
                  <span>详情</span>
                </button>
                <button class="action-btn delete-btn" on:click={() => onDeleteIssue(issue.id)} title="删除问题">
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  <!-- Pagination Bar Footer -->
  {#if totalCount > 0}
    <div class="pagination-footer">
      <div class="pagination-info">
        共 <strong class="highlight-count">{totalCount}</strong> 条已知问题，显示第 {startIndex + 1} - {endIndex} 条
      </div>

      <div class="pagination-controls">
        <button
          type="button"
          class="page-btn nav-btn"
          disabled={currentPage === 1}
          on:click={() => goToPage(currentPage - 1)}
        >
          <ChevronLeft size={15} />
          <span>上一页</span>
        </button>

        <div class="page-numbers">
          {#each Array(totalPages) as _, i}
            {#if i + 1 === 1 || i + 1 === totalPages || (i + 1 >= currentPage - 2 && i + 1 <= currentPage + 2)}
              <button
                type="button"
                class="page-num {currentPage === i + 1 ? 'active' : ''}"
                on:click={() => goToPage(i + 1)}
              >
                {i + 1}
              </button>
            {:else if i + 1 === currentPage - 3 || i + 1 === currentPage + 3}
              <span class="page-ellipsis">...</span>
            {/if}
          {/each}
        </div>

        <button
          type="button"
          class="page-btn nav-btn"
          disabled={currentPage === totalPages}
          on:click={() => goToPage(currentPage + 1)}
        >
          <span>下一页</span>
          <ChevronRight size={15} />
        </button>
      </div>

      <div class="page-size-selector">
        <span class="size-label">每页显示:</span>
        <select class="apple-input size-select" value={pageSize} on:change={handlePageSizeChange}>
          <option value={10}>10 条/页</option>
          <option value={20}>20 条/页</option>
          <option value={50}>50 条/页</option>
          <option value={100}>100 条/页</option>
        </select>
      </div>
    </div>
  {/if}
</div>

<style>
  .table-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .table-container {
    overflow-x: auto;
  }

  .empty-state {
    padding: 60px 20px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    color: var(--text-muted);
  }

  .empty-icon {
    color: var(--status-medium);
  }

  .issue-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
  }

  th {
    padding: 14px 16px;
    text-align: left;
    color: var(--text-secondary);
    font-weight: 600;
    border-bottom: 1px solid var(--glass-border);
    white-space: nowrap;
  }

  td {
    padding: 14px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    vertical-align: middle;
  }

  .issue-row {
    transition: background var(--transition-fast);
  }

  .issue-row:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .id-col {
    font-weight: 700;
    color: var(--accent-blue);
    white-space: nowrap;
  }

  .title-col {
    cursor: pointer;
  }

  .title-text {
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.4;
  }

  .desc-snippet {
    font-size: 12.5px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 3px;
  }

  .product-tag {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-primary);
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }

  .service-tag {
    background: rgba(175, 82, 222, 0.15);
    color: var(--accent-purple);
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    white-space: nowrap;
  }

  .severity-badge {
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    font-size: 11.5px;
    font-weight: 700;
    white-space: nowrap;
  }

  .severity-badge.high {
    background: rgba(255, 69, 58, 0.15);
    color: var(--status-high);
  }

  .severity-badge.medium {
    background: rgba(255, 159, 10, 0.15);
    color: var(--status-medium);
  }

  .severity-badge.low {
    background: rgba(48, 209, 88, 0.15);
    color: var(--status-low);
  }

  .status-badge {
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    border: 1px solid;
    font-size: 12px;
    white-space: nowrap;
  }

  .actions-col {
    white-space: nowrap;
    text-align: right;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    border: none;
    font-size: 12.5px;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .detail-btn {
    background: rgba(0, 122, 255, 0.15);
    color: var(--accent-blue);
    border: 1px solid rgba(0, 122, 255, 0.3);
  }

  .detail-btn:hover {
    background: var(--accent-blue);
    color: #ffffff;
  }

  .delete-btn {
    background: transparent;
    color: var(--text-muted);
    border: 1px solid transparent;
  }

  .delete-btn:hover {
    background: rgba(255, 69, 58, 0.15);
    color: var(--status-high);
  }

  /* Pagination Bar Styling */
  .pagination-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 18px;
    border-top: 1px solid var(--glass-border);
    background: rgba(0, 0, 0, 0.15);
    user-select: none;
  }

  .pagination-info {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .highlight-count {
    color: var(--accent-blue);
    font-weight: 700;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .nav-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 12px;
    border-radius: var(--radius-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--glass-border);
    color: var(--text-primary);
    font-size: 12.5px;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .nav-btn:hover:not(:disabled) {
    background: var(--glass-bg-hover);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .page-numbers {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .page-num {
    min-width: 30px;
    height: 30px;
    padding: 0 6px;
    border-radius: var(--radius-sm);
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .page-num:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .page-num.active {
    background: var(--accent-blue);
    color: #ffffff;
    font-weight: 700;
    border-color: var(--accent-blue);
    box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
  }

  .page-ellipsis {
    color: var(--text-muted);
    font-size: 13px;
    padding: 0 2px;
  }

  .page-size-selector {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .size-select {
    width: 100px;
    padding: 4px 8px;
    font-size: 12.5px;
  }
</style>
