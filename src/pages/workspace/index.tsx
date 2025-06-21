import React, { useState, useRef } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { StepComponent } from '@/components/workspace/StepComponent';
import { InputComponent } from '@/components/workspace/InputComponent';
import { ProjectSidebar } from '@/components/workspace/ProjectSidebar';
import { useToast } from '@/components/ui/use-toast';
import { ProjectDetail } from '@/types/project';
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
        }

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

  const handleProjectSelect = (projectId: string, projectData?: ProjectDetail) => {
    // 切换项目ID
    setCurrentProjectId(projectId);

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
    } else {
      // 如果没有项目数据，清空步骤
      setSteps([]);
    }

    // 清空上传的图片和错误状态
    setUploadedImages([]);
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
    setSteps([]);
    setUploadedImages([]);
    setError(null);
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

      <div className="w-full h-full bg-black flex overflow-hidden">
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
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl font-bold text-white">
                AI 图像生成
              </h1>
            </div>
          </div>

          {/* Main Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
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
                      outputImage={step.outputs?.[0]?.url}
                      status={step.status}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Fixed Input Component at Bottom */}
          <div className="absolute bottom-0 left-0 right-0 flex-shrink-0">
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
              isUploading={isUploading}
              error={error}
              fileInputRef={fileInputRef}
            />
          </div>
        </div>
      </div>
    </>
  );
};


export default WorkspacePage;
