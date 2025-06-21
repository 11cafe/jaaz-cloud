import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  currentTitle: string;
  generatedImages: Array<{
    id: string;
    url: string;
    format: string;
  }>;
  onShareSuccess?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  projectId,
  currentTitle,
  generatedImages,
  onShareSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCover, setSelectedCover] = useState<string>('');
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle || '');
      setDescription('');
      // Default to the last generated image as cover
      if (generatedImages.length > 0) {
        setSelectedCover(generatedImages[generatedImages.length - 1].url);
      }
    }
  }, [isOpen, currentTitle, generatedImages]);

  const handleShare = async () => {
    if (!projectId) {
      toast({
        title: "错误",
        description: "项目ID不能为空",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "错误",
        description: "请输入项目标题",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCover) {
      toast({
        title: "错误",
        description: "请选择封面图片",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);

    try {
      const response = await fetch('/api/project/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          title: title.trim(),
          description: description.trim() || null,
          cover: selectedCover,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '分享失败');
      }

      if (data.success) {
        toast({
          title: "分享成功",
          description: "您的作品已成功分享到广场！",
          variant: "success",
        });
        onShareSuccess?.();
        onClose();
      } else {
        throw new Error('分享失败');
      }
    } catch (error) {
      console.error('Share error:', error);
      const errorMessage = error instanceof Error ? error.message : '分享失败，请重试';
      toast({
        title: "分享失败",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>分享到广场</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              项目标题 <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入项目标题"
              maxLength={100}
            />
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              项目描述
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述你的创作过程或想法（可选）"
              maxLength={500}
              className="min-h-[80px]"
            />
          </div>

          {/* Cover Selection */}
          {generatedImages.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                选择封面图片 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {generatedImages.map((image, index) => (
                  <div
                    key={image.id}
                    className={`relative cursor-pointer rounded-lg border-2 overflow-hidden ${selectedCover === image.url
                      ? 'border-blue-500'
                      : 'border-gray-300 hover:border-gray-400'
                      }`}
                    onClick={() => setSelectedCover(image.url)}
                  >
                    <img
                      src={image.url}
                      alt={`Generated image ${index + 1}`}
                      className="w-full h-20 object-cover"
                    />
                    {selectedCover === image.url && (
                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSharing}>
            取消
          </Button>
          <Button onClick={handleShare} disabled={isSharing} isLoading={isSharing}>
            {isSharing ? '分享中...' : '分享到广场'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
