import { useState, useEffect } from "react";
import { Sparkles, ChevronLeft, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Progress } from "./ui/progress";

interface GenerationStepProps {
  videoData: any;
  onGenerate: (content: any) => void;
  onBack: () => void;
}

export function GenerationStep({
  videoData,
  onGenerate,
  onBack,
}: GenerationStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState("");

  const tasks = [
    { label: "Extracting key frames...", duration: 1500 },
    { label: "Analyzing emotions & faces...", duration: 2000 },
    { label: "Transcribing audio...", duration: 2500 },
    { label: "Generating thumbnail variants...", duration: 2000 },
    { label: "Crafting SEO captions...", duration: 1500 },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);

    let totalTime = 0;
    const totalDuration = tasks.reduce((acc, task) => acc + task.duration, 0);

    for (let i = 0; i < tasks.length; i++) {
      setCurrentTask(tasks[i].label);

      await new Promise((resolve) => setTimeout(resolve, tasks[i].duration));

      totalTime += tasks[i].duration;
      setProgress((totalTime / totalDuration) * 100);
    }

    // Simulate generated content
    const mockContent = {
      thumbnails: [
        {
          id: 1,
          style: "Vibrant Highlight",
          imageUrl:
            "https://images.unsplash.com/photo-1758524943377-9fcc8b1fb1d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxleGNpdGVkJTIwcGVyc29uJTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NjE4OTMzOTB8MA&ixlib=rb-4.1.0&q=80&w=1080",
          predicted_ctr: 8.2,
        },
        {
          id: 2,
          style: "Minimalist Clean",
          imageUrl:
            "https://images.unsplash.com/photo-1658274474930-bb27a64022c2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsYXB0b3AlMjBjb2RpbmclMjBzY3JlZW58ZW58MXx8fHwxNzYxODE3MjkzfDA&ixlib=rb-4.1.0&q=80&w=1080",
          predicted_ctr: 7.8,
        },
        {
          id: 3,
          style: "Neon Glow",
          imageUrl:
            "https://images.unsplash.com/photo-1610642436394-81749134ffe8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZW9uJTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NjE4OTMzOTB8MA&ixlib=rb-4.1.0&q=80&w=1080",
          predicted_ctr: 9.1,
        },
        {
          id: 4,
          style: "Professional",
          imageUrl:
            "https://images.unsplash.com/photo-1746021375246-7dc8ab0583f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b3Jrc3BhY2V8ZW58MXx8fHwxNzYxODI2MTUwfDA&ixlib=rb-4.1.0&q=80&w=1080",
          predicted_ctr: 7.5,
        },
        {
          id: 5,
          style: "Dramatic",
          imageUrl:
            "https://images.unsplash.com/photo-1545317690-31b00be407fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkcmFtYXRpYyUyMGNvbXB1dGVyfGVufDF8fHx8MTc2MTg5MzM5MXww&ixlib=rb-4.1.0&q=80&w=1080",
          predicted_ctr: 8.7,
        },
      ],
      captions: [
        {
          id: 1,
          text: "🚀 Build AI Apps in Minutes with Google Cloud | Complete Guide for Beginners",
          seo_score: 92,
          emoji: true,
        },
        {
          id: 2,
          text: "Google Cloud AI Tutorial: Transform Your App Development Workflow",
          seo_score: 88,
          emoji: false,
        },
        {
          id: 3,
          text: "You Won't Believe How Easy AI Development Is Now! 🤯 Google Cloud Magic",
          seo_score: 85,
          emoji: true,
        },
      ],
    };

    setTimeout(() => {
      onGenerate(mockContent);
    }, 500);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-6">
        <ChevronLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="text-center mb-8">
        <h2 className="text-3xl mb-3">AI Generation</h2>
        <p className="text-gray-600">
          Our AI is analyzing your video:{" "}
          <span className="font-medium">{videoData.title}</span>
        </p>
      </div>

      <Card className="p-8 mb-6">
        <div className="space-y-8">
          {/* Video Preview */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-32 h-20 bg-gradient-to-br from-purple-400 to-blue-400 rounded flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{videoData.title}</p>
              <p className="text-sm text-gray-500">
                Duration: {videoData.duration}
              </p>
            </div>
          </div>

          {/* Generation Options */}
          {!isGenerating && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Thumbnails</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ 5 AI-generated variants</li>
                  <li>✓ Multiple style options</li>
                  <li>✓ CTR prediction scoring</li>
                  <li>✓ A/B test recommendations</li>
                </ul>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Captions</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✓ 3 optimized options</li>
                  <li>✓ SEO keyword integration</li>
                  <li>✓ Emoji variants</li>
                  <li>✓ Hook-based formatting</li>
                </ul>
              </div>
            </div>
          )}

          {/* Generation Progress */}
          {isGenerating && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <p className="text-sm text-gray-600 mb-4">{currentTask}</p>
                <Progress value={progress} className="max-w-md mx-auto" />
                <p className="text-xs text-gray-500 mt-2">
                  {Math.round(progress)}% complete
                </p>
              </div>
            </div>
          )}

          {/* Action Button */}
          {!isGenerating && (
            <Button onClick={handleGenerate} size="lg" className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Thumbnails & Captions
            </Button>
          )}
        </div>
      </Card>

      {/* Tech Stack Info */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
        <h4 className="text-sm font-medium mb-3">
          Powered by Google Cloud Services:
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-3 rounded">Vision AI</div>
          <div className="bg-white p-3 rounded">Speech-to-Text</div>
          <div className="bg-white p-3 rounded">Vertex AI</div>
          <div className="bg-white p-3 rounded">Cloud Storage</div>
        </div>
      </div>
    </div>
  );
}
