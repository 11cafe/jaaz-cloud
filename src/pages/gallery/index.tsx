import React, { useState, useEffect, useMemo } from "react";
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

// Mock data for gallery images
const mockImages: SharedImage[] = [
  {
    id: "1",
    user_id: 1,
    user_name: "DynamicWang",
    user_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face&auto=format",
    prompt: "Vintage car poster with retro design",
    aspect_ratio: "3:4",
    model: "flux-kontext",
    image_url: "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=400&auto=format",
    shared_at: "2024-01-15T10:30:00Z",
    view_count: 1250,
    like_count: 89,
    is_liked: false,
    is_featured: true,
    status: "active",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z"
  },
  {
    id: "2",
    user_id: 2,
    user_name: "Pinkielicious",
    user_avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b176?w=32&h=32&fit=crop&crop=face&auto=format",
    prompt: "Soft collision thematic poster design",
    aspect_ratio: "1:1",
    model: "gpt-4o",
    image_url: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&auto=format",
    shared_at: "2024-01-14T15:20:00Z",
    view_count: 892,
    like_count: 156,
    is_liked: true,
    is_featured: false,
    status: "active",
    created_at: "2024-01-14T15:20:00Z",
    updated_at: "2024-01-14T15:20:00Z"
  },
  {
    id: "3",
    user_id: 3,
    user_name: "YeahYeah",
    user_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face&auto=format",
    prompt: "Surreal photography poster with artistic elements",
    aspect_ratio: "4:3",
    model: "flux-kontext",
    image_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&auto=format",
    shared_at: "2024-01-13T09:45:00Z",
    view_count: 2103,
    like_count: 234,
    is_liked: false,
    is_featured: true,
    status: "active",
    created_at: "2024-01-13T09:45:00Z",
    updated_at: "2024-01-13T09:45:00Z"
  },
  {
    id: "4",
    user_id: 4,
    user_name: "Zeng",
    user_avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=32&h=32&fit=crop&crop=face&auto=format",
    prompt: "Duckling products branding design",
    aspect_ratio: "1:1",
    model: "gpt-4o",
    image_url: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&auto=format",
    shared_at: "2024-01-12T14:15:00Z",
    view_count: 756,
    like_count: 67,
    is_liked: false,
    is_featured: false,
    status: "active",
    created_at: "2024-01-12T14:15:00Z",
    updated_at: "2024-01-12T14:15:00Z"
  },
  {
    id: "5",
    user_id: 5,
    user_name: "wuyuan song",
    user_avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=32&h=32&fit=crop&crop=face&auto=format",
    prompt: "Vehicle design draft concept art",
    aspect_ratio: "16:9",
    model: "flux-kontext",
    image_url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&auto=format",
    shared_at: "2024-01-11T11:30:00Z",
    view_count: 1456,
    like_count: 198,
    is_liked: true,
    is_featured: false,
    status: "active",
    created_at: "2024-01-11T11:30:00Z",
    updated_at: "2024-01-11T11:30:00Z"
  },
  {
    id: "6",
    user_id: 6,
    user_name: "Jim Chen",
    user_avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=32&h=32&fit=crop&crop=face&auto=format",
    prompt: "Game character design concept",
    aspect_ratio: "3:4",
    model: "gpt-4o",
    image_url: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&auto=format",
    shared_at: "2024-01-10T16:45:00Z",
    view_count: 987,
    like_count: 143,
    is_liked: false,
    is_featured: false,
    status: "active",
    created_at: "2024-01-10T16:45:00Z",
    updated_at: "2024-01-10T16:45:00Z"
  },
  {
    id: "7",
    user_id: 7,
    user_name: "YeahYeah",
    user_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face&auto=format",
    prompt: "Graffiti street posters design",
    aspect_ratio: "1:1",
    model: "flux-kontext",
    image_url: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&auto=format",
    shared_at: "2024-01-09T13:20:00Z",
    view_count: 2234,
    like_count: 312,
    is_liked: true,
    is_featured: true,
    status: "active",
    created_at: "2024-01-09T13:20:00Z",
    updated_at: "2024-01-09T13:20:00Z"
  },
  {
    id: "8",
    user_id: 8,
    user_name: "DynamicWang",
    user_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face&auto=format",
    prompt: "Model shots photography",
    aspect_ratio: "3:4",
    model: "gpt-4o",
    image_url: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&auto=format",
    shared_at: "2024-01-08T10:10:00Z",
    view_count: 1789,
    like_count: 267,
    is_liked: false,
    is_featured: false,
    status: "active",
    created_at: "2024-01-08T10:10:00Z",
    updated_at: "2024-01-08T10:10:00Z"
  }
];

