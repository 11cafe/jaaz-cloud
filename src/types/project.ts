/**
 * 项目相关的类型定义
 * 与数据库 schema 和 API 返回结构保持一致
 */

// 项目状态枚举
export type ProjectStatus =
  | "draft"
  | "active"
  | "completed"
  | "shared"
  | "deleted";

// 步骤状态枚举
export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

// 基础项目信息（用于列表显示）
export interface Project {
  id: string;
  title: string;
  description?: string;
  cover?: string;
  featured?: string[];
  status: ProjectStatus;
  is_public: boolean;
  view_count: number;
  like_count: number;
  total_cost: string;
  created_at: string;
  updated_at: string;
}

// 项目步骤信息
export interface ProjectStep {
  id: string;
  step_order: number;
  prompt?: string;
  model?: string;
  inputs?: any;
  parameters?: any;
  status: StepStatus;
  cost?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  outputs: StepOutput[];
}

// 步骤输出信息
export interface StepOutput {
  id: string;
  step_id: string;
  url: string;
  type: string;
  format?: string;
  order: number;
  metadata?: any;
  created_at: string;
}

// 完整项目详情（包含步骤和输出）
export interface ProjectDetail extends Project {
  user_id: number;
  metadata?: any;
  steps: ProjectStep[];
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// 分页信息
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// 项目列表 API 响应
export interface ProjectListResponse extends ApiResponse<Project[]> {
  pagination: PaginationInfo;
}

// 项目详情 API 响应
export interface ProjectDetailResponse extends ApiResponse<ProjectDetail> {}

// 创建项目 API 请求
export interface CreateProjectRequest {
  title: string;
  description?: string;
}

// 创建项目 API 响应
export interface CreateProjectResponse extends ApiResponse<Project> {}
