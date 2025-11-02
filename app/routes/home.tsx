import { useState } from "react";
import type { Route } from "./+types/home";
import { Header } from "~/components/header";
import { Wrapper } from "~/components/wrapper";
import { ProgressStepper } from "~/components/progress-stepper";
import { Content } from "~/components/content";
import { VideoUpload } from "~/components/video-upload";
import { GenerationStep } from "~/components/generation-step";
import { CustomizeExport } from "~/components/customize-export";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ThumbCapAI" },
    {
      name: "description",
      content: "Create thumbnail for your content in minutes!",
    },
  ];
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1);
  const [videoData, setVideoData] = useState<any>(null);
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  const handleVideoUpload = (data: any) => {
    setVideoData(data);
    setCurrentStep(2);
  };

  const handleGeneration = (content: any) => {
    setGeneratedContent(content);
    setCurrentStep(3);
  };

  const resetApp = () => {
    setCurrentStep(1);
    setVideoData(null);
    setGeneratedContent(null);
  };
  return (
    <div className="min-h-screen">
      <Header />
      <Wrapper>
        <ProgressStepper currentStep={currentStep} />
        <Content>
          {currentStep === 1 && <VideoUpload onUpload={handleVideoUpload} />}
          {currentStep === 2 && videoData && (
            <GenerationStep
              videoData={videoData}
              onGenerate={handleGeneration}
              onBack={() => setCurrentStep(1)}
            />
          )}

          {currentStep === 3 && generatedContent && (
            <CustomizeExport
              content={generatedContent}
              videoData={videoData}
              onReset={resetApp}
            />
          )}
        </Content>
      </Wrapper>
    </div>
  );
}
