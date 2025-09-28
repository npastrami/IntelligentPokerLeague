// EditorPanel.jsx
import React from "react";
import { DocumentIcon, PlayIcon } from "@heroicons/react/24/outline";
import Editor from "@monaco-editor/react";

const EditorPanel = ({
  code,
  setCode,
  runCode,
  terminalOutput,
  clearTerminal,
  currentCommand,
  setCurrentCommand,
  handleKeyPress,
}) => {
  return (
    <>
      {/* Editor Header */}
      <div className="bg-neutral-900 p-3 border-b border-neutral-600 flex items-center justify-between">
        <div className="flex items-center">
          <DocumentIcon className="h-5 w-5 text-white mr-2" />
          <span className="text-white font-medium">live_analysis.py</span>
        </div>
        <button
          onClick={runCode}
          className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-500 text-sm"
        >
          <PlayIcon className="h-4 w-4 mr-1" />
          Run
        </button>
      </div>

      {/* Monaco Editor */}
      <div className="h-[60%] border-b border-neutral-600">
        <Editor
          height="100%"
          defaultLanguage="python"
          value={code}
          onChange={(value) => setCode(value)}
          theme="vs-dark"
          options={{
            fontSize: 12,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: "on",
            lineNumbers: "on",
          }}
        />
      </div>

      {/* Interactive Terminal */}
      <div className="h-[40%] bg-black flex flex-col">
        <div className="bg-neutral-900 px-3 py-2 border-b border-neutral-600 flex items-center justify-between">
          <span className="text-white font-medium text-sm">Terminal</span>
          <button
            onClick={clearTerminal}
            className="text-neutral-400 hover:text-white text-xs"
          >
            Clear
          </button>
        </div>

        {/* Terminal Output */}
        <div className="flex-1 overflow-y-auto p-2 text-xs font-mono">
          {terminalOutput.map((output) => (
            <div key={output.id} className="mb-1">
              <span
                className={`${
                  output.type === "error"
                    ? "text-red-400"
                    : output.type === "command"
                    ? "text-green-400"
                    : output.type === "output"
                    ? "text-white"
                    : "text-neutral-300"
                }`}
              >
                {output.message}
              </span>
            </div>
          ))}
          {terminalOutput.length === 0 && (
            <div className="text-neutral-500">
              Interactive Python terminal ready. Type 'help' for commands.
            </div>
          )}
        </div>

        {/* Command Input */}
        <div className="border-t border-neutral-600 p-2">
          <div className="flex items-center text-xs font-mono">
            <span className="text-green-400 mr-2">$</span>
            <input
              type="text"
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 bg-transparent text-white outline-none"
              placeholder="Type a command..."
              autoComplete="off"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default EditorPanel;