import { useState, ChangeEvent } from "react";
import NextImage from "next/image";
import {
  Upload,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";

type UploadResult = {
  success: boolean;
  url: string;
  metadata: {
    originalSize: number;
    optimizedSize: number;
    compressionRatio: string;
  };
  message?: string;
};

export default function ImageUploadTester() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("mainImage", file);

    try {
      const response = await fetch("/api/upload-room-image", {
        method: "POST",
        body: formData,
      });

      const data: UploadResult = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.message || "Upload failed");
      }
    } catch (err) {
      if (err instanceof Error) setError("Network error: " + err.message);
      else setError("Network error: " + String(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <ImageIcon className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-800">
              Image Upload Tester
            </h1>
          </div>

          {/* File Input */}
          <div className="mb-6">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Select Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          {/* File Info */}
          {file && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Info className="w-5 h-5" />
                Original File Info
              </h3>
              <div className="space-y-1 text-sm text-blue-800">
                <p>
                  <strong>Name:</strong> {file.name}
                </p>
                <p>
                  <strong>Type:</strong> {file.type}
                </p>
                <p>
                  <strong>Size:</strong> {formatBytes(file.size)}
                </p>
              </div>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-2">Preview</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex justify-center">
                <NextImage
                  src={preview}
                  alt="Preview"
                  width={800}
                  height={600}
                  className="max-h-64 rounded-lg shadow-md"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    console.log(
                      `Original dimensions: ${img.naturalWidth}x${img.naturalHeight}`
                    );
                  }}
                />
              </div>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Uploading & Optimizing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload & Optimize
              </>
            )}
          </button>

          {/* Upload Result */}
          {result && (
            <div className="mt-6 p-6 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="font-bold text-green-900 text-lg">
                  Upload Successful!
                </h3>
              </div>

              <div className="space-y-3">
                {/* Optimization Results */}
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">
                    Optimization Results
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Original Size:</p>
                      <p className="font-bold text-gray-900">
                        {formatBytes(result.metadata.originalSize)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Optimized Size:</p>
                      <p className="font-bold text-green-600">
                        {formatBytes(result.metadata.optimizedSize)}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-600">Compression:</p>
                      <p className="font-bold text-indigo-600 text-lg">
                        {result.metadata.compressionRatio} reduction
                      </p>
                    </div>
                  </div>
                </div>

                {/* Uploaded Image */}
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">
                    Uploaded Image
                  </h4>
                  <NextImage
                    src={result.url}
                    alt="Uploaded"
                    width={800}
                    height={600}
                    className="w-full rounded-lg shadow-md"
                  />
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
                  >
                    Open in new tab →
                  </a>
                </div>

                {/* Image URL */}
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">
                    Image URL
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={result.url}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm font-mono bg-gray-50"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(result.url);
                        alert("URL copied to clipboard!");
                      }}
                      className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-sm font-semibold"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200 flex items-start gap-2">
              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Upload Failed</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-2">Testing Tips</h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>
                Try uploading large images (2MB+) to see compression in action
              </li>
              <li>Test with different formats: JPEG, PNG, WebP</li>
              <li>Check browser console for dimension logs</li>
              <li>Try uploading files over 10MB to test size limit</li>
              <li>Test with non-image files to verify validation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
