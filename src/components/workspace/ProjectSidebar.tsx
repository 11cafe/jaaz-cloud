import React, { useState } from 'react';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon, ImageIcon } from 'lucide-react';

// Mock project data interface
interface Project {
  id: string;
  title: string;
  cover?: string;
  created_at: string;
  status: 'draft' | 'active' | 'completed' | 'shared' | 'deleted';
}

interface ProjectSidebarProps {
  currentProjectId?: string | null;
  onProjectSelect?: (projectId: string) => void;
  onNewProject?: () => void;
}

// Mock data for testing
const mockProjects: Project[] = [
  {
    id: 'project-1',
    title: '梦幻森林场景',
    cover: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=400&fit=crop',
    created_at: '2024-01-15T10:30:00Z',
    status: 'completed'
  },
  {
    id: 'project-2',
    title: '未来城市概念图',
    cover: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1f?w=400&h=400&fit=crop',
    created_at: '2024-01-14T15:45:00Z',
    status: 'active'
  },
  {
    id: 'project-3',
    title: '抽象艺术创作',
    cover: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=400&fit=crop',
    created_at: '2024-01-13T09:20:00Z',
    status: 'draft'
  },
  {
    id: 'project-4',
    title: '人物肖像练习',
    cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    created_at: '2024-01-12T14:10:00Z',
    status: 'completed'
  },
  {
    id: 'project-5',
    title: '风景水彩效果',
    cover: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
    created_at: '2024-01-11T11:30:00Z',
    status: 'shared'
  }
];

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  currentProjectId,
  onProjectSelect,
  onNewProject
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [projects] = useState<Project[]>(mockProjects);

  const handleProjectClick = (projectId: string) => {
    onProjectSelect?.(projectId);
  };

  const handleNewProjectClick = () => {
    onNewProject?.();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return '今天';
    if (diffDays === 2) return '昨天';
    if (diffDays <= 7) return `${diffDays - 1}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  };



  return (
    <div
      className={`
        h-screen bg-gray-900 border-r border-gray-700 flex flex-col transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-80'}
      `}
    >
      {/* Header with toggle button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-white">项目</h2>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
          title={isCollapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="w-4 h-4" />
          ) : (
            <ChevronLeftIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* New Project Button */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={handleNewProjectClick}
          className={`
            w-full flex items-center gap-3 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors
            ${isCollapsed ? 'justify-center' : ''}
          `}
          title="新建项目"
        >
          <PlusIcon className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && (
            <span className="font-medium">新建项目</span>
          )}
        </button>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto">
        {isCollapsed ? (
          // Collapsed view - show only thumbnails
          <div className="p-2 space-y-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleProjectClick(project.id)}
                className={`
                   w-12 h-8 rounded-md overflow-hidden border-2 transition-all hover:scale-105
                   ${currentProjectId === project.id
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-gray-600 hover:border-gray-500'
                  }
                 `}
                title={project.title}
              >
                {project.cover ? (
                  <img
                    src={project.cover}
                    alt={project.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          // Expanded view - show full project cards
          <div className="p-4 space-y-3">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleProjectClick(project.id)}
                className={`
                   w-full text-left rounded-lg border transition-all hover:bg-gray-800
                   ${currentProjectId === project.id
                    ? 'bg-gray-800 border-blue-500 ring-1 ring-blue-500/20'
                    : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                  }
                 `}
              >
                {/* Project Thumbnail - Full Width */}
                <div className="w-full h-32 rounded-t-lg overflow-hidden bg-gray-700">
                  {project.cover ? (
                    <img
                      src={project.cover}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Project Info */}
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-white text-sm truncate pr-2 flex-1">
                      {project.title}
                    </h3>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatDate(project.created_at)}
                    </span>
                  </div>
                </div>
              </button>
            ))}

            {/* Empty state */}
            {projects.length === 0 && (
              <div className="text-center py-8">
                <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">暂无项目</p>
                <p className="text-gray-500 text-xs mt-1">点击上方按钮创建第一个项目</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
