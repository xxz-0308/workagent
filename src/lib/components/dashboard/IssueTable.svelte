<script lang="ts">
  import { AlertTriangle, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-svelte';

  export let issues: any[] = [];
  export let onSelectIssue: (issue: any) => void;
  export let onDeleteIssue: (id: number) => void;

  let currentPage: number = 1;
  let pageSize: number = 10;

  $: totalCount = issues.length;
  $: totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

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

  function getSeverityBadge(sev: string) {
    if (sev === 'high') return { label: 'HIGH', class: 'high' };
    if (sev === 'medium') return { label: 'MEDIUM', class: 'medium' };
    return { label: 'LOW', class: 'low' };
  }

  function getStatusInfo(status: string) {
    if (status === 'closed') return { label: '已关闭', color: 'var(--status-low)' };
    if (status === 'located') return { label: '已定位', color: 'var(--accent-blue)' };
    return { label: '分析中', color: 'var(--status-medium)' };
  }

  function formatIssueKey(issue: any) {
    const prefix = issue.product_summary && issue.product_summary !== '通用/全产品'
      ? issue.product_summary.split(',')[0].trim().toUpperCase()
      : 'ISSUE';
    return `#${prefix}-${issue.id}`;
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
            <th style="width: 95px;">ISSUE KEY</th>
            <th>问题标题 / 现象描述</th>
            <th style="width: 130px;">所属产品</th>
            <th style="width: 130px;">所属服务</th>
            <th style="width: 100px;">严重度</th>
            <th style="width: 110px;">定位状态</th>
            <th style="width: 110px; text-align: right;">操作</th>
          </tr>
        </thead>
        <tbody>
          {#each paginatedIssues as issue}
            <tr class="issue-row">
              <td class="id-col mono-font">
                <span class="issue-key-badge">{formatIssueKey(issue)}</span>
              </td>
              
              <td class="title-col" on:click={() => onSelectIssue(issue)}>
                <div class="title-text">{issue.title}</div>
                {#if issue.description}
                  <div class="desc-snippet">{issue.description}</div>
                {/if}
              </td>

              <td>
                <span class="product-tag">{issue.product_summary || '通用/全产品'}</span>
              </td>

              <td>
                <span class="service-tag">{issue.service_name}</span>
              </td>

              <td>
                <span class="severity-badge {getSeverityBadge(issue.severity).class}">
                  {getSeverityBadge(issue.severity).label}
                </span>
              </td>

              <td>
                <div class="status-cell">
                  <span class="status-dot" style="background: {getStatusInfo(issue.status).color}; box-shadow: 0 0 6px {getStatusInfo(issue.status).color};"></span>
                  <span class="status-label" style="color: {getStatusInfo(issue.status).color}">
                    {getStatusInfo(issue.status).label}
                  </span>
                </div>
              </td>

              <td class="actions-col">
                <button class="action-btn detail-btn" on:click={() => onSelectIssue(issue)} title="查看详情与修改">
                  <Eye size={13} />
                  <span>详情</span>
                </button>
                <button class="action-btn delete-btn" on:click={() => onDeleteIssue(issue.id)} title="删除问题">
                  <Trash2 size={13} />
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
        共 <strong class="highlight-count mono-font">{totalCount}</strong> 条已知问题，显示第 {startIndex + 1} - {endIndex} 条
      </div>

      <div class="pagination-controls">
        <button
          type="button"
          class="page-btn nav-btn"
          disabled={currentPage === 1}
          on:click={() => goToPage(currentPage - 1)}
        >
          <ChevronLeft size={14} />
          <span>上一页</span>
        </button>

        <div class="page-numbers">
          {#each Array(totalPages) as _, i}
            {#if i + 1 === 1 || i + 1 === totalPages || (i + 1 >= currentPage - 2 && i + 1 <= currentPage + 2)}
              <button
                type="button"
                class="page-num mono-font {currentPage === i + 1 ? 'active' : ''}"
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
          <ChevronRight size={14} />
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
    font-size: 13px;
  }

  th {
    padding: 12px 14px;
    text-align: left;
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 11.5px;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    border-bottom: 1px solid var(--glass-border);
    white-space: nowrap;
  }

  td {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    vertical-align: middle;
  }

  .issue-row {
    transition: background var(--transition-fast);
  }

  .issue-row:hover {
    background: rgba(255, 255, 255, 0.035);
  }

  .id-col {
    white-space: nowrap;
  }

  .issue-key-badge {
    color: var(--accent-blue);
    background: rgba(10, 132, 255, 0.12);
    border: 1px solid rgba(10, 132, 255, 0.25);
    padding: 2px 7px;
    border-radius: var(--radius-sm);
    font-size: 11.5px;
    font-weight: 600;
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
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
  }

  .product-tag {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;
  }

  .service-tag {
    background: rgba(191, 90, 242, 0.12);
    border: 1px solid rgba(191, 90, 242, 0.25);
    color: var(--accent-purple);
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    font-size: 11.5px;
    white-space: nowrap;
  }

  .severity-badge {
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
    border: 1px solid transparent;
  }

  .severity-badge.high {
    background: rgba(255, 69, 58, 0.12);
    color: var(--status-high);
    border-color: rgba(255, 69, 58, 0.25);
  }

  .severity-badge.medium {
    background: rgba(255, 159, 10, 0.12);
    color: var(--status-medium);
    border-color: rgba(255, 159, 10, 0.25);
  }

  .severity-badge.low {
    background: rgba(48, 209, 88, 0.12);
    color: var(--status-low);
    border-color: rgba(48, 209, 88, 0.25);
  }

  .status-cell {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-label {
    font-size: 12px;
    font-weight: 500;
  }

  .actions-col {
    white-space: nowrap;
    text-align: right;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    font-size: 12px;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .detail-btn {
    background: rgba(10, 132, 255, 0.12);
    color: var(--accent-blue);
    border-color: rgba(10, 132, 255, 0.25);
  }

  .detail-btn:hover {
    background: var(--accent-blue);
    color: #ffffff;
  }

  .delete-btn {
    background: transparent;
    color: var(--text-muted);
  }

  .delete-btn:hover {
    background: rgba(255, 69, 58, 0.12);
    color: var(--status-high);
    border-color: rgba(255, 69, 58, 0.25);
  }

  /* Pagination Styling */
  .pagination-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 16px;
    border-top: 1px solid var(--glass-border);
    background: rgba(0, 0, 0, 0.12);
    user-select: none;
  }

  .pagination-info {
    font-size: 12.5px;
    color: var(--text-secondary);
  }

  .highlight-count {
    color: var(--accent-blue);
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .nav-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--glass-border);
    color: var(--text-primary);
    font-size: 12px;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .nav-btn:hover:not(:disabled) {
    background: var(--glass-bg-hover);
    border-color: var(--glass-border-hover);
  }

  .nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .page-numbers {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .page-num {
    min-width: 28px;
    height: 28px;
    padding: 0 4px;
    border-radius: var(--radius-sm);
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-secondary);
    font-size: 12px;
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
  }

  .page-ellipsis {
    color: var(--text-muted);
    font-size: 12px;
    padding: 0 2px;
  }

  .page-size-selector {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .size-select {
    width: 95px;
    padding: 3px 6px;
    font-size: 12px;
  }
</style>
