import React, { useState } from 'react';
import { XIcon } from 'lucide-react';

interface UploadedImage {
  url: string;
  filename: string;
}

interface InputComponentProps {
  onSubmit: (prompt: string, parameters: any) => void;
  disabled?: boolean;
  placeholder?: string;
  modelOptions: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
  }>;
  sizeOptions: Array<{
    id: string;
    name: string;
  }>;
  uploadedImages: UploadedImage[];
  onUploadClick: () => void;
  onRemoveImage: (index: number) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  error?: string | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export const InputComponent: React.FC<InputComponentProps> = ({
  onSubmit,
  disabled = false,
  placeholder = "描述你想要生成的图像...",
  modelOptions,
  sizeOptions,
  uploadedImages,
  onUploadClick,
  onRemoveImage,
  onFileChange,
  isUploading,
  error,
  fileInputRef
}) => {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(modelOptions[0]?.id || 'midjourney');
  const [aspectRatio, setAspectRatio] = useState(sizeOptions[0]?.id || '1:1');

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
          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {/* Uploaded Images */}
          {uploadedImages.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {uploadedImages.map((image, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-md overflow-hidden border border-gray-600"
                  >
                    <img
                      src={image.url}
                      alt={image.filename}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveImage(index)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                    >
                      <XIcon className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Input Area */}
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                rows={3}
                className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm placeholder-gray-400 disabled:bg-gray-700 disabled:cursor-not-allowed"
              />
              {/* Upload Button */}
              <button
                type="button"
                onClick={onUploadClick}
                disabled={isUploading || disabled}
                className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                )}
              </button>
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
                {modelOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
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
                {sizeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={onFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
};
