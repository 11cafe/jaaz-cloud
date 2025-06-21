import React, { useState } from 'react';

interface StepComponentProps {
  prompt: string;
  outputImage?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
}

export const StepComponent: React.FC<StepComponentProps> = ({
  prompt,
  outputImage,
  status
}) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const handleImageClick = () => {
    if (outputImage && status === 'completed') {
      setIsImageModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsImageModalOpen(false);
  };

  return (
    <>
      <div className="bg-gray-900 rounded-lg shadow-sm border border-gray-700 p-6">
        {/* User Prompt */}
        <div className="mb-6">
          <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-blue-500">
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
          <div className="w-full bg-gray-800 rounded-lg overflow-hidden">
            <img
              src={outputImage}
              alt={`Generated image for: ${prompt}`}
              className="w-full h-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
              onClick={handleImageClick}
            />
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
      {isImageModalOpen && outputImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={handleModalClose}
        >
          <div className="max-w-full max-h-full flex items-center justify-center">
            <img
              src={outputImage}
              alt={`Full size image for: ${prompt}`}
              className="max-w-full max-h-full object-contain"
              // onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
};
