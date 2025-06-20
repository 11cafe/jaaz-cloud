import { useState } from "react";
import { useSession } from "next-auth/react";

interface UploadResult {
  success: boolean;
  s3Url?: string;
  error?: string;
  metadata?: {
    fileName: string;
    fileSize: number;
    contentType: string;
  };
}

export default function S3TestPage() {
  const { data: session } = useSession();
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove data:image/jpeg;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Test S3 upload
  const testS3Upload = async () => {
    if (!selectedFile) {
      alert("请先选择一个文件");
      return;
    }

    if (!session) {
      alert("请先登录");
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      // Convert file to base64
      const base64Data = await fileToBase64(selectedFile);

      // Call test API
      const response = await fetch("/api/test/s3-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base64Data,
          fileName: selectedFile.name,
          contentType: selectedFile.type,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          s3Url: data.s3Url,
          metadata: {
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            contentType: selectedFile.type,
          },
        });
      } else {
        setResult({
          success: false,
          error: data.error || "Upload failed",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          S3 上传测试
        </h1>

        {/* Login Status */}
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <p className="text-sm text-gray-600">
            登录状态: {session ? `✅ ${session.user?.name}` : "❌ 未登录"}
          </p>
        </div>

        {/* File Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择图片文件
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-full file:border-0
                     file:text-sm file:font-semibold
                     file:bg-blue-50 file:text-blue-700
                     hover:file:bg-blue-100"
          />
        </div>

        {/* Selected File Info */}
        {selectedFile && (
          <div className="mb-4 p-3 bg-blue-50 rounded">
            <h3 className="text-sm font-medium text-blue-900 mb-1">选中的文件:</h3>
            <p className="text-sm text-blue-700">名称: {selectedFile.name}</p>
            <p className="text-sm text-blue-700">大小: {(selectedFile.size / 1024).toFixed(2)} KB</p>
            <p className="text-sm text-blue-700">类型: {selectedFile.type}</p>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={testS3Upload}
          disabled={!selectedFile || uploading || !session}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md
                   hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                   transition duration-200"
        >
          {uploading ? "上传中..." : "测试 S3 上传"}
        </button>

        {/* Results */}
        {result && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">上传结果</h2>

            {result.success ? (
              <div className="space-y-4">
                {/* Success Info */}
                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <h3 className="text-green-800 font-medium mb-2">✅ 上传成功!</h3>

                  {/* S3 URL */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-green-700 mb-1">
                      S3 URL:
                    </label>
                    <div className="bg-white p-2 rounded border break-all text-sm">
                      <a
                        href={result.s3Url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {result.s3Url}
                      </a>
                    </div>
                  </div>

                  {/* Metadata */}
                  {result.metadata && (
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-1">
                        文件信息:
                      </label>
                      <div className="bg-white p-2 rounded border text-sm">
                        <p>文件名: {result.metadata.fileName}</p>
                        <p>大小: {(result.metadata.fileSize / 1024).toFixed(2)} KB</p>
                        <p>类型: {result.metadata.contentType}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview Image */}
                {result.s3Url && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded">
                    <h3 className="text-gray-700 font-medium mb-2">图片预览:</h3>
                    <img
                      src={result.s3Url}
                      alt="Uploaded image"
                      className="max-w-full h-auto rounded shadow-sm"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7ml6DmsJXliqDovb3lm77niYc8L3RleHQ+PC9zdmc+';
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <h3 className="text-red-800 font-medium mb-2">❌ 上传失败</h3>
                <p className="text-red-700 text-sm">{result.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="text-yellow-800 font-medium mb-2">📝 使用说明</h3>
          <ul className="text-yellow-700 text-sm space-y-1">
            <li>1. 确保已登录</li>
            <li>2. 选择一个图片文件</li>
            <li>3. 点击上传按钮测试</li>
            <li>4. 检查返回的 S3 URL 是否可访问</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
