import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Stack } from "@/components/ui/Stack";
import { Flex } from "@/components/ui/Flex";
import { motion } from "framer-motion";
import {
  IconWand,
  IconDownload,
  IconRefresh,
  IconChevronDown,
  IconSparkles,
  IconPhoto,
  IconBulb
} from "@tabler/icons-react";

// 模型选项
const modelOptions = [
  { id: "dall-e-3", name: "DALL-E 3", description: "最新AI模型" },
  { id: "dall-e-2", name: "DALL-E 2", description: "经典模型" },
  { id: "midjourney", name: "Midjourney", description: "艺术风格" },
  { id: "stable-diffusion", name: "Stable Diffusion", description: "开源模型" },
];

// 尺寸选项
const sizeOptions = [
  { id: "square", name: "正方形", size: "1024x1024" },
  { id: "portrait", name: "竖屏", size: "768x1024" },
  { id: "landscape", name: "横屏", size: "1024x768" },
];

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(modelOptions[0]);
  const [selectedSize, setSelectedSize] = useState(sizeOptions[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    // TODO: 实现实际的图像生成逻辑
    setTimeout(() => {
      setIsGenerating(false);
      // 模拟生成的图像
      setGeneratedImages([
        "https://picsum.photos/512/512?random=1",
        "https://picsum.photos/512/512?random=2",
        "https://picsum.photos/512/512?random=3",
        "https://picsum.photos/512/512?random=4",
      ]);
    }, 3000);
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
            className="flex-1 flex flex-col"
          >
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <IconBulb size={18} />
                  创作描述
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <Textarea
                  placeholder="详细描述您想要生成的图像..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[160px] flex-1 text-base resize-none"
                />

                {/* 基础设置 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">模型</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between text-sm">
                          {selectedModel.name}
                          <IconChevronDown size={14} />
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

                  <div className="space-y-2">
                    <label className="text-sm font-medium">尺寸</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between text-sm">
                          {selectedSize.name}
                          <IconChevronDown size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {sizeOptions.map((size) => (
                          <DropdownMenuItem
                            key={size.id}
                            onClick={() => setSelectedSize(size)}
                          >
                            <Stack>
                              <span className="text-sm">{size.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {size.size}
                              </span>
                            </Stack>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* 生成按钮 */}
                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  size="lg"
                  className="w-full h-11 text-base font-semibold mt-auto"
                  isLoading={isGenerating}
                >
                  {isGenerating ? (
                    "正在生成..."
                  ) : (
                    <>
                      <IconSparkles size={18} className="mr-2" />
                      开始创作
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
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
                  {generatedImages.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {generatedImages.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center flex-1 space-y-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <IconWand size={48} className="text-primary" />
                    </motion.div>
                    <h3 className="text-lg font-medium">AI 正在创作中...</h3>
                    <p className="text-muted-foreground text-center">
                      请稍候，我们正在将您的想象转化为现实
                    </p>
                  </div>
                ) : generatedImages.length > 0 ? (
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="grid grid-cols-2 gap-4 flex-1">
                      {generatedImages.map((image, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="group relative rounded-lg overflow-hidden border"
                        >
                          <img
                            src={image}
                            alt={`Generated image ${index + 1}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="flex gap-2">
                              <Button size="sm" variant="secondary">
                                <IconDownload size={16} />
                              </Button>
                              <Button size="sm" variant="secondary">
                                <IconRefresh size={16} />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full">
                      <IconDownload size={16} className="mr-2" />
                      下载全部
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 space-y-4 text-center">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                      <IconPhoto size={28} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium">准备好开始创作了吗？</h3>
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
