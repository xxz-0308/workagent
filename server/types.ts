export interface Product {
  id: number;
  name: string;
  code: string;
  version_format?: string;
  description?: string;
  created_at?: string;
}

export interface Version {
  id: number;
  product_id: number;
  version_name: string;
  status: string;
  product_name?: string;
}

export interface ServiceItem {
  id: number;
  name: string;
  description?: string;
}

export interface ProductServiceRelation {
  product_id: number;
  service_id: number;
}

export type SeverityLevel = 'high' | 'medium' | 'low';
export type IssueStatus = 'analyzing' | 'located' | 'closed';
export type FixStatus = 'na' | 'unfixed' | 'fixed' | 'patched';

export interface Issue {
  id: number;
  title: string;
  description?: string;
  root_cause?: string;
  service_id: number;
  service_name?: string;
  severity: SeverityLevel;
  status: IssueStatus;
  impact?: string;
  tags?: string;
  created_at: string;
  updated_at: string;
  // Associated versions with their fix status
  affected_versions?: {
    version_id: number;
    version_name: string;
    product_name: string;
    fix_status: FixStatus;
    patch_version?: string;
  }[];
}

export interface IssueVersion {
  id: number;
  issue_id: number;
  version_id: number;
  fix_status: FixStatus;
  patch_version?: string;
  fixed_at?: string;
}

export interface Rule {
  id: number;
  category: string;
  content: string;
  structured_data?: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id?: number;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: string;
  created_at?: string;
}

export interface PaginatedIssues {
  issues: Issue[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AppSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  theme: 'dark' | 'light';
  language: 'zh' | 'en';
}
