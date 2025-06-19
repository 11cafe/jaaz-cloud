// Gallery related types and interfaces

export type AspectRatio = "1:1" | "4:3" | "3:4" | "16:9" | "9:16";
export type Model = "flux-kontext" | "gpt-4o";
export type ImageStatus = "active" | "hidden" | "deleted";
export type GenerationStatus = "pending" | "completed" | "failed";
export type SortBy = "latest" | "popular" | "featured";

// Database record interfaces
export interface ImageGeneration {
  id: string;
  user_id: number;
  prompt: string;
  aspect_ratio: AspectRatio;
  model: Model;
  image_url: string;
  thumbnail_url?: string;
  generation_params?: string; // JSON string
  status: GenerationStatus;
  cost?: string; // Decimal as string
  created_at: string;
}

export interface SharedImage {
  id: string;
  user_id: number;
  user_name?: string; // Joined from user table
  user_avatar?: string; // Joined from user table
  prompt: string;
  aspect_ratio: AspectRatio;
  model: Model;
  image_url: string;
  thumbnail_url?: string;
  original_generation_id?: string;
  shared_at: string;
  view_count: number;
  like_count: number;
  is_liked?: boolean; // Whether current user liked this image
  is_featured: boolean;
  status: ImageStatus;
  created_at: string;
  updated_at: string;
}

export interface ImageLike {
  id: string;
  user_id: number;
  image_id: string;
  created_at: string;
}

// API request/response interfaces
export interface GalleryRequest {
  page: number;
  limit: number;
  model?: Model | "all";
  aspect_ratio?: AspectRatio;
  sort_by?: SortBy;
  search_keyword?: string;
  user_id?: number; // Filter by specific user
}

export interface GalleryResponse {
  data: SharedImage[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ShareRequest {
  generation_id: string;
  prompt: string;
  aspect_ratio: AspectRatio;
  model: Model;
  image_url: string;
  thumbnail_url?: string;
}

export interface ShareResponse {
  success: boolean;
  shared_image_id: string;
  share_url: string;
  message?: string;
}

export interface LikeRequest {
  image_id: string;
  action: "like" | "unlike";
}

export interface LikeResponse {
  success: boolean;
  is_liked: boolean;
  like_count: number;
  message?: string;
}

export interface ViewImageRequest {
  image_id: string;
}

export interface ViewImageResponse {
  success: boolean;
  view_count: number;
}

// Utility types for form handling
export interface ImageGenerationFormData {
  prompt: string;
  aspect_ratio: AspectRatio;
  model: Model;
}

export interface GalleryFilters {
  model: Model | "all";
  aspect_ratio: AspectRatio | "all";
  sort_by: SortBy;
  search_keyword: string;
}

// Error types
export interface GalleryError {
  code: string;
  message: string;
  details?: any;
}
