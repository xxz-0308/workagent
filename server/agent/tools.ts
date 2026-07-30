import fs from 'node:fs';
import path from 'node:path';
import {
  createOrUpdateIssue,
  updateIssueVersionStatus,
  getPatchChecklist,
  getIssues,
  saveRule,
  getRules,
  getProducts,
  getVersions,
  getServices,
  getIssueById
} from '../db/database.js';

export const agentTools = [
  {
    type: 'function',
    function: {
      name: 'record_issue',
      description: '记录一个在研或现网问题，包括服务名称、标题、描述、标签、严重程度、影响范围、以及涉及的软件版本与修复状态',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '问题的简短描述/标题' },
          service_name: { type: 'string', description: '所属服务名称（如 GaussDB, PT数据库, CGPLite 等）' },
          description: { type: 'string', description: '问题的详细现象、环境或触发场景' },
          root_cause: { type: 'string', description: '已定位出的代码 bug、怀疑点或根本原因' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'], description: '严重程度' },
          status: { type: 'string', enum: ['analyzing', 'located', 'closed'], description: '定位状态：analyzing(分析中), located(已定位), closed(已关闭)' },
          impact: { type: 'string', description: '问题影响范围' },
          tags: { type: 'string', description: '标签，多个标签用英文逗号分隔（如: 数据库,死锁,性能）' },
          version_fixes: {
            type: 'array',
            description: '涉及的产品版本列表及其修复状态',
            items: {
              type: 'object',
              properties: {
                product_code: { type: 'string', description: '产品代码，如 csp, cgp' },
                version_name: { type: 'string', description: '版本号，如 23.0, 23.1, 24.0' },
                fix_status: { type: 'string', enum: ['unfixed', 'fixed', 'patched'], description: '该版本修复状态：unfixed(未修复), fixed(已修复), patched(已合入补丁)' },
                patch_version: { type: 'string', description: '合入的具体补丁号，如 23.1_P01' }
              },
              required: ['version_name', 'fix_status']
            }
          }
        },
        required: ['title', 'service_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_issue',
      description: '更新已存在问题的状态、根因、严重度、标签或版本修复情况',
      parameters: {
        type: 'object',
        properties: {
          issue_id: { type: 'number', description: '问题 ID' },
          title: { type: 'string', description: '标题' },
          root_cause: { type: 'string', description: '定位结论或代码 bug 原因' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          status: { type: 'string', enum: ['analyzing', 'located', 'closed'] },
          impact: { type: 'string' },
          tags: { type: 'string', description: '标签（英文逗号分隔）' }
        },
        required: ['issue_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'mark_fixed',
      description: '标记某个问题在特定版本已修复（例如在 24.0 已修复，但在 23.1 尚未合入补丁）',
      parameters: {
        type: 'object',
        properties: {
          issue_id: { type: 'number', description: '问题 ID' },
          product_code: { type: 'string', description: '产品代码（如 csp）' },
          version_name: { type: 'string', description: '版本号（如 24.0）' },
          fix_status: { type: 'string', enum: ['fixed', 'patched', 'unfixed'], description: '修复状态' },
          patch_version: { type: 'string', description: '补丁号（可选，如 24.0_P01）' }
        },
        required: ['issue_id', 'version_name', 'fix_status']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_patch_checklist',
      description: '查询某个产品版本（如 CSP 23.1）在出补丁时需要合入的所有问题列表，会自动提醒哪些问题在其他版本已修复但当前版本尚未带上',
      parameters: {
        type: 'object',
        properties: {
          product_code: { type: 'string', description: '产品代码或名称，如 csp 或 CSP' },
          version_name: { type: 'string', description: '版本号，如 23.1' }
        },
        required: ['product_code', 'version_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'query_issues',
      description: '按产品、版本、服务、状态、标签或关键字检索已有问题列表',
      parameters: {
        type: 'object',
        properties: {
          product_code: { type: 'string', description: '产品代码，如 csp' },
          version_name: { type: 'string', description: '版本号，如 23.1' },
          service_name: { type: 'string', description: '服务名称，如 GaussDB' },
          status: { type: 'string', enum: ['analyzing', 'located', 'closed'] },
          fix_status: { type: 'string', enum: ['unfixed', 'fixed', 'patched'] },
          search: { type: 'string', description: '搜索关键字（支持搜索标题、根因、标签）' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'save_rule',
      description: '固化通过对话描述的产品/版本/服务对应规则或划分标准，以便 Agent 后续遵循',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: '规则分类，如 product_structure (产品结构), version_naming (版本规则)' },
          content: { type: 'string', description: '规则的清晰自然语言描述' },
          structured_data: { type: 'object', description: '规则解析后的结构化 JSON 数据' }
        },
        required: ['category', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_rules',
      description: '获取当前固化的所有规则列表',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_codebase_files',
      description: '递归扫描指定目录的完整文件树结构。用于定位问题时快速了解代码仓库的目录组织。path 参数为必填，用户在对话中提供的代码仓路径',
      parameters: {
        type: 'object',
        properties: {
          dir_path: { type: 'string', description: '代码仓或目录的绝对路径（必填）' },
          max_depth: { type: 'number', description: '递归扫描的最大层级深度，默认 4 层，最大 6 层' }
        },
        required: ['dir_path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_code_file',
      description: '读取源码文件内容用于排查 Bug。支持绝对路径，或在 base_path 下解析相对路径。一次读取上限 500 行，大文件建议先用 search_codebase 定位再精确读取',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: '文件的绝对路径，或相对于 base_path 的相对路径' },
          base_path: { type: 'string', description: '代码仓根目录的绝对路径（当 file_path 为相对路径时使用）' },
          max_lines: { type: 'number', description: '最多读取行数，默认 500 行' }
        },
        required: ['file_path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_codebase',
      description: '在指定代码仓目录中递归搜索关键字（函数名、错误码、日志关键字等）。优先用此工具定位关键代码位置，再用 read_code_file 查看上下文',
      parameters: {
        type: 'object',
        properties: {
          base_path: { type: 'string', description: '代码仓根目录的绝对路径（必填）' },
          query: { type: 'string', description: '搜索关键字，如函数名、错误码 ERR_LOCK_TIMEOUT、日志标记等' },
          file_extension: { type: 'string', description: '文件扩展名过滤，如 .ts, .go, .java, .cpp' }
        },
        required: ['base_path', 'query']
      }
    }
  }
];

function getTargetCodebasePath(customPath?: string): string {
  if (customPath && customPath.trim()) return customPath.trim();
  return process.cwd();
}

function walkDir(dir: string, maxDepth: number, currentDepth = 0): string[] {
  if (currentDepth > maxDepth) return [];
  let results: string[] = [];
  try {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'dist' || item.name === 'data') continue;
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        results.push(`${fullPath}/`);
        results = results.concat(walkDir(fullPath, maxDepth, currentDepth + 1));
      } else {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

export async function executeTool(name: string, args: any): Promise<any> {
  switch (name) {
    case 'record_issue': {
      const issue = createOrUpdateIssue({
        title: args.title,
        service_name: args.service_name,
        description: args.description,
        root_cause: args.root_cause,
        severity: args.severity,
        status: args.status,
        impact: args.impact,
        tags: args.tags,
        version_fixes: args.version_fixes
      });
      return { success: true, message: `已成功记录问题 #${issue.id}: ${issue.title}`, issue };
    }
    case 'update_issue': {
      const issue = getIssueById(args.issue_id);
      if (!issue) return { success: false, message: `找不到问题 #${args.issue_id}` };
      const updated = createOrUpdateIssue({
        id: args.issue_id,
        title: args.title || issue.title,
        service_name: issue.service_name || '',
        description: issue.description,
        root_cause: args.root_cause,
        severity: args.severity,
        status: args.status,
        impact: args.impact,
        tags: args.tags !== undefined ? args.tags : issue.tags
      });
      return { success: true, message: `已成功更新问题 #${args.issue_id}`, issue: updated };
    }
    case 'mark_fixed': {
      const updated = updateIssueVersionStatus({
        issue_id: args.issue_id,
        version_name: args.version_name,
        product_code: args.product_code,
        fix_status: args.fix_status,
        patch_version: args.patch_version
      });
      return { success: true, message: `已成功更新问题 #${args.issue_id} 在版本 ${args.version_name} 的状态为 ${args.fix_status}`, issue: updated };
    }
    case 'get_patch_checklist': {
      const checklist = getPatchChecklist(args.product_code, args.version_name);
      return checklist;
    }
    case 'query_issues': {
      let productId: number | undefined;
      if (args.product_code) {
        const prod = getProducts().find(p => p.code.toLowerCase() === args.product_code.toLowerCase() || p.name.toLowerCase() === args.product_code.toLowerCase());
        productId = prod?.id;
      }
      let versionId: number | undefined;
      if (args.version_name && productId) {
        const ver = getVersions(productId).find(v => v.version_name === args.version_name);
        versionId = ver?.id;
      }
      let serviceId: number | undefined;
      if (args.service_name) {
        const svc = getServices().find(s => s.name.toLowerCase() === args.service_name.toLowerCase());
        serviceId = svc?.id;
      }
      const issues = getIssues({
        productId,
        versionId,
        serviceId,
        status: args.status,
        fixStatus: args.fixStatus,
        search: args.search
      });
      return { total: issues.length, issues };
    }
    case 'save_rule': {
      const rule = saveRule(args.category, args.content, args.structured_data);
      return { success: true, message: '规则已成功固化保存', rule };
    }
    case 'get_rules': {
      const rules = getRules();
      return { total: rules.length, rules };
    }
    case 'list_codebase_files': {
      const basePath = getTargetCodebasePath(args.dir_path);
      if (!fs.existsSync(basePath)) {
        return { error: `代码仓路径不存在: ${basePath}` };
      }
      const maxDepth = args.max_depth || 4;
      const fileList = walkDir(basePath, maxDepth);
      const relList = fileList.map(f => path.relative(basePath, f));
      return {
        base_path: basePath,
        total_files: relList.length,
        files: relList.slice(0, 300)
      };
    }
    case 'read_code_file': {
      try {
        const basePath = args.base_path || process.cwd();
        let targetPath = args.file_path;
        if (!path.isAbsolute(targetPath)) {
          targetPath = path.join(basePath, targetPath);
        }
        if (!fs.existsSync(targetPath)) {
          return { error: `文件未找到: ${targetPath}` };
        }
        const content = fs.readFileSync(targetPath, 'utf-8');
        const lines = content.split('\n');
        const max = args.max_lines || 500;
        const excerpt = lines.slice(0, max).join('\n');
        return {
          file_path: targetPath,
          total_lines: lines.length,
          read_lines: Math.min(lines.length, max),
          content: excerpt
        };
      } catch (err: any) {
        return { error: `读取文件失败: ${err.message}` };
      }
    }
    case 'search_codebase': {
      try {
        const basePath = args.base_path || process.cwd();
        if (!fs.existsSync(basePath)) {
          return { error: `代码仓路径不存在: ${basePath}` };
        }
        const files = walkDir(basePath, 5).filter(f => !f.endsWith('/'));
        const matches: { file: string; line: number; content: string }[] = [];
        const extFilter = args.file_extension ? args.file_extension.toLowerCase() : null;
        const q = args.query.toLowerCase();

        for (const file of files) {
          if (extFilter && !file.toLowerCase().endsWith(extFilter)) continue;
          try {
            const content = fs.readFileSync(file, 'utf-8');
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
              if (line.toLowerCase().includes(q) && matches.length < 50) {
                matches.push({
                  file: path.relative(basePath, file),
                  line: idx + 1,
                  content: line.trim()
                });
              }
            });
          } catch {}
          if (matches.length >= 50) break;
        }

        return {
          query: args.query,
          match_count: matches.length,
          matches
        };
      } catch (err: any) {
        return { error: `搜索代码失败: ${err.message}` };
      }
    }
    default:
      throw new Error(`未知的工具: ${name}`);
  }
}
