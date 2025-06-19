import { eq, desc, asc, and, or, like, sql, count } from "drizzle-orm";
import {
  SharedImagesSchema,
  ImageLikesSchema,
  ImageGenerationsSchema,
} from "../schema/image";
import { UserSchema } from "../schema/index";
import type {
  SharedImage,
  GalleryRequest,
  GalleryResponse,
  ShareRequest,
  LikeRequest,
  ImageGeneration,
} from "../types/image";

// Database connection type (you'll need to import your actual db instance)
type DB = any; // Replace with your actual database type

export class GalleryDB {
  constructor(private db: DB) {}

  // Create a new image generation record
  async createImageGeneration(
    data: Omit<ImageGeneration, "created_at">,
  ): Promise<ImageGeneration> {
    const [result] = await this.db
      .insert(ImageGenerationsSchema)
      .values(data)
      .returning();
    return result;
  }

  // Share an image to gallery
  async shareImage(data: ShareRequest & { user_id: number }): Promise<string> {
    const shareId = crypto.randomUUID();

    await this.db.insert(SharedImagesSchema).values({
      id: shareId,
      user_id: data.user_id,
      prompt: data.prompt,
      aspect_ratio: data.aspect_ratio,
      model: data.model,
      image_url: data.image_url,
      thumbnail_url: data.thumbnail_url,
      original_generation_id: data.generation_id,
    });

    return shareId;
  }

  // Get gallery images with pagination and filters
  async getGalleryImages(
    params: GalleryRequest,
    currentUserId?: number,
  ): Promise<GalleryResponse> {
    const {
      page,
      limit,
      model,
      aspect_ratio,
      sort_by = "latest",
      search_keyword,
      user_id,
    } = params;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(SharedImagesSchema.status, "active")];

    if (model && model !== "all") {
      conditions.push(eq(SharedImagesSchema.model, model));
    }

    if (aspect_ratio) {
      conditions.push(eq(SharedImagesSchema.aspect_ratio, aspect_ratio));
    }

    if (user_id) {
      conditions.push(eq(SharedImagesSchema.user_id, user_id));
    }

    if (search_keyword) {
      conditions.push(like(SharedImagesSchema.prompt, `%${search_keyword}%`));
    }

    // Build order by clause
    let orderBy;
    switch (sort_by) {
      case "popular":
        orderBy = [
          desc(SharedImagesSchema.like_count),
          desc(SharedImagesSchema.shared_at),
        ];
        break;
      case "featured":
        orderBy = [
          desc(SharedImagesSchema.is_featured),
          desc(SharedImagesSchema.shared_at),
        ];
        break;
      default: // 'latest'
        orderBy = [desc(SharedImagesSchema.shared_at)];
    }

    // Get total count
    const [{ count: total }] = await this.db
      .select({ count: count() })
      .from(SharedImagesSchema)
      .where(and(...conditions));

    // Get images with user info and like status
    const query = this.db
      .select({
        id: SharedImagesSchema.id,
        user_id: SharedImagesSchema.user_id,
        user_name: UserSchema.username,
        user_avatar: UserSchema.image_url,
        prompt: SharedImagesSchema.prompt,
        aspect_ratio: SharedImagesSchema.aspect_ratio,
        model: SharedImagesSchema.model,
        image_url: SharedImagesSchema.image_url,
        thumbnail_url: SharedImagesSchema.thumbnail_url,
        original_generation_id: SharedImagesSchema.original_generation_id,
        shared_at: SharedImagesSchema.shared_at,
        view_count: SharedImagesSchema.view_count,
        like_count: SharedImagesSchema.like_count,
        is_featured: SharedImagesSchema.is_featured,
        status: SharedImagesSchema.status,
        created_at: SharedImagesSchema.created_at,
        updated_at: SharedImagesSchema.updated_at,
        is_liked: currentUserId
          ? sql<boolean>`EXISTS(SELECT 1 FROM ${ImageLikesSchema} WHERE ${ImageLikesSchema.user_id} = ${currentUserId} AND ${ImageLikesSchema.image_id} = ${SharedImagesSchema.id})`
          : sql<boolean>`false`,
      })
      .from(SharedImagesSchema)
      .leftJoin(UserSchema, eq(SharedImagesSchema.user_id, UserSchema.id))
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    const data = await query;

