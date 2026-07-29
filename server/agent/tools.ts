import fs from 'node:fs';
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
      description: '记录一个在研或现网问题，包括服务名称、标题、描述、严重程度、影响范围、以及涉及的软件版本与修复状态',
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
      description: '更新已存在问题的状态、根因、严重度或版本修复情况',
      parameters: {
        type: 'object',
        properties: {
          issue_id: { type: 'number', description: '问题 ID' },
          title: { type: 'string', description: '标题' },
          root_cause: { type: 'string', description: '定位结论或代码 bug 原因' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          status: { type: 'string', enum: ['analyzing', 'located', 'closed'] },
          impact: { type: 'string' }
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
      description: '按产品、版本、服务、状态或关键字检索已有问题列表',
      parameters: {
        type: 'object',
        properties: {
          product_code: { type: 'string', description: '产品代码，如 csp' },
          version_name: { type: 'string', description: '版本号，如 23.1' },
          service_name: { type: 'string', description: '服务名称，如 GaussDB' },
          status: { type: 'string', enum: ['analyzing', 'located', 'closed'] },
          fix_status: { type: 'string', enum: ['unfixed', 'fixed', 'patched'] },
          search: { type: 'string', description: '搜索关键字' }
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
      name: 'read_local_log',
      description: '读取用户指定的本地日志或代码文件内容（用于协助分析问题）',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: '本地日志或代码文件的绝对路径' },
          max_lines: { type: 'number', description: '最多读取的行数，默认 300 行' }
        },
        required: ['file_path']
      }
    }
  }
];

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
        impact: args.impact
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
    case 'read_local_log': {
      try {
        if (!fs.existsSync(args.file_path)) {
          return { error: `文件未找到: ${args.file_path}` };
        }
        const content = fs.readFileSync(args.file_path, 'utf-8');
        const lines = content.split('\n');
        const max = args.max_lines || 300;
        const excerpt = lines.slice(-max).join('\n');
        return {
          total_lines: lines.length,
          read_lines: Math.min(lines.length, max),
          content: excerpt
        };
      } catch (err: any) {
        return { error: `读取文件失败: ${err.message}` };
      }
    }
    default:
      throw new Error(`未知的工具: ${name}`);
  }
}
