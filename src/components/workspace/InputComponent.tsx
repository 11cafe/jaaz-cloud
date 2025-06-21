import React, { useState } from 'react';
import { XIcon, ImageIcon, SendIcon } from 'lucide-react';

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
  onImageDrop?: (imageUrl: string) => void;
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
  onImageDrop,
  isUploading,
  error,
  fileInputRef
}) => {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(modelOptions[0]?.id || 'midjourney');
  const [aspectRatio, setAspectRatio] = useState(sizeOptions[0]?.id || '1:1');
  const [isDragOver, setIsDragOver] = useState(false);

  // Only use the first uploaded image since we only support single image
  const uploadedImage = uploadedImages[0];

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only set isDragOver to false if we're leaving the entire component
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const imageUrl = e.dataTransfer.getData('text/plain');
    if (imageUrl && onImageDrop) {
      onImageDrop(imageUrl);
    }
  };

  return (
    <div className="absolute bottom-4 left-4 right-4">
      <div
        className={`max-w-4xl mx-auto bg-gray-900/95 backdrop-blur-sm border rounded-lg p-4 transition-all duration-200 ${isDragOver
          ? 'border-blue-500 bg-blue-500/10 scale-[1.02]'
          : 'border-gray-700'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-500/20 border-2 border-blue-500 border-dashed rounded-lg flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center">
              <div className="text-blue-400 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                </svg>
              </div>
              <p className="text-blue-400 font-medium">
                {uploadedImage ? "释放以替换图片" : "释放以添加图片"}
              </p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-3 flex items-center gap-2 p-2 bg-red-900/20 border border-red-500/30 rounded-md">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Main Input Container */}
          <div className="flex items-stretch gap-3">
            {/* Upload Button / Image Thumbnail - Independent on the left */}
            {uploadedImage ? (
              <div
                className={`relative flex-shrink-0 w-16 h-16 bg-gray-800 border-2 rounded-lg overflow-hidden transition-all duration-200 ${'border-gray-600 hover:border-gray-500'
                  } ${isUploading || disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={onUploadClick}
                title="点击更换图片"
              >
                <img
                  src={uploadedImage.url}
                  alt={uploadedImage.filename}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveImage(0);
                  }}
                  className="absolute top-1 right-1 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors z-10"
                >
                  <XIcon className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ) : (
              <div
                className={`flex-shrink-0 w-16 h-16 bg-gray-800 border-2 border-dashed rounded-lg transition-all duration-200 flex items-center justify-center ${'border-gray-600 hover:border-gray-500'
                  } ${isUploading || disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={onUploadClick}
                title="点击上传图片"
              >
                {isUploading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                ) : (
                  <div className="text-gray-400 hover:text-white transition-colors">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
              </div>
            )}

            {/* Input Box Container */}
            <div className="flex-1 flex items-end gap-3 bg-gray-800 rounded-lg border border-gray-600 p-3">
              {/* Input Area */}
              <div className="flex-1 min-w-0">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  disabled={disabled}
                  rows={1}
                  className="w-full bg-transparent text-white text-base placeholder-gray-400 resize-none border-none outline-none disabled:cursor-not-allowed"
                  style={{ minHeight: '20px', maxHeight: '100px' }}
                />
              </div>

              {/* Submit Button */}
              <div className="flex-shrink-0">
                <button
                  type="submit"
                  disabled={!prompt.trim() || disabled}
                  className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                  title="发送"
                >
                  {disabled ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <SendIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Options - Always Visible, Right Aligned */}
          <div className="flex flex-wrap gap-4 justify-end">
            {/* Model Selection */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-300 whitespace-nowrap">模型:</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={disabled}
                className="px-2 py-1 bg-gray-700 border border-gray-600 text-white rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-600"
              >
                {modelOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Aspect Ratio */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-300 whitespace-nowrap">宽高比:</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                disabled={disabled}
                className="px-2 py-1 bg-gray-700 border border-gray-600 text-white rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-600"
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
          accept="image/*"
          onChange={onFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
};
