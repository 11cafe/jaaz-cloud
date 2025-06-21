import React, { useState, useRef, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { StepComponent } from '@/components/workspace/StepComponent';
import { InputComponent } from '@/components/workspace/InputComponent';
import { ProjectSidebar } from '@/components/workspace/ProjectSidebar';
import { ShareModal } from '@/components/workspace/ShareModal';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProjectDetail } from '@/types/project';
import { ShareIcon, EditIcon, CheckIcon, XIcon } from 'lucide-react';
import {
  JAAZ_IMAGE_MODELS,
  JAAZ_IMAGE_MODELS_INFO,
  IMAGE_RATIO_OPTIONS,
} from '@/constants';

// Data structure based on project schema
interface Step {
  id: string;
  project_id: string;
  step_order: number;
  prompt: string;
  model: string;
  inputs?: string[];
  parameters: {
    aspect_ratio?: string;
    quality?: string;
    seed?: number;
    [key: string]: any;
  };
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  outputs?: {
    id: string;
    url: string;
    type: string;
    format: string;
    order: number;
    metadata?: any;
  }[];
  cost?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

interface UploadedImage {
  url: string;
  filename: string;
}

// Model and size options from constants
const modelOptions = JAAZ_IMAGE_MODELS.map((modelId) => ({
  id: modelId,
  name: JAAZ_IMAGE_MODELS_INFO[modelId].name,
  description: JAAZ_IMAGE_MODELS_INFO[modelId].description,
  price: JAAZ_IMAGE_MODELS_INFO[modelId].price,
}));

const sizeOptions = Object.entries(IMAGE_RATIO_OPTIONS).map(([id, config]) => ({
  id,
  name: (config as { label: string }).label,
}));

const WorkspacePage: NextPage = () => {
  // State management
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState<string>('AI 图像生成');
  const [projectStatus, setProjectStatus] = useState<string>('draft');
  const [isProjectShared, setIsProjectShared] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // 用于修复 workspace 页面滚动问题
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Get the last generated image
  const getLastGeneratedImage = (): UploadedImage | null => {
    const completedSteps = steps.filter(step => step.status === 'completed' && step.outputs && step.outputs.length > 0);
    if (completedSteps.length === 0) return null;

    const lastStep = completedSteps[completedSteps.length - 1];
    const lastOutput = lastStep.outputs?.[0];

    if (lastOutput) {
      return {
        url: lastOutput.url,
        filename: `generated-${lastStep.id}.${lastOutput.format}`
      };
    }

    return null;
  };

  // Get all generated images for sharing
  const getAllGeneratedImages = () => {
    const completedSteps = steps.filter(step => step.status === 'completed' && step.outputs && step.outputs.length > 0);
    const images: Array<{ id: string; url: string; format: string }> = [];

    completedSteps.forEach(step => {
      step.outputs?.forEach(output => {
        images.push({
          id: output.id,
          url: output.url,
          format: output.format,
        });
      });
    });

    return images;
  };

  // Handle title editing
  const handleEditTitle = () => {
    setTempTitle(projectTitle);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!tempTitle.trim()) {
      toast({
        title: "错误",
        description: "项目标题不能为空",
        variant: "destructive",
      });
      return;
    }

    setProjectTitle(tempTitle.trim());
    setIsEditingTitle(false);

    // If we have a project ID, update the project title in the database
    if (currentProjectId) {
      try {
        const response = await fetch(`/api/project/${currentProjectId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: tempTitle.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update project title');
        }

        toast({
          title: "成功",
          description: "项目标题已更新",
          variant: "success",
        });
      } catch (error) {
        console.error('Failed to update project title:', error);
        toast({
          title: "错误",
          description: "更新项目标题失败",
          variant: "destructive",
        });
      }
    }
  };

  const handleCancelEditTitle = () => {
    setTempTitle('');
    setIsEditingTitle(false);
  };

  // Handle share modal
  const handleShareClick = () => {
    if (!currentProjectId) {
      toast({
        title: "错误",
        description: "请先创建或选择一个项目",
        variant: "destructive",
      });
      return;
    }

    const generatedImages = getAllGeneratedImages();
    if (generatedImages.length === 0) {
      toast({
        title: "错误",
        description: "请先生成至少一张图片",
        variant: "destructive",
      });
      return;
    }

    setIsShareModalOpen(true);
  };

  // Handle share success
  const handleShareSuccess = () => {
    setIsProjectShared(true);
    setProjectStatus('shared');
  };

  // Convert S3 URL to base64 data URL
  const convertS3UrlToBase64 = async (s3Url: string, format: string = 'png'): Promise<string> => {
    try {
      const response = await fetch(s3Url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');

      return `data:image/${format};base64,${base64}`;
    } catch (error) {
      console.error('Error converting S3 URL to base64:', error);
      throw error;
    }
  };

  const handleNewPrompt = async (prompt: string, parameters: any) => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    // Create new step with pending status
    const newStep: Step = {
      id: `step-${Date.now()}`,
      project_id: currentProjectId || 'temp',
      step_order: steps.length + 1,
      prompt: prompt,
      model: parameters.model || modelOptions[0].id,
      inputs: uploadedImages.length > 0 ? uploadedImages.map(img => img.url) : undefined,
      parameters: {
        aspect_ratio: parameters.aspect_ratio || sizeOptions[0].id,
        quality: parameters.quality || 'standard',
        ...parameters,
      },
      status: 'running',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setSteps(prev => [...prev, newStep]);

    try {
      // Call the generate API
      const requestBody: any = {
        prompt,
        model: parameters.model || modelOptions[0].id,
        aspect_ratio: parameters.aspect_ratio || sizeOptions[0].id,
        input_images: uploadedImages.map((image) => image.url),
      };

      // 如果有当前项目ID，则复用项目
      if (currentProjectId) {
        requestBody.project_id = currentProjectId;
      }

      const response = await fetch("/api/image/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      if (data.success && data.data) {
        // Update the step with completed status and output
        setSteps(prev => prev.map(step =>
          step.id === newStep.id
            ? {
              ...step,
              status: 'completed' as const,
              project_id: data.data.project_id,
              inputs: uploadedImages.length > 0 ? uploadedImages.map(img => img.url) : undefined,
              outputs: [
                {
                  id: data.data.output_id,
                  url: data.data.image_url,
                  type: 'image',
                  format: data.data.metadata?.format || 'png',
                  order: 0,
                }
              ],
              updated_at: new Date().toISOString(),
            }
            : step
        ));

        // Set current project ID if it's the first step
        if (!currentProjectId) {
          setCurrentProjectId(data.data.project_id);
          setProjectStatus('active'); // 有内容的项目状态为active
        }

        // Auto-load the generated image for next prompt
        setTimeout(() => {
          setUploadedImages([{
            url: data.data.image_url,
            filename: `generated-${data.data.output_id}.${data.data.metadata?.format || 'png'}`
          }]);
        }, 100);

        toast({
          title: "生成成功",
          description: "图像已成功生成！",
          variant: "success",
        });
      } else {
        throw new Error("No image data received");
      }
    } catch (err) {
      console.error("Generation error:", err);
      const errorMessage = err instanceof Error ? err.message : "生成失败，请重试";
      setError(errorMessage);

      // Update step status to failed
      setSteps(prev => prev.map(step =>
        step.id === newStep.id
          ? {
            ...step,
            status: 'failed' as const,
            error_message: errorMessage,
            updated_at: new Date().toISOString(),
          }
          : step
      ));

      toast({
        title: "生成失败",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
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

    // File count limit
    const maxFiles = 5;
    const currentCount = uploadedImages.length;
    const newFilesCount = files.length;

    if (currentCount + newFilesCount > maxFiles) {
      setError(`最多只能上传${maxFiles}张图片`);
      toast({
        title: "上传失败",
        description: `最多只能上传${maxFiles}张图片，当前已有${currentCount}张`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const newImagePromises = Array.from(files).map((file) => {
        return new Promise<UploadedImage>((resolve, reject) => {
          // File type check
          if (!file.type.startsWith('image/')) {
            reject(new Error(`文件 "${file.name}" 不是有效的图片格式`));
            return;
          }

          const reader = new FileReader();
          reader.onload = () =>
            resolve({ url: reader.result as string, filename: file.name });
          reader.onerror = () => reject(new Error(`读取文件 "${file.name}" 失败`));
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
      const errorMessage = err instanceof Error ? err.message : "读取文件失败，请重试";
      setError(errorMessage);
      toast({
        title: "加载失败",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const handleImageDrop = (imageUrl: string) => {
    // Convert the dragged image URL to an uploaded image
    const filename = `dragged-image-${Date.now()}.png`;
    const newImage: UploadedImage = {
      url: imageUrl,
      filename: filename
    };

    const hadExistingImage = uploadedImages.length > 0;

    // Replace the current uploaded images with the dragged image
    setUploadedImages([newImage]);

    toast({
      title: hadExistingImage ? "图片已替换" : "图片已添加",
      description: hadExistingImage
        ? "已将生成的图片替换为输入图片"
        : "已将生成的图片添加到输入框",
      variant: "success",
    });
  };

  const handleImageDragStart = (imageUrl: string) => {
    // Optional: You can add any logic here when drag starts
    console.log('Drag started for image:', imageUrl);
  };

  const handleProjectSelect = (projectId: string, projectData?: ProjectDetail) => {
    // 切换项目ID
    setCurrentProjectId(projectId);

    // 设置项目标题和状态
    if (projectData) {
      setProjectTitle(projectData.title || 'AI 图像生成');
      setProjectStatus(projectData.status || 'draft');
      setIsProjectShared(projectData.status === 'shared' || projectData.is_public);
    }

    // 如果有项目数据，加载步骤
    if (projectData && projectData.steps) {
      const loadedSteps: Step[] = projectData.steps.map((step) => ({
        id: step.id,
        project_id: projectId,
        step_order: step.step_order,
        prompt: step.prompt || '',
        model: step.model || '',
        inputs: step.inputs as string[] | undefined,
        parameters: step.parameters || {},
        status: step.status,
        outputs: step.outputs?.map((output) => ({
          id: output.id,
          url: output.url,
          type: output.type,
          format: output.format || 'png',
          order: output.order,
          metadata: output.metadata,
        })),
        cost: step.cost,
        error_message: step.error_message,
        created_at: step.created_at,
        updated_at: step.updated_at,
      }));

      setSteps(loadedSteps);
      console.log(`Loaded ${loadedSteps.length} steps for project:`, projectId);

      // Auto-load the last generated image by converting S3 URL to base64
      const completedSteps = loadedSteps.filter(step => step.status === 'completed' && step.outputs && step.outputs.length > 0);
      if (completedSteps.length > 0) {
        const lastStep = completedSteps[completedSteps.length - 1];
        const lastOutput = lastStep.outputs?.[0];
        if (lastOutput) {
          // Convert S3 URL to base64 data URL
          convertS3UrlToBase64(lastOutput.url, lastOutput.format)
            .then((base64Url) => {
              setUploadedImages([{
                url: base64Url,
                filename: `generated-${lastStep.id}.${lastOutput.format}`
              }]);
            })
            .catch((error) => {
              console.error('Failed to convert image to base64:', error);
              // If conversion fails, don't auto-load the image
              setUploadedImages([]);
            });
        } else {
          setUploadedImages([]);
        }
      } else {
        setUploadedImages([]);
      }
    } else {
      // 如果没有项目数据，清空步骤
      setSteps([]);
      setUploadedImages([]);
    }

    // 清空错误状态
    setError(null);

    toast({
      title: "项目已切换",
      description: `已切换到项目并加载了${projectData?.steps?.length || 0}个步骤`,
      variant: "success",
    });
  };

  const handleNewProject = (project?: any) => {
    // 重置为空状态
    console.log('Creating new project');
    setCurrentProjectId(null);
    setProjectTitle('AI 图像生成');
    setProjectStatus('draft');
    setIsProjectShared(false);
    setSteps([]);
    setUploadedImages([]);
    setError(null);
    setIsEditingTitle(false);
    toast({
      title: "新项目",
      description: "已创建新项目，开始你的创作吧！",
      variant: "success",
    });
  };

  return (
    <>
      <Head>
        <title>Workspace - AI Image Generation</title>
        <meta name="description" content="AI-powered image generation workspace" />
      </Head>

      <div className="fixed top-20 left-0 right-0 bottom-0 bg-black flex overflow-hidden z-10">
        {/* Left Sidebar */}
        <div className="flex-shrink-0 h-full">
          <ProjectSidebar
            currentProjectId={currentProjectId}
            onProjectSelect={handleProjectSelect}
            onNewProject={handleNewProject}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full relative">
          {/* Header */}
          <div className="bg-black border-b border-gray-800 px-6 py-4 flex-shrink-0">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              {/* Editable Title */}
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      className="text-xl font-bold bg-gray-800 border-gray-600 text-white"
                      placeholder="输入项目标题"
                      maxLength={100}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveTitle();
                        } else if (e.key === 'Escape') {
                          handleCancelEditTitle();
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveTitle}
                      className="text-green-400 hover:text-green-300"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEditTitle}
                      className="text-red-400 hover:text-red-300"
                    >
                      <XIcon className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-white">
                      {projectTitle}
                    </h1>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleEditTitle}
                      className="text-gray-400 hover:text-white"
                    >
                      <EditIcon className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Share Button - Only show if project has content */}
              {currentProjectId && getAllGeneratedImages().length > 0 && (
                <Button
                  onClick={handleShareClick}
                  variant="outline"
                  className={
                    isProjectShared
                      ? "border-green-600 text-green-400 cursor-not-allowed"
                      : "border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                  }
                  disabled={isProjectShared}
                >
                  <ShareIcon className="w-4 h-4 mr-2" />
                  {isProjectShared ? "已分享" : "分享到广场"}
                </Button>
              )}
            </div>
          </div>

          {/* Main Content - Scrollable */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="max-w-4xl mx-auto w-full px-6 py-8">
              {/* Steps Container */}
              <div className="space-y-6 pb-60"> {/* Bottom padding for fixed input */}
                {steps.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🎨</span>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">
                      开始你的创作之旅
                    </h3>
                    <p className="text-gray-400 mb-6">
                      在下方输入框中描述你想要生成的图像，开始第一步创作
                    </p>
                  </div>
                ) : (
                  steps.map((step) => (
                    <StepComponent
                      key={step.id}
                      prompt={step.prompt}
                      inputs={step.inputs}
                      outputImage={step.outputs?.[0]?.url}
                      status={step.status}
                      onImageDragStart={handleImageDragStart}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Fixed Input Component at Bottom */}
          <div className="absolute bottom-0 left-0 right-0 flex-shrink-0 z-10">
            <InputComponent
              onSubmit={handleNewPrompt}
              disabled={isGenerating}
              placeholder="描述你想要生成或修改的图像..."
              modelOptions={modelOptions}
              sizeOptions={sizeOptions}
              uploadedImages={uploadedImages}
              onUploadClick={handleUploadClick}
              onRemoveImage={removeUploadedImage}
              onFileChange={handleFileChange}
              onImageDrop={handleImageDrop}
              isUploading={isUploading}
              error={error}
              fileInputRef={fileInputRef}
            />
          </div>
        </div>

        {/* Share Modal */}
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          projectId={currentProjectId}
          currentTitle={projectTitle}
          generatedImages={getAllGeneratedImages()}
          onShareSuccess={handleShareSuccess}
        />
      </div>
    </>
  );
};


export default WorkspacePage;