// Filter and sort options
const modelOptions = [
  { value: "all", label: "所有模型" },
  { value: "flux-kontext", label: "Flux Kontext" },
  { value: "gpt-4o", label: "GPT-4O" }
];

const aspectRatioOptions = [
  { value: "all", label: "所有尺寸" },
  { value: "1:1", label: "正方形 (1:1)" },
  { value: "3:4", label: "竖屏 (3:4)" },
  { value: "4:3", label: "横屏 (4:3)" },
  { value: "16:9", label: "宽屏 (16:9)" },
  { value: "9:16", label: "超长竖屏 (9:16)" }
];

const sortOptions = [
  { value: "latest", label: "最新发布" },
  { value: "popular", label: "最受欢迎" },
  { value: "featured", label: "精选作品" }
];

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

  const getModelBadgeColor = (model: Model) => {
    return model === "flux-kontext" ? "default" : "secondary";
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
            <div
              className={`bg-muted rounded-t-lg transition-opacity duration-300 ${imageLoaded ? 'opacity-0' : 'opacity-100'
                }`}
              style={{ aspectRatio: image.aspect_ratio }}
            />
            <img
              src={image.image_url}
              alt={image.prompt}
              className={`w-full rounded-t-lg transition-all duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
                } group-hover:scale-105`}
              style={{ aspectRatio: image.aspect_ratio, objectFit: 'cover' }}
              onLoad={() => setImageLoaded(true)}
            />

            {/* Overlay with actions */}
            {/* <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike();
                  }}
                  className="bg-white/90 hover:bg-white text-black"
                >
                  <IconHeart
                    size={16}
                    className={isLiked ? "fill-red-500 text-red-500" : ""}
                  />
                </Button>
              </div>
            </div> */}

            {/* Featured badge */}
            {image.is_featured && (
              <div className="absolute top-3 left-3">
                <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                  <IconSparkles size={12} className="mr-1" />
                  精选
                </Badge>
              </div>
            )}

            {/* Model badge */}
            <div className="absolute top-3 right-3">
              <Badge variant={getModelBadgeColor(image.model)}>
                {image.model === "flux-kontext" ? "Flux" : "GPT-4O"}
              </Badge>
            </div>
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
  const [images, setImages] = useState<SharedImage[]>(mockImages);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModel, setSelectedModel] = useState<Model | "all">("all");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio | "all">("all");
  const [sortBy, setSortBy] = useState<SortBy>("latest");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SharedImage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter and sort images
  const filteredImages = useMemo(() => {
    let filtered = [...images];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(image =>
        image.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        image.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply model filter
    if (selectedModel !== "all") {
      filtered = filtered.filter(image => image.model === selectedModel);
    }

    // Apply aspect ratio filter
    if (selectedAspectRatio !== "all") {
      filtered = filtered.filter(image => image.aspect_ratio === selectedAspectRatio);
    }

    // Apply sorting
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
  }, [images, searchTerm, selectedModel, selectedAspectRatio, sortBy]);

  const handleLike = (imageId: string) => {
    // Mock API call - in real app this would be an API request
    console.log("Toggling like for image:", imageId);
  };

  const handleImageClick = (image: SharedImage) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
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
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                  <input
                    type="text"
                    placeholder="搜索作品或创作者..."
                    className="w-full pl-10 pr-4 py-2 border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

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
          </CardContent>
        </Card>
      </motion.div>

      {/* Masonry Grid */}
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

      {/* Empty state */}
      {filteredImages.length === 0 && (
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

      {/* Load more placeholder */}
      {filteredImages.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-8"
        >
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              // Mock loading more images
              setTimeout(() => setLoading(false), 1000);
            }}
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
