import React, { useState } from 'react';

interface InputComponentProps {
  onSubmit: (prompt: string, parameters: any) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const InputComponent: React.FC<InputComponentProps> = ({
  onSubmit,
  disabled = false,
  placeholder = "描述你想要生成的图像..."
}) => {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('midjourney');
  const [aspectRatio, setAspectRatio] = useState('1:1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || disabled) return;

    onSubmit(prompt, {
      model,
      aspect_ratio: aspectRatio,
    });

    // Clear input after submit
    setPrompt('');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 shadow-lg">
      <div className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Main Input Area */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                rows={3}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm placeholder-gray-400 disabled:bg-gray-700 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={!prompt.trim() || disabled}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 self-end"
            >
              {disabled ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>生成中</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                  </svg>
                  <span>生成</span>
                </>
              )}
            </button>
          </div>

          {/* Advanced Options */}
          <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-700">
            {/* Model Selection */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-300">模型:</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={disabled}
                className="px-3 py-1.5 bg-gray-800 border border-gray-600 text-white rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-700"
              >
                <option value="midjourney">Midjourney</option>
                <option value="dall-e-3">DALL-E 3</option>
                <option value="stable-diffusion">Stable Diffusion</option>
              </select>
            </div>

            {/* Aspect Ratio */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-300">宽高比:</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                disabled={disabled}
                className="px-3 py-1.5 bg-gray-800 border border-gray-600 text-white rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-700"
              >
                <option value="1:1">1:1 (正方形)</option>
                <option value="16:9">16:9 (横向)</option>
                <option value="9:16">9:16 (竖向)</option>
                <option value="4:3">4:3 (标准)</option>
                <option value="3:4">3:4 (竖向标准)</option>
              </select>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};
