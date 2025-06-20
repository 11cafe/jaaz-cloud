/**
 * 公共分享项目列表API
 * 功能：获取所有用户分享到公共画廊的项目列表（分页）
 * 方法：GET
 * 认证：无需认证，公开访问（但会检查用户登录状态以显示点赞状态）
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { drizzleDb } from "@/server/db-adapters/PostgresAdapter";
import {
  ProjectsSchema,
  StepsSchema,
  StepOutputsSchema,
} from "@/schema/project";
import { UserSchema } from "@/schema/index";
import { eq, desc, and, asc, ilike, or } from "drizzle-orm";

/**
 * API处理函数
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // 1. 验证HTTP方法
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // 2. 检查用户登录状态（可选，用于显示点赞状态）
    const session = await getServerSession(req, res, authOptions);
    const currentUserId = session?.user?.id;

    // 3. 解析查询参数
    const {
      page = "1",
      limit = "20",
      featured = "false",
      model = "all",
      aspect_ratio = "all",
      sort_by = "latest",
      search = "",
    } = req.query;

    const pageNum = parseInt(page as string); // 当前页码（从1开始）
    const limitNum = parseInt(limit as string); // 每页显示数量
    const offset = (pageNum - 1) * limitNum; // 数据库查询偏移量
    const showFeatured = featured === "true"; // 是否只显示精选项目
    const selectedModel = model as string;
    const selectedAspectRatio = aspect_ratio as string;
    const sortBy = sort_by as string;
    const searchTerm = search as string;

    // 4. 构建WHERE条件
    let whereClause = and(
      eq(ProjectsSchema.is_public, true), // 只查询公开项目
      eq(ProjectsSchema.status, "shared"), // 状态为已分享
    );

    // TODO: 精选过滤（需要在项目表中添加is_featured字段）
    if (showFeatured) {
      console.log(
        "TODO: Add is_featured field to projects table for featured filtering",
      );
      // whereClause = and(whereClause, eq(ProjectsSchema.is_featured, true))!;
    }

    // TODO: 模型和宽高比过滤（需要从步骤表中获取信息）
    if (selectedModel !== "all") {
      console.log(`TODO: Filter by model: ${selectedModel}`);
      // 需要join steps表来过滤模型
    }

    if (selectedAspectRatio !== "all") {
      console.log(`TODO: Filter by aspect ratio: ${selectedAspectRatio}`);
      // 需要从步骤参数中过滤宽高比
    }

    // 搜索过滤
    if (searchTerm) {
      whereClause = and(
        whereClause,
        or(
          ilike(ProjectsSchema.title, `%${searchTerm}%`),
          ilike(ProjectsSchema.description, `%${searchTerm}%`),
          ilike(UserSchema.username, `%${searchTerm}%`),
        ),
      )!;
    }

    // 5. 构建排序
    let orderBy;
    switch (sortBy) {
      case "popular":
        orderBy = [
          desc(ProjectsSchema.like_count),
          desc(ProjectsSchema.updated_at),
        ];
        break;
      case "featured":
        // TODO: 实现精选排序
        console.log("TODO: Implement featured sorting");
        orderBy = [desc(ProjectsSchema.updated_at)];
        break;
      case "latest":
      default:
        orderBy = [desc(ProjectsSchema.updated_at)];
        break;
    }

    // 6. 查询公开项目（直接使用cover字段中的图片URL）
    const sharedProjects = await drizzleDb
      .select({
        // 项目相关信息
        id: ProjectsSchema.id,
        title: ProjectsSchema.title,
        description: ProjectsSchema.description,
        cover: ProjectsSchema.cover,
        featured: ProjectsSchema.featured,
        view_count: ProjectsSchema.view_count,
        like_count: ProjectsSchema.like_count,
        status: ProjectsSchema.status,
        created_at: ProjectsSchema.created_at,
        updated_at: ProjectsSchema.updated_at,

        // 用户相关信息
        username: UserSchema.username,
        user_avatar: UserSchema.image_url,
      })
      .from(ProjectsSchema)
      .innerJoin(UserSchema, eq(ProjectsSchema.user_id, UserSchema.id))
      .where(whereClause!)
      .orderBy(...orderBy)
      .limit(limitNum + 1)
      .offset(offset);

    // 7. 处理分页信息和数据转换
    const hasMore = sharedProjects.length > limitNum;
    const data = hasMore ? sharedProjects.slice(0, limitNum) : sharedProjects;

    // 转换数据格式，添加额外字段
    const formattedData = data.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      cover: item.cover,
      featured: item.featured,
      view_count: item.view_count,
      like_count: item.like_count,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at,
      username: item.username,
      user_avatar: item.user_avatar,
      is_liked: false, // TODO: 实现用户点赞状态查询
    }));

    // 9. 返回查询结果
    res.status(200).json({
      success: true,
      data: formattedData,
      pagination: {
        page: pageNum, // 当前页码
        limit: limitNum, // 每页数量
        hasMore: hasMore, // 是否还有更多数据
      },
    });

    console.log(
      `Public projects list requested: page ${pageNum}, limit ${limitNum}, found ${data.length} projects`,
    );
  } catch (error) {
    // 10. 错误处理
    console.error("Get shared projects error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get shared projects",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
