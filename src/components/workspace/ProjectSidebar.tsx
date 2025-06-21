import React, { useState, useEffect } from 'react';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon, ImageIcon, LoaderIcon, AlertCircleIcon } from 'lucide-react';
import { Project, ProjectDetail } from '@/types/project';

interface ProjectSidebarProps {
  currentProjectId?: string | null;
  onProjectSelect?: (projectId: string, projectData?: ProjectDetail) => void;
  onNewProject?: (project?: Project) => void;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  currentProjectId,
  onProjectSelect,
  onNewProject
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);

  // Format project date
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

  // Load project details
  const loadProjectDetails = async (projectId: string): Promise<ProjectDetail | null> => {
    try {
      const response = await fetch(`/api/project/${projectId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load project details');
      }

      return result.data;
    } catch (err) {
      console.error('Failed to load project details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project details');
      return null;
    }
  };

  // Load projects from API
  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/project/list?limit=50');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load projects');
      }

      setProjects(result.data);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  // Create new project
  const handleNewProjectClick = async () => {
    try {
      setCreating(true);
      setError(null);

      const response = await fetch('/api/project/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '新建项目',
          description: '新创建的项目'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create project');
      }

      // Add to projects list
      setProjects(prev => [result.data, ...prev]);

      // Notify parent component
      onNewProject?.(result.data);

    } catch (err) {
      console.error('Failed to create project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);

  const handleProjectClick = async (projectId: string) => {
    try {
      setLoadingProjectId(projectId);
      const projectData = await loadProjectDetails(projectId);
      if (projectData) {
        onProjectSelect?.(projectId, projectData);
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project details');
    } finally {
      setLoadingProjectId(null);
    }
  };

  const handleRetry = () => {
    loadProjects();
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
          disabled={creating}
          className={`
            w-full flex items-center gap-3 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors
            ${isCollapsed ? 'justify-center' : ''}
          `}
          title="新建项目"
        >
          {creating ? (
            <LoaderIcon className="w-5 h-5 flex-shrink-0 animate-spin" />
          ) : (
            <PlusIcon className="w-5 h-5 flex-shrink-0" />
          )}
          {!isCollapsed && (
            <span className="font-medium">
              {creating ? '创建中...' : '新建项目'}
            </span>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && !isCollapsed && (
        <div className="p-4 border-b border-gray-700">
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircleIcon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-300 text-sm">{error}</p>
                <button
                  onClick={handleRetry}
                  className="text-red-400 hover:text-red-300 text-xs mt-1 underline"
                >
                  重试
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          // Loading state
          <div className="flex items-center justify-center py-8">
            <LoaderIcon className="w-6 h-6 text-gray-400 animate-spin" />
            {!isCollapsed && (
              <span className="ml-2 text-gray-400 text-sm">加载中...</span>
            )}
          </div>
        ) : isCollapsed ? (
          // Collapsed view - show only thumbnails
          <div className="p-2 space-y-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleProjectClick(project.id)}
                disabled={loadingProjectId === project.id}
                className={`
                   relative w-12 h-8 rounded-md overflow-hidden border-2 transition-all hover:scale-105 disabled:opacity-50
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
                {/* Loading overlay */}
                {loadingProjectId === project.id && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <LoaderIcon className="w-3 h-3 text-white animate-spin" />
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
                disabled={loadingProjectId === project.id}
                className={`
                   relative w-full text-left rounded-lg border transition-all hover:bg-gray-800 disabled:opacity-50
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

                {/* Loading overlay */}
                {loadingProjectId === project.id && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <LoaderIcon className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </button>
            ))}

            {/* Empty state */}
            {projects.length === 0 && !loading && (
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
