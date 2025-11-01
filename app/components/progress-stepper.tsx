export function ProgressStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="max-w-3xl mx-auto mb-12">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
          <div
            className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500"
            style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
          />
        </div>

        {/* Step 1 */}
        <div className="flex flex-col items-center gap-2 relative z-10">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              currentStep >= 1
                ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white"
                : "bg-gray-200 text-gray-400"
            }`}
          >
            1
          </div>
          <span className="text-sm">Upload</span>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col items-center gap-2 relative z-10">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              currentStep >= 2
                ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white"
                : "bg-gray-200 text-gray-400"
            }`}
          >
            2
          </div>
          <span className="text-sm">Generate</span>
        </div>

        {/* Step 3 */}
        <div className="flex flex-col items-center gap-2 relative z-10">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              currentStep >= 3
                ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white"
                : "bg-gray-200 text-gray-400"
            }`}
          >
            3
          </div>
          <span className="text-sm">Customize</span>
        </div>
      </div>
    </div>
  );
}
