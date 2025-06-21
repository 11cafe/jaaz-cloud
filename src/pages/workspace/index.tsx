import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { StepComponent } from '@/components/workspace/StepComponent';
import { InputComponent } from '@/components/workspace/InputComponent';

// Mock data structure based on project schema
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

const WorkspacePage: NextPage = () => {
  // Mock project data
  const [steps, setSteps] = useState<Step[]>([
    {
      id: 'step-1',
      project_id: 'project-1',
      step_order: 1,
      prompt: '骑士的旁边是哈士奇',
      model: 'midjourney',
      parameters: {
        aspect_ratio: '1:1',
        quality: 'standard',
      },
      status: 'completed',
      outputs: [
        {
          id: 'output-1',
          url: 'https://picsum.photos/512/512?random=1',
          type: 'image',
          format: 'jpg',
          order: 0,
        }
      ],
      created_at: '2024-01-20T10:00:00Z',
      updated_at: '2024-01-20T10:02:00Z',
    },
    {
      id: 'step-2',
      project_id: 'project-1',
      step_order: 2,
      prompt: '人物换成成人',
      model: 'midjourney',
      parameters: {
        aspect_ratio: '1:1',
        quality: 'standard',
      },
      status: 'completed',
      outputs: [
        {
          id: 'output-2',
          url: 'https://picsum.photos/512/512?random=2',
          type: 'image',
          format: 'jpg',
          order: 0,
        }
      ],
      created_at: '2024-01-20T10:05:00Z',
      updated_at: '2024-01-20T10:07:00Z',
    },
    {
      id: 'step-3',
      project_id: 'project-1',
      step_order: 3,
      prompt: '生成一张伯人',
      model: 'midjourney',
      parameters: {
        aspect_ratio: '16:9',
        quality: 'high',
      },
      status: 'running',
      created_at: '2024-01-20T10:10:00Z',
      updated_at: '2024-01-20T10:10:00Z',
    }
  ]);

  const [isGenerating, setIsGenerating] = useState(false);

  const handleNewPrompt = async (prompt: string, parameters: any) => {
    setIsGenerating(true);

    // Create new step
    const newStep: Step = {
      id: `step-${Date.now()}`,
      project_id: 'project-1',
      step_order: steps.length + 1,
      prompt: prompt,
      model: parameters.model,
      parameters: parameters,
      status: 'running',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setSteps(prev => [...prev, newStep]);

    // Simulate API call - replace with actual implementation
    setTimeout(() => {
      setSteps(prev => prev.map(step =>
        step.id === newStep.id
          ? {
            ...step,
            status: 'completed' as const,
            outputs: [
              {
                id: `output-${Date.now()}`,
                url: `https://picsum.photos/512/512?random=${Date.now()}`,
                type: 'image',
                format: 'jpg',
                order: 0,
              }
            ],
            updated_at: new Date().toISOString(),
          }
          : step
      ));
      setIsGenerating(false);
    }, 3000);
  };

  return (
    <>
      <Head>
        <title>Workspace - AI Image Generation</title>
        <meta name="description" content="AI-powered image generation workspace" />
      </Head>

      <div className="min-h-screen bg-black">
        {/* Header */}
        <div className="bg-black border-b border-gray-800 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-white">
              AI 图像生成
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-6 py-8">
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

        {/* Fixed Input Component at Bottom */}
        <InputComponent
          onSubmit={handleNewPrompt}
          disabled={isGenerating}
          placeholder="描述你想要生成或修改的图像..."
        />
      </div>
    </>
  );
};

// Mark this page as not needing the default layout
// (WorkspacePage as any).noLayout = true;

export default WorkspacePage;
