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

  return (
    <div className="absolute bottom-4 left-4 right-4">
      <div className="max-w-4xl mx-auto bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
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
              <div className="relative flex-shrink-0 w-16 h-16 bg-gray-800 border border-gray-600 rounded-lg overflow-hidden">
                <img
                  src={uploadedImage.url}
                  alt={uploadedImage.filename}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onRemoveImage(0)}
                  className="absolute top-1 right-1 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                >
                  <XIcon className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onUploadClick}
                disabled={isUploading || disabled}
                className="flex-shrink-0 w-16 h-16 bg-gray-800 border border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                title="上传图片"
              >
                {isUploading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                ) : (
                  <ImageIcon className="w-5 h-5" />
                )}
              </button>
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