    return {
      data: data as SharedImage[],
      total,
      page,
      limit,
      has_next: offset + limit < total,
      has_prev: page > 1,
    };
  }

  // Toggle like status for an image
  async toggleLike(
    params: LikeRequest & { user_id: number },
  ): Promise<{ is_liked: boolean; like_count: number }> {
    const { image_id, action, user_id } = params;

    if (action === "like") {
      // Add like
      const likeId = crypto.randomUUID();
      await this.db.insert(ImageLikesSchema).values({
        id: likeId,
        user_id,
        image_id,
      });

      // Increment like count
      await this.db
        .update(SharedImagesSchema)
        .set({
          like_count: sql`${SharedImagesSchema.like_count} + 1`,
          updated_at: new Date().toISOString(),
        })
        .where(eq(SharedImagesSchema.id, image_id));
    } else {
      // Remove like
      await this.db
        .delete(ImageLikesSchema)
        .where(
          and(
            eq(ImageLikesSchema.user_id, user_id),
            eq(ImageLikesSchema.image_id, image_id),
          ),
        );

      // Decrement like count
      await this.db
        .update(SharedImagesSchema)
        .set({
          like_count: sql`GREATEST(0, ${SharedImagesSchema.like_count} - 1)`,
          updated_at: new Date().toISOString(),
        })
        .where(eq(SharedImagesSchema.id, image_id));
    }

    // Get updated like count
    const [result] = await this.db
      .select({ like_count: SharedImagesSchema.like_count })
      .from(SharedImagesSchema)
      .where(eq(SharedImagesSchema.id, image_id));

    return {
      is_liked: action === "like",
      like_count: result.like_count,
    };
  }

  // Increment view count for an image
  async incrementViewCount(image_id: string): Promise<number> {
    await this.db
      .update(SharedImagesSchema)
      .set({
        view_count: sql`${SharedImagesSchema.view_count} + 1`,
        updated_at: new Date().toISOString(),
      })
      .where(eq(SharedImagesSchema.id, image_id));

    const [result] = await this.db
      .select({ view_count: SharedImagesSchema.view_count })
      .from(SharedImagesSchema)
      .where(eq(SharedImagesSchema.id, image_id));

    return result.view_count;
  }

  // Get a single shared image by ID
  async getSharedImageById(
    image_id: string,
    currentUserId?: number,
  ): Promise<SharedImage | null> {
    const [result] = await this.db
      .select({
        id: SharedImagesSchema.id,
        user_id: SharedImagesSchema.user_id,
        user_name: UserSchema.username,
        user_avatar: UserSchema.image_url,
        prompt: SharedImagesSchema.prompt,
        aspect_ratio: SharedImagesSchema.aspect_ratio,
        model: SharedImagesSchema.model,
        image_url: SharedImagesSchema.image_url,
        thumbnail_url: SharedImagesSchema.thumbnail_url,
        original_generation_id: SharedImagesSchema.original_generation_id,
        shared_at: SharedImagesSchema.shared_at,
        view_count: SharedImagesSchema.view_count,
        like_count: SharedImagesSchema.like_count,
        is_featured: SharedImagesSchema.is_featured,
        status: SharedImagesSchema.status,
        created_at: SharedImagesSchema.created_at,
        updated_at: SharedImagesSchema.updated_at,
        is_liked: currentUserId
          ? sql<boolean>`EXISTS(SELECT 1 FROM ${ImageLikesSchema} WHERE ${ImageLikesSchema.user_id} = ${currentUserId} AND ${ImageLikesSchema.image_id} = ${SharedImagesSchema.id})`
          : sql<boolean>`false`,
      })
      .from(SharedImagesSchema)
      .leftJoin(UserSchema, eq(SharedImagesSchema.user_id, UserSchema.id))
      .where(
        and(
          eq(SharedImagesSchema.id, image_id),
          eq(SharedImagesSchema.status, "active"),
        ),
      );

    return (result as SharedImage) || null;
  }

  // Get user's shared images
  async getUserSharedImages(
    user_id: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<GalleryResponse> {
    return this.getGalleryImages({ page, limit, user_id });
  }

  // Delete/hide a shared image (only by owner)
  async deleteSharedImage(image_id: string, user_id: number): Promise<boolean> {
    const result = await this.db
      .update(SharedImagesSchema)
      .set({
        status: "deleted",
        updated_at: new Date().toISOString(),
      })
      .where(
        and(
          eq(SharedImagesSchema.id, image_id),
          eq(SharedImagesSchema.user_id, user_id),
        ),
      );

    return result.rowCount > 0;
  }

  // Admin: Feature/unfeature an image
  async toggleFeatureStatus(
    image_id: string,
    is_featured: boolean,
  ): Promise<boolean> {
    const result = await this.db
      .update(SharedImagesSchema)
      .set({
        is_featured,
        updated_at: new Date().toISOString(),
      })
      .where(eq(SharedImagesSchema.id, image_id));

    return result.rowCount > 0;
  }
}
