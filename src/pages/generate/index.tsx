import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Stack } from "@/components/ui/Stack";
import { motion } from "framer-motion";
import {
  IconWand,
  IconDownload,
  IconChevronDown,
  IconSparkles,
  IconPhoto,
  IconBulb,
  IconAlertCircle,
  IconShare,
  IconCheck,
  IconUpload,
} from "@tabler/icons-react";
import { useToast } from "@/components/ui/use-toast";
import {
  JAAZ_IMAGE_MODELS,
  JAAZ_IMAGE_MODELS_INFO,
  IMAGE_RATIO_OPTIONS,
} from "@/constants";

// 模型选项 - 从 constants 中动态生成
const modelOptions = JAAZ_IMAGE_MODELS.map((modelId) => ({
  id: modelId,
  name: JAAZ_IMAGE_MODELS_INFO[modelId].name,
  description: JAAZ_IMAGE_MODELS_INFO[modelId].description,
  price: JAAZ_IMAGE_MODELS_INFO[modelId].price,
}));

// 尺寸选项 - 从 constants 中动态生成
const sizeOptions = Object.entries(IMAGE_RATIO_OPTIONS).map(([id, config]) => ({
  id,
  name: (config as { label: string }).label,
}));

// 生成的图像数据接口
interface GeneratedImage {
  id: string;
  base64: string;
  format: string;
}

