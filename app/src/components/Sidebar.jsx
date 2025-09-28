// Sidebar.jsx
import React, { useState } from "react";
import { CodeBracketIcon, ChartBarIcon, XMarkIcon } from "@heroicons/react/24/outline";
import EditorPanel from "./EditorPanel";
import AnalysisPanel from "./AnalysisPanel";

const Sidebar = ({
  code,
  setCode,
  runCode,
  showEditor,
  setShowEditor,
  terminalOutput,
  clearTerminal,
  currentCommand,
  setCurrentCommand,
  handleKeyPress,
  // Analysis panel props (add as needed)
  analysisData,
  setAnalysisData,
}) => {
  const [activeTab, setActiveTab] = useState("editor");

  if (!showEditor) return null;

  return (
    <div className="w-[30%] bg-neutral-800 border-l border-neutral-600 flex flex-col">
      {/* Tab Navigation */}
      <div className="bg-neutral-900 border-b border-neutral-600">
        <div className="flex">
          <button
            onClick={() => setActiveTab("editor")}
            className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "editor"
                ? "text-white border-blue-500 bg-neutral-800"
                : "text-neutral-400 border-transparent hover:text-white hover:bg-neutral-800"
            }`}
          >
            <CodeBracketIcon className="h-4 w-4 mr-2" />
            Editor
          </button>
          <button
            onClick={() => setActiveTab("analysis")}
            className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "analysis"
                ? "text-white border-blue-500 bg-neutral-800"
                : "text-neutral-400 border-transparent hover:text-white hover:bg-neutral-800"
            }`}
          >
            <ChartBarIcon className="h-4 w-4 mr-2" />
            Analysis
          </button>
        </div>
        
        {/* Close Button */}
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setShowEditor(false)}
            className="text-neutral-400 hover:text-white"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col">
        {activeTab === "editor" && (
          <EditorPanel
            code={code}
            setCode={setCode}
            runCode={runCode}
            terminalOutput={terminalOutput}
            clearTerminal={clearTerminal}
            currentCommand={currentCommand}
            setCurrentCommand={setCurrentCommand}
            handleKeyPress={handleKeyPress}
          />
        )}
        
        {activeTab === "analysis" && (
          <AnalysisPanel
            analysisData={analysisData}
            setAnalysisData={setAnalysisData}
            // Add other analysis-related props as needed
          />
        )}
      </div>
    </div>
  );
};

export default Sidebar;