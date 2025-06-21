import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  IconSearch,
  IconHeart,
  IconEye,
  IconFilter,
  IconSortDescending,
  IconPhoto,
  IconSparkles
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ImageModal } from "@/components/gallery/ImageModal";
import { type SharedImage, type Model, type AspectRatio, type SortBy } from "@/types/image";
import { JAAZ_IMAGE_MODELS, JAAZ_IMAGE_MODELS_INFO, IMAGE_RATIO_OPTIONS } from "@/constants";
import router from "next/router";

// Filter and sort options
const modelOptions = [
  { value: "all", label: "所有模型" },
  ...JAAZ_IMAGE_MODELS.map(model => ({
    value: model,
    label: JAAZ_IMAGE_MODELS_INFO[model]?.name || model
  }))
];

const aspectRatioOptions = [
  { value: "all", label: "所有尺寸" },
  ...Object.entries(IMAGE_RATIO_OPTIONS).map(([value, config]) => ({
    value,
    label: (config as { label: string }).label
  }))
];

const sortOptions = [
  { value: "latest", label: "最新发布" },
  { value: "popular", label: "最受欢迎" },
  { value: "featured", label: "精选作品" }
];

// API response types
interface ApiSharedProject {
  id: string;
  title: string;
  description: string;
  cover: string; // 直接包含图片URL
  featured: string[]; // 精选图片URL数组
  view_count: number;
  like_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  username: string;
  user_avatar?: string; // User's profile image URL
  is_liked: boolean; // Whether current user liked this image
}

