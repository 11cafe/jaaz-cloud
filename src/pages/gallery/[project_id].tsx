import React, { useState, useEffect } from 'react';
import { NextPage, GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  IconArrowLeft,
  IconHeart,
  IconEye,
  IconUser,
  IconCalendar,
  IconSparkles
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StepComponent } from '@/components/workspace/StepComponent';
import { useToast } from '@/components/ui/use-toast';
import { JAAZ_IMAGE_MODELS_INFO } from '@/constants';

// 项目详情数据结构
interface ProjectStep {
  id: string;
  step_order: number;
  prompt: string;
  model: string;
  inputs?: any;
  parameters?: any;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  cost?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  outputs: {
    id: string;
    step_id: string;
    url: string;
    type: string;
    format?: string;
    order: number;
    metadata?: any;
    created_at: string;
  }[];
}

interface ProjectDetail {
  id: string;
  title: string;
  description: string;
  cover: string;
  featured: string[];
  view_count: number;
  like_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  username: string;
  user_avatar?: string;
  is_liked: boolean;
  steps: ProjectStep[];
}

interface ProjectDetailPageProps {
  project: ProjectDetail | null;
  error?: string;
}

const ProjectDetailPage: NextPage<ProjectDetailPageProps> = ({ project, error }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(project?.is_liked || false);
  const [likeCount, setLikeCount] = useState(project?.like_count || 0);
  const [loading, setLoading] = useState(false);

  // 如果有错误，显示错误页面
  if (error || !project) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Head>
          <title>项目未找到 - AI 作品广场</title>
        </Head>

        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">项目未找到</h1>
          <p className="text-gray-400 mb-6">
            {error || '该项目不存在或未公开分享'}
          </p>
          <Button
            onClick={() => router.push('/gallery')}
            variant="outline"
          >
            <IconArrowLeft size={16} className="mr-2" />
            返回广场
          </Button>
        </div>
      </div>
    );
  }

  // 处理点赞
  const handleLike = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const response = await fetch('/api/image/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: project.id })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setIsLiked(result.is_liked);
        setLikeCount(result.like_count);
      } else {
        throw new Error(result.error || 'Like operation failed');
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      toast({
        title: "操作失败",
        description: "点赞操作失败，请重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 返回广场
  const handleBack = () => {
    router.push('/gallery');
  };

  return (
    <>
      <Head>
        <title>{project.title} - AI 作品广场</title>
        <meta name="description" content={project.description || `查看 ${project.username} 创作的 AI 作品`} />
      </Head>

      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm border-b border-gray-800">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="text-gray-400 hover:text-white"
              >
                <IconArrowLeft size={20} className="mr-2" />
                返回广场
              </Button>

              <div className="flex items-center gap-4">
                {/* 精选标识 */}
                {project.featured && project.featured.length > 0 && (
                  <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                    <IconSparkles size={12} className="mr-1" />
                    精选
                  </Badge>
                )}

                {/* 点赞按钮 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  disabled={loading}
                  className={`flex items-center gap-2 ${isLiked
                    ? 'text-red-400 hover:text-red-300'
                    : 'text-gray-400 hover:text-white'
                    }`}
                >
                  <IconHeart
                    size={16}
                    className={isLiked ? 'fill-current' : ''}
                  />
                  {likeCount}
                </Button>

                {/* 浏览量 */}
                <div className="flex items-center gap-2 text-gray-400">
                  <IconEye size={16} />
                  {project.view_count.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* 项目信息 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            {/* 标题 */}
            <h1 className="text-3xl font-bold mb-4">{project.title}</h1>

            {/* 描述 */}
            {project.description && (
              <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                {project.description}
              </p>
            )}

            {/* 作者和时间信息 */}
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <img
                  src={project.user_avatar || `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000000000)}?w=32&h=32&fit=crop&crop=face&auto=format`}
                  alt={project.username}
                  className="w-6 h-6 rounded-full object-cover"
                />
                <IconUser size={14} />
                <span>{project.username}</span>
              </div>

              <div className="flex items-center gap-2">
                <IconCalendar size={14} />
                <span>{new Date(project.updated_at).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          </motion.div>

          {/* 工作流程步骤 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              创作流程
            </h2>

            {project.steps && project.steps.length > 0 ? (
              <div className="space-y-6">
                {project.steps
                  .sort((a, b) => a.step_order - b.step_order)
                  .map((step, index) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      {/* 步骤标题 */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full text-sm font-medium">
                          {step.step_order}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {JAAZ_IMAGE_MODELS_INFO[step.model]?.name || step.model}
                          </Badge>
                          {step.parameters?.aspect_ratio && (
                            <Badge variant="secondary">
                              {step.parameters.aspect_ratio}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* 步骤内容 */}
                      <StepComponent
                        prompt={step.prompt || ''}
                        outputImage={step.outputs?.[0]?.url}
                        status={step.status}
                      />
                    </motion.div>
                  ))
                }
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>暂无工作流程信息</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { project_id } = context.params!;

  try {
    // 构建完整的API URL
    const protocol = context.req.headers['x-forwarded-proto'] || 'http';
    const host = context.req.headers.host;
    const apiUrl = `${protocol}://${host}/api/image/shared/${project_id}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      if (response.status === 404) {
        return {
          props: {
            project: null,
            error: '项目不存在或未公开分享'
          }
        };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      return {
        props: {
          project: null,
          error: result.error || '获取项目信息失败'
        }
      };
    }

    return {
      props: {
        project: result.data
      }
    };
  } catch (error) {
    console.error('Error fetching project:', error);
    return {
      props: {
        project: null,
        error: '服务器错误，请稍后重试'
      }
    };
  }
};

export default ProjectDetailPage;
