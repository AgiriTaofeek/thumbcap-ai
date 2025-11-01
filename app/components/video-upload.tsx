import { useState } from "react";
import { Upload, Link, Video } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card } from "./ui/card";

interface VideoUploadProps {
  onUpload: (data: any) => void;
}

export function VideoUpload({ onUpload }: VideoUploadProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("video/")) {
      setSelectedFile(file);
    }
  };

  const handleYoutubeSubmit = async () => {
    if (youtubeUrl) {
      try {
        // For demo, we'll use mock data but in production this would call the backend
        onUpload({
          type: "youtube",
          url: youtubeUrl,
          title: "How to Build Amazing Apps with AI",
          duration: "5:23",
        });
      } catch (error) {
        console.error("Upload error:", error);
        alert("Failed to process YouTube URL. Please try again.");
      }
    }
  };

  const handleFileSubmit = () => {
    if (selectedFile) {
      // For demo, we'll use mock data but in production this would upload to backend
      onUpload({
        type: "file",
        file: selectedFile,
        title: selectedFile.name.replace(/\.[^/.]+$/, ""),
        duration: "3:45",
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl mb-3">Upload Your Video</h2>
        <p className="text-gray-600">
          Upload a video file or paste a YouTube URL to get started
        </p>
      </div>

      <Tabs defaultValue="file" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="file" className="gap-2">
            <Upload className="w-4 h-4" />
            Upload File
          </TabsTrigger>
          <TabsTrigger value="youtube" className="gap-2">
            <Link className="w-4 h-4" />
            YouTube URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file">
          <Card className="p-8">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Video className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={handleFileSubmit} size="lg">
                      Continue
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedFile(null)}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                    <Upload className="w-8 h-8 text-purple-600" />
                  </div>
                  <div>
                    <p className="mb-2">Drag and drop your video here, or</p>
                    <label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button variant="outline" asChild>
                        <span className="cursor-pointer">Browse Files</span>
                      </Button>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Supports MP4, MOV, AVI (Max 100MB for hackathon demo)
                  </p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="youtube">
          <Card className="p-8">
            <div className="space-y-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <Video className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <label htmlFor="youtube-url" className="block text-sm mb-2">
                  YouTube Video URL
                </label>
                <Input
                  id="youtube-url"
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="mb-4"
                />
              </div>
              <Button
                onClick={handleYoutubeSubmit}
                disabled={!youtubeUrl}
                size="lg"
                className="w-full"
              >
                Analyze Video
              </Button>
              <p className="text-xs text-gray-500 text-center">
                We'll extract metadata using YouTube Data API
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stats Banner */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 text-center">
          <p className="text-2xl mb-1">80%</p>
          <p className="text-sm text-gray-600">of views from thumbnails</p>
        </Card>
        <Card className="p-6 text-center">
          <p className="text-2xl mb-1">&lt;30s</p>
          <p className="text-sm text-gray-600">generation time</p>
        </Card>
        <Card className="p-6 text-center">
          <p className="text-2xl mb-1">5x</p>
          <p className="text-sm text-gray-600">faster than manual</p>
        </Card>
      </div>
    </div>
  );
}