interface ApiResponse {
  success: boolean;
  data: ApiSharedProject[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// Convert API data to SharedImage format
const convertApiDataToSharedImage = (apiData: ApiSharedProject): SharedImage => {
  const imageUrl = apiData.cover;

  // Use user's actual avatar or generate a placeholder
  const userAvatar = apiData.user_avatar ||
    `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000000)}?w=32&h=32&fit=crop&crop=face&auto=format`;

  // 从项目标题或描述中提取提示词，如果没有则使用默认值
  const prompt = apiData.description || apiData.title || "AI Generated Image";

  return {
    id: apiData.id,
    user_id: Math.floor(Math.random() * 1000), // This should come from API when available
    user_name: apiData.username,
    user_avatar: userAvatar,
    prompt: prompt,
    aspect_ratio: "1:1" as AspectRatio, // TODO: 从项目步骤中获取实际宽高比
    model: "openai/gpt-image-1" as Model, // TODO: 从项目步骤中获取实际模型
    image_url: imageUrl,
    shared_at: apiData.updated_at,
    view_count: apiData.view_count,
    like_count: apiData.like_count,
    is_liked: apiData.is_liked,
    is_featured: apiData.featured && apiData.featured.length > 0, // 如果有精选图片则认为是精选项目
    status: "active",
    created_at: apiData.created_at,
    updated_at: apiData.updated_at
  };
};

interface ImageCardProps {
  image: SharedImage;
  onLike: (imageId: string) => void;
  onClick: (image: SharedImage) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({ image, onLike, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isLiked, setIsLiked] = useState(image.is_liked);
  const [likeCount, setLikeCount] = useState(image.like_count);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    onLike(image.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="break-inside-avoid mb-4"
    >
      <Card
        className="group hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
        onClick={() => onClick(image)}
      >
        <CardContent className="p-0">
          {/* Image */}
          <div className="relative">
            {/* Placeholder */}
            {!imageLoaded && (
              <div
                className="bg-gradient-to-br from-muted to-muted/50 rounded-t-lg flex items-center justify-center min-h-[200px]"
                style={{ aspectRatio: image.aspect_ratio, minHeight: '200px' }}
              >
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <div className="relative">
                    <IconPhoto size={64} className="animate-pulse" />
                  </div>
                  <div className="text-base font-medium">加载中...</div>
                </div>
              </div>
            )}

            {/* Actual Image */}
            <img
              src={image.image_url}
              alt={image.prompt}
              className={`w-full rounded-t-lg transition-all duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
                } group-hover:scale-105`}
              style={{ aspectRatio: image.aspect_ratio, objectFit: 'cover' }}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                // Handle image load error by showing a fallback
                setImageLoaded(true);
              }}
            />

            {/* Featured badge */}
            {image.is_featured && imageLoaded && (
              <div className="absolute top-3 left-3">
                <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                  <IconSparkles size={12} className="mr-1" />
                  精选
                </Badge>
              </div>
            )}

            {/* Model badge */}
            {imageLoaded && (
              <div className="absolute top-3 right-3">
                <Badge variant={'default'}>
                  {JAAZ_IMAGE_MODELS_INFO[image.model]?.name || image.model}
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {/* User info */}
            <div className="flex items-center gap-3 mb-3">
              <img
                src={image.user_avatar}
                alt={image.user_name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{image.user_name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(image.shared_at).toLocaleDateString('zh-CN')}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <IconHeart size={12} className={isLiked ? "fill-red-500 text-red-500" : ""} />
                  {likeCount}
                </span>
                <span className="flex items-center gap-1">
                  <IconEye size={12} />
                  {image.view_count.toLocaleString()}
                </span>
              </div>
              <span className="text-xs bg-muted px-2 py-1 rounded">
                {image.aspect_ratio}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function GalleryPage() {
  const [images, setImages] = useState<SharedImage[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModel, setSelectedModel] = useState<Model | "all">("all");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio | "all">("all");
  const [sortBy, setSortBy] = useState<SortBy>("latest");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<SharedImage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch images from API
  const fetchImages = useCallback(async (page: number = 1, reset: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sort_by: sortBy,
      });

      // Add search parameter
      if (searchTerm) {
        params.append("search", searchTerm);
      }

      // Add model filter
      if (selectedModel !== "all") {
        params.append("model", selectedModel);
      }

      // Add aspect ratio filter
      if (selectedAspectRatio !== "all") {
        params.append("aspect_ratio", selectedAspectRatio);
      }

      // Add featured filter
      if (sortBy === "featured") {
        params.append("featured", "true");
      }

      const response = await fetch(`/api/image/shared/list?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error("Failed to fetch images");
      }

      // Convert API data to SharedImage format
      const convertedImages = result.data.map(convertApiDataToSharedImage);

      if (reset || page === 1) {
        setImages(convertedImages);
      } else {
        setImages(prev => [...prev, ...convertedImages]);
      }

      setHasMore(result.pagination.hasMore);
      setCurrentPage(page);
    } catch (err) {
      console.error("Error fetching images:", err);
      setError(err instanceof Error ? err.message : "获取图片失败");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [sortBy, searchTerm, selectedModel, selectedAspectRatio]);

  // Initial load
  useEffect(() => {
    fetchImages(1, true);
  }, [fetchImages]);

  // Filter and sort images (client-side for search and filters)
  const filteredImages = useMemo(() => {
    // Since filtering is now done server-side, we just return the images as-is
    // Client-side sorting is only needed for consistency within the current page
    let filtered = [...images];

    // Apply sorting (client-side sorting for consistency within current page results)
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return b.like_count - a.like_count;
        case "featured":
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return new Date(b.shared_at).getTime() - new Date(a.shared_at).getTime();
        case "latest":
        default:
          return new Date(b.shared_at).getTime() - new Date(a.shared_at).getTime();
      }
    });

    return filtered;
  }, [images, sortBy]);

  // Handle filter changes - refetch data when any filter changes
  useEffect(() => {
    if (!initialLoading) {
      // Debounce search input to avoid too many API calls
      const timeoutId = setTimeout(() => {
        fetchImages(1, true);
      }, searchTerm ? 500 : 0); // 500ms debounce for search, immediate for other filters

      return () => clearTimeout(timeoutId);
    }
  }, [sortBy, searchTerm, selectedModel, selectedAspectRatio, fetchImages, initialLoading]);

  const handleLike = async (imageId: string) => {
    try {
      const response = await fetch(`/api/image/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Update the local state to reflect the like change
        setImages(prevImages =>
          prevImages.map(img =>
            img.id === imageId
              ? {
                ...img,
                is_liked: result.is_liked,
                like_count: result.like_count
              }
              : img
          )
        );
      } else {
        console.error("Like operation failed:", result.error);
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  const handleImageClick = (image: SharedImage) => {
    // setSelectedImage(image);
    // setIsModalOpen(true);

    router.push(`/gallery/${image.id}`);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchImages(currentPage + 1, false);
    }
  };

  return (
    <div className="w-full mx-auto p-4 md:p-6 lg:p-8 min-h-[calc(100vh-120px)]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold flex items-center gap-3 justify-center mb-2">
          <IconPhoto className="text-primary" size={32} />
          AI 作品广场
        </h1>
        <p className="text-muted-foreground">
          发现来自全球创作者的精彩 AI 艺术作品
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <div className="flex justify-end gap-4">
          {/* Model Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <IconFilter size={16} />
                {modelOptions.find(opt => opt.value === selectedModel)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {modelOptions.map(option => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSelectedModel(option.value as Model | "all")}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Aspect Ratio Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <IconPhoto size={16} />
                {aspectRatioOptions.find(opt => opt.value === selectedAspectRatio)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {aspectRatioOptions.map(option => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSelectedAspectRatio(option.value as AspectRatio | "all")}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <IconSortDescending size={16} />
                {sortOptions.find(opt => opt.value === sortBy)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {sortOptions.map(option => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSortBy(option.value as SortBy)}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
            <p className="text-destructive">{error}</p>
          </div>
          <Button
            onClick={() => fetchImages(1, true)}
            disabled={loading}
          >
            重试
          </Button>
        </motion.div>
      )}

      {/* Loading state */}
      {initialLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </motion.div>
      )}

      {/* Masonry Grid */}
      {!initialLoading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4"
        >
          {filteredImages.map((image, index) => (
            <motion.div
              key={image.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ImageCard image={image} onLike={handleLike} onClick={handleImageClick} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Empty state */}
      {!initialLoading && !error && filteredImages.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <IconPhoto size={64} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">没有找到匹配的作品</h3>
          <p className="text-muted-foreground">
            尝试调整搜索条件或筛选器
          </p>
        </motion.div>
      )}

      {/* Load more */}
      {!initialLoading && !error && filteredImages.length > 0 && hasMore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-8"
        >
          <Button
            variant="outline"
            disabled={loading}
            onClick={handleLoadMore}
          >
            {loading ? "加载中..." : "加载更多"}
          </Button>
        </motion.div>
      )}

      {/* Image Modal */}
      <ImageModal
        image={selectedImage}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onLike={handleLike}
      />
    </div>
  );
}
