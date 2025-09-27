import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { FolderIcon, DocumentIcon, PlusIcon, PlayIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

export default function MonacoEditor() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [code, setCode] = useState('// Welcome to the Poker Bot Editor\n// Start coding your poker bot here!\n\nclass PokerBot {\n  constructor(name) {\n    this.name = name;\n  }\n\n  makeDecision(gameState) {\n    // Your bot logic here\n    return "call";\n  }\n}\n\nexport default PokerBot;')
  const [showNewFileModal, setShowNewFileModal] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [selectedFolder, setSelectedFolder] = useState('MyProjects')

  const fileStructure = {
    MyProjects: [
      { name: 'AggressiveBot.js', type: 'file' },
      { name: 'ConservativeBot.js', type: 'file' },
    ],
    Samples: [
      { name: 'BasicBot.js', type: 'file' },
      { name: 'RandomBot.js', type: 'file' },
      { name: 'GTOBot.js', type: 'file' },
    ],
    Team: [
      { name: 'SharedStrategy.js', type: 'file' },
      { name: 'TeamBot_v2.js', type: 'file' },
    ]
  }

  const handleSave = () => {
    console.log('Saving file:', selectedFile, code)
    // TODO: Save to backend
  }

  const handleRun = () => {
    console.log('Running bot:', code)
    // TODO: Send to game engine for testing
  }

  const createNewFile = () => {
    if (newFileName) {
      console.log('Creating file:', newFileName, 'in', selectedFolder)
      setShowNewFileModal(false)
      setNewFileName('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-red-900">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">File Explorer</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {Object.entries(fileStructure).map(([folder, files]) => (
              <div key={folder} className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center text-white font-medium">
                    <FolderIcon className="h-4 w-4 mr-2 text-blue-400" />
                    {folder}
                  </div>
                  {folder === 'MyProjects' && (
                    <button
                      onClick={() => {
                        setSelectedFolder(folder)
                        setShowNewFileModal(true)
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="ml-4 space-y-1">
                  {files.map((file) => (
                    <button
                      key={file.name}
                      onClick={() => setSelectedFile(`${folder}/${file.name}`)}
                      className={`flex items-center w-full text-left px-2 py-1 rounded text-sm ${
                        selectedFile === `${folder}/${file.name}`
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <DocumentIcon className="h-4 w-4 mr-2" />
                      {file.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Editor */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="bg-slate-800 border-b border-slate-700 p-3 flex items-center justify-between">
            <div className="text-white font-medium">
              {selectedFile || 'No file selected'}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-500"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                Save
              </button>
              <button
                onClick={handleRun}
                className="flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                <PlayIcon className="h-4 w-4 mr-1" />
                Test Bot
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              value={code}
              onChange={(value) => setCode(value)}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
        </div>
      </div>

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 w-96">
            <h3 className="text-lg font-semibold text-white mb-4">Create New File</h3>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="filename.js"
              className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowNewFileModal(false)}
                className="px-4 py-2 text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={createNewFile}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}