interface UploadedImage {
  url: string;
  filename: string;
}

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(modelOptions[0]);
  const [selectedSize, setSelectedSize] = useState(sizeOptions[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);
    setIsShared(false); // Reset share status for new image

    try {
      // Call the generate API
      const response = await fetch("/api/image/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          model: selectedModel.id,
          aspect_ratio: selectedSize.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      if (data.success && data.data) {
        setGeneratedImage({
          id: data.data.id,
          base64: data.data.image_data,
          format: data.data.format,
        });
      } else {
        throw new Error("No image data received");
      }
    } catch (err) {
      console.error("Generation error:", err);
      setError(err instanceof Error ? err.message : "生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;

    // Create download link
    const link = document.createElement("a");
    link.href = `data:image/${generatedImage.format};base64,${generatedImage.base64}`;
    link.download = `generated-image-${generatedImage.id}.${generatedImage.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!generatedImage || isShared) return;

    setIsSharing(true);
    setError(null);

    try {
      // Call the share API
      const response = await fetch("/api/image/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageId: generatedImage.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // Image already shared
          setIsShared(true);
          toast({
            title: "提示",
            description: "该图像已经分享过了",
            variant: "warning",
          });
        } else {
          throw new Error(data.error || "分享失败");
        }
      } else if (data.success) {
        setIsShared(true);
        toast({
          title: "分享成功",
          description: "您的作品已成功分享到广场！",
          variant: "success",
        });
      } else {
        throw new Error("分享失败");
      }
    } catch (err) {
      console.error("Share error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "分享失败，请重试";
      setError(errorMessage);
      toast({
        title: "分享失败",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const newImagePromises = Array.from(files).map((file) => {
        return new Promise<UploadedImage>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({ url: reader.result as string, filename: file.name });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const newImages = await Promise.all(newImagePromises);
      setUploadedImages((prev) => [...prev, ...newImages]);
      toast({
        title: "加载成功",
        description: `${newImages.length}张图片已加载。`,
        variant: "success",
      });
    } catch (err) {
      console.error("File loading error:", err);
      const errorMessage = "读取文件失败，请重试";
      setError(errorMessage);
      toast({
        title: "加载失败",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input so user can select the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="w-full mx-auto p-4 md:p-6 lg:p-8 min-h-[calc(100vh-120px)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 h-full">
        {/* 左侧输入区域 - 1/3 */}
        <div className="lg:col-span-1 space-y-6 flex flex-col">
          {/* 标题区域 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center lg:text-left"
          >
            <h1 className="text-2xl font-bold flex items-center gap-2 justify-center lg:justify-start">
              <IconWand className="text-primary" size={24} />
              AI 图像生成
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              将您的想象力转化为视觉艺术
            </p>
          </motion.div>

          {/* 输入区域 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 flex flex-col space-y-4"
          >
            {/* 输入框和按钮组合 */}
            <div className="flex flex-col border border-border rounded-lg overflow-hidden flex-1">
              <div className="relative flex-1">
                <Textarea
                  placeholder="详细描述您想要生成的图像..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="flex-1 text-2xl resize-none border-0 rounded-none focus-visible:ring-0 p-4 pr-16 h-full"
                />
                <div className="absolute top-4 right-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleUploadClick}
                    disabled={isUploading}
                    isLoading={isUploading}
                  >
                    <IconUpload size={24} />
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                size="lg"
                className="h-12 text-base font-semibold rounded-none border-t"
                isLoading={isGenerating}
              >
                {isGenerating ? (
                  "正在生成..."
                ) : (
                  <>
                    <IconSparkles size={18} className="mr-2" />
                    开始制作
                  </>
                )}
              </Button>
            </div>

            {/* Uploaded Images Thumbnails */}
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {uploadedImages.map((image, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-md overflow-hidden border"
                  >
                    <img
                      src={image.url}
                      alt={image.filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 基础设置 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between h-12"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-base font-medium text-muted-foreground">
                          模型:
                        </span>
                        <div className="w-px h-6 bg-border"></div>
                        <span className="text-base font-medium truncate">
                          {selectedModel.name}
                        </span>
                      </div>
                      <IconChevronDown size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {modelOptions.map((model) => (
                      <DropdownMenuItem
                        key={model.id}
                        onClick={() => setSelectedModel(model)}
                      >
                        <Stack>
                          <span className="text-sm">{model.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {model.description}
                          </span>
                        </Stack>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between h-12"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-base font-medium text-muted-foreground">
                          尺寸:
                        </span>
                        <div className="w-px h-6 bg-border"></div>
                        <span className="text-base font-medium truncate">
                          {selectedSize.name}
                        </span>
                      </div>
                      <IconChevronDown size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {sizeOptions.map((size) => (
                      <DropdownMenuItem
                        key={size.id}
                        onClick={() => setSelectedSize(size)}
                      >
                        <span className="text-sm">{size.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* 错误信息 */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <IconAlertCircle size={16} className="text-destructive" />
                <span className="text-sm text-destructive">{error}</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* 右侧结果展示区域 - 2/3 */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="h-full"
          >
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <IconPhoto size={20} />
                  生成结果
                  {generatedImage && (
                    <Badge variant="secondary" className="ml-2">
                      1
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center flex-1 space-y-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <IconWand size={48} className="text-primary" />
                    </motion.div>
                    <h3 className="text-lg font-medium">AI 正在创作中...</h3>
                    <p className="text-muted-foreground text-center">
                      请稍候，我们正在将您的想象转化为现实
                    </p>
                  </div>
                ) : generatedImage ? (
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="flex-1 flex items-center justify-center">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group relative rounded-lg overflow-hidden border max-w-full max-h-full"
                      >
                        <img
                          src={`data:image/${generatedImage.format};base64,${generatedImage.base64}`}
                          alt="Generated image"
                          className="max-w-full max-h-[500px] object-contain"
                        />
                      </motion.div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={handleDownload} className="w-full">
                        <IconDownload size={16} className="mr-2" />
                        下载图像
                      </Button>
                      <Button
                        onClick={handleShare}
                        disabled={isSharing || isShared}
                        className="w-full"
                        isLoading={isSharing}
                      >
                        {isShared ? (
                          <>
                            <IconCheck size={16} className="mr-2" />
                            已分享
                          </>
                        ) : isSharing ? (
                          "分享中..."
                        ) : (
                          <>
                            <IconShare size={16} className="mr-2" />
                            分享到广场
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 space-y-4 text-center">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                      <IconPhoto size={28} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">
                      准备好开始创作了吗？
                    </h3>
                    <p className="text-muted-foreground max-w-sm">
                      在左侧输入您的创意描述，让 AI 为您生成独特的艺术作品
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
