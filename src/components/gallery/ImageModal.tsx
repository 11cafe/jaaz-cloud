import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconX, IconHeart, IconEye, IconSparkles, IconCalendar } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type SharedImage } from "@/types/image";

interface ImageModalProps {
  image: SharedImage | null;
  isOpen: boolean;
  onClose: () => void;
  onLike?: (imageId: string) => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  image,
  isOpen,
  onClose,
  onLike
}) => {
  const [isLiked, setIsLiked] = React.useState(false);
  const [likeCount, setLikeCount] = React.useState(0);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  React.useEffect(() => {
    if (image) {
      setIsLiked(image.is_liked);
      setLikeCount(image.like_count);
      setImageLoaded(false);
    }
  }, [image]);

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleLike = () => {
    if (image) {
      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
      onLike?.(image.id);
    }
  };

  const getModelBadgeColor = (model: string) => {
    return model === "flux-kontext" ? "default" : "secondary";
  };

  if (!image) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full h-full max-w-7xl mx-auto p-4 flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={onClose}
            >
              <IconX size={24} />
            </Button>

            {/* Main Content */}
            <div className="w-full h-full flex gap-6">
              {/* Image Section */}
              <div className="flex-1 flex items-center justify-center">
                <div className="relative max-w-full max-h-full">
                  {/* Loading Placeholder */}
                  {!imageLoaded && (
                    <div
                      className="bg-muted animate-pulse rounded-lg"
                      style={{
                        width: "600px",
                        height: "400px",
                        aspectRatio: image.aspect_ratio
                      }}
                    />
                  )}

                  {/* Main Image */}
                  <img
                    src={image.image_url}
                    alt={image.prompt}
                    className={`max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                      }`}
                    onLoad={() => setImageLoaded(true)}
                  />

                  {/* Featured Badge on Image */}
                  {image.is_featured && (
                    <div className="absolute top-4 left-4">
                      <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                        <IconSparkles size={14} className="mr-1" />
                        精选
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Panel */}
              <div className="w-80 bg-background rounded-lg p-6 overflow-y-auto">
                {/* User Info */}
                <div className="flex items-center gap-3 mb-6">
                  <img
                    src={image.user_avatar}
                    alt={image.user_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{image.user_name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <IconCalendar size={14} />
                      {new Date(image.shared_at).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>

                {/* Model Badge */}
                <div className="mb-4">
                  <Badge variant={getModelBadgeColor(image.model)} className="text-sm">
                    {image.model === "flux-kontext" ? "Flux Kontext" : "GPT-4O"}
                  </Badge>
                </div>

                {/* Prompt */}
                <div className="mb-6">
                  <h4 className="font-medium mb-2 text-sm uppercase tracking-wide text-muted-foreground">
                    Prompt
                  </h4>
                  <p className="text-sm leading-relaxed bg-muted/50 rounded-lg p-3">
                    {image.prompt}
                  </p>
                </div>

                {/* Image Details */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                    图片详情
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">尺寸比例:</span>
                      <span className="font-medium">{image.aspect_ratio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">创建时间:</span>
                      <span className="font-medium">
                        {new Date(image.created_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats and Actions */}
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <IconHeart size={16} className={isLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"} />
                        {likeCount}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <IconEye size={16} />
                        {image.view_count.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={handleLike}
                    variant={isLiked ? "default" : "outline"}
                    className="w-full gap-2"
                  >
                    <IconHeart
                      size={16}
                      className={isLiked ? "fill-current" : ""}
                    />
                    {isLiked ? "已喜欢" : "喜欢"}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
