import { useState } from "react";
import {
  Download,
  Share2,
  Edit3,
  Copy,
  CheckCircle2,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";

interface CustomizeExportProps {
  content: any;
  videoData: any;
  onReset: () => void;
}

export function CustomizeExport({
  content,
  videoData,
  onReset,
}: CustomizeExportProps) {
  const [selectedThumbnail, setSelectedThumbnail] = useState(
    content.thumbnails[0]
  );
  const [selectedCaption, setSelectedCaption] = useState(content.captions[0]);
  const [customCaption, setCustomCaption] = useState(selectedCaption.text);
  const [overlayText, setOverlayText] = useState("");
  const [showOverlay, setShowOverlay] = useState(false);

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(customCaption);
    toast.success("Caption copied to clipboard!");
  };

  const handleDownload = () => {
    toast.success("Thumbnail downloaded as PNG!");
  };

  const handleYouTubeUpload = () => {
    toast.success("Opening YouTube upload... (Demo mode)");
  };

  const handleExportJSON = () => {
    const exportData = {
      video: videoData,
      thumbnail: selectedThumbnail,
      caption: customCaption,
      analytics: {
        predicted_ctr: selectedThumbnail.predicted_ctr,
        seo_score: selectedCaption.seo_score,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "thumbcap-export.json";
    a.click();

    toast.success("Exported as JSON!");
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mb-4">
          <CheckCircle2 className="w-5 h-5" />
          <span>Generation Complete!</span>
        </div>
        <h2 className="text-3xl mb-3">Customize & Export</h2>
        <p className="text-gray-600">
          Fine-tune your thumbnail and caption, then export or publish directly
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Main Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Thumbnail Preview */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Selected Thumbnail</h3>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {selectedThumbnail.predicted_ctr}% CTR
                </Badge>
                <Badge>{selectedThumbnail.style}</Badge>
              </div>
            </div>

            <div className="relative group">
              <img
                src={selectedThumbnail.imageUrl}
                alt={selectedThumbnail.style}
                className="w-full aspect-video object-cover rounded-lg"
              />

              {showOverlay && overlayText && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/80 text-white px-8 py-4 rounded-lg text-2xl font-bold">
                    {overlayText}
                  </div>
                </div>
              )}

              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowOverlay(!showOverlay)}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  {showOverlay ? "Hide" : "Add"} Text
                </Button>
              </div>
            </div>

            {showOverlay && (
              <div className="mt-4">
                <label className="block text-sm mb-2">Overlay Text</label>
                <input
                  type="text"
                  value={overlayText}
                  onChange={(e) => setOverlayText(e.target.value)}
                  placeholder="Enter text to overlay on thumbnail..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            )}
          </Card>

          {/* Caption Editor */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Caption</h3>
              <Badge variant="secondary" className="gap-1">
                SEO: {selectedCaption.seo_score}/100
              </Badge>
            </div>

            <Textarea
              value={customCaption}
              onChange={(e) => setCustomCaption(e.target.value)}
              rows={3}
              className="mb-4"
            />

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyCaption}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              <div className="text-xs text-gray-500">
                {customCaption.length} characters
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleDownload} size="lg">
              <Download className="w-4 h-4 mr-2" />
              Download PNG
            </Button>
            <Button onClick={handleYouTubeUpload} variant="secondary" size="lg">
              <Share2 className="w-4 h-4 mr-2" />
              Upload to YouTube
            </Button>
            <Button onClick={handleExportJSON} variant="outline" size="lg">
              Export JSON
            </Button>
            <Button onClick={onReset} variant="ghost" size="lg">
              Start Over
            </Button>
          </div>
        </div>

        {/* Variants Sidebar */}
        <div className="space-y-6">
          {/* Thumbnail Variants */}
          <Card className="p-4">
            <h3 className="font-medium mb-4">Thumbnail Variants</h3>
            <div className="space-y-3">
              {content.thumbnails.map((thumb: any) => (
                <div
                  key={thumb.id}
                  className={`cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                    selectedThumbnail.id === thumb.id
                      ? "border-purple-500 ring-2 ring-purple-200"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedThumbnail(thumb)}
                >
                  <img
                    src={thumb.imageUrl}
                    alt={thumb.style}
                    className="w-full aspect-video object-cover"
                  />
                  <div className="p-2 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">{thumb.style}</p>
                      <span className="text-xs text-gray-500">
                        {thumb.predicted_ctr}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Caption Variants */}
          <Card className="p-4">
            <h3 className="font-medium mb-4">Caption Options</h3>
            <div className="space-y-3">
              {content.captions.map((caption: any) => (
                <div
                  key={caption.id}
                  className={`cursor-pointer p-3 border-2 rounded-lg transition-all ${
                    selectedCaption.id === caption.id
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => {
                    setSelectedCaption(caption);
                    setCustomCaption(caption.text);
                  }}
                >
                  <p className="text-xs mb-2 line-clamp-3">{caption.text}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      SEO: {caption.seo_score}
                    </Badge>
                    {caption.emoji && (
                      <Badge variant="outline" className="text-xs">
                        + Emoji
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* A/B Test Suggestion */}
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-sm mb-1">Smart Remix Tip</h4>
                <p className="text-xs text-gray-600 mb-3">
                  Try A/B testing the "Neon Glow" thumbnail with the emoji
                  caption for maximum engagement!
                </p>
                <Button size="sm" variant="outline" className="text-xs h-7">
                  Learn More
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
