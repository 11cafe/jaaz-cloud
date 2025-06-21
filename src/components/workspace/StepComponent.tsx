import React, { useState } from 'react';

interface StepComponentProps {
  prompt: string;
  inputs?: string[];
  outputImage?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  onImageDragStart?: (imageUrl: string) => void;
}

export const StepComponent: React.FC<StepComponentProps> = ({
  prompt,
  inputs,
  outputImage,
  status,
  onImageDragStart
}) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedModalImage, setSelectedModalImage] = useState<string>('');

  const handleImageClick = (imageUrl?: string) => {
    const imageToShow = imageUrl || outputImage;
    if (imageToShow && (status === 'completed' || imageUrl)) {
      setSelectedModalImage(imageToShow);
      setIsImageModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsImageModalOpen(false);
    setSelectedModalImage('');
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (outputImage && status === 'completed') {
      e.dataTransfer.setData('text/plain', outputImage);
      e.dataTransfer.effectAllowed = 'copy';
      onImageDragStart?.(outputImage);
    }
  };

  const handleInputImageDragStart = (e: React.DragEvent, inputImageUrl: string) => {
    e.dataTransfer.setData('text/plain', inputImageUrl);
    e.dataTransfer.effectAllowed = 'copy';
    onImageDragStart?.(inputImageUrl);
  };

  return (
    <>
      <div className="bg-gray-900 rounded-lg shadow-sm border border-gray-700 p-6">
        {/* User Prompt with Input Images */}
        <div className="mb-6">
          <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-blue-500">
            {/* Input Images Thumbnails */}
            {inputs && inputs.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"></path>
                  </svg>
                  <span className="text-xs text-gray-400">输入图像:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {inputs.map((inputUrl, index) => (
                    <div
                      key={index}
                      className="relative group cursor-pointer"
                      onClick={() => handleImageClick(inputUrl)}
                    >
                      <img
                        src={inputUrl}
                        alt={`Input image ${index + 1}`}
                        className="w-16 h-16 object-cover rounded border border-gray-600 hover:border-blue-400 transition-colors"
                        draggable
                        onDragStart={(e) => handleInputImageDragStart(e, inputUrl)}
                      />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/20 rounded transition-colors"></div>
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-black/60 text-white text-xs px-1 py-0.5 rounded text-center min-w-[16px]">
                          {index + 1}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User Prompt Text */}
            <p className="text-gray-200 text-sm leading-relaxed">
              {prompt}
            </p>
          </div>
        </div>

        {/* Generated Image */}
        {status === 'running' ? (
          <div className="w-full aspect-square bg-gray-800 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-400">正在生成图像...</p>
            </div>
          </div>
        ) : outputImage ? (
          <div className="w-full bg-gray-800 rounded-lg overflow-hidden relative group">
            <img
              src={outputImage}
              alt={`Generated image for: ${prompt}`}
              className="w-full h-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => handleImageClick()}
              draggable={status === 'completed'}
              onDragStart={handleDragStart}
            />
            {status === 'completed' && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                  </svg>
                  拖拽到输入框
                </div>
              </div>
            )}
          </div>
        ) : status === 'failed' ? (
          <div className="w-full aspect-square bg-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed border-red-500">
            <div className="text-center">
              <div className="text-red-400 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <p className="text-sm text-red-400">生成失败</p>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-square bg-gray-800 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-600">
            <div className="text-center">
              <div className="text-gray-500 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"></path>
                </svg>
              </div>
              <p className="text-sm text-gray-500">等待生成</p>
            </div>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {isImageModalOpen && selectedModalImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={handleModalClose}
        >
          <div className="max-w-full max-h-full flex items-center justify-center">
            <img
              src={selectedModalImage}
              alt="Full size image"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
};
