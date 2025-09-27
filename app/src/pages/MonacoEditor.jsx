import { useState, useEffect, useRef } from 'react'

export default function MonacoEditor() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [code, setCode] = useState('// Welcome to the Poker Bot Editor\n// Start coding your poker bot here!\n\nclass PokerBot {\n  constructor(name) {\n    this.name = name;\n  }\n\n  makeDecision(gameState) {\n    // Your bot logic here\n    return "call";\n  }\n}\n\nexport default PokerBot;')
  const [showNewFileModal, setShowNewFileModal] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [selectedFolder, setSelectedFolder] = useState('MyProjects')
  const [fileStructure, setFileStructure] = useState({
    folders: ['MyProjects', 'Examples'],
    files: ['bot1.js', 'bot2.py', 'example.wls']
  })
  const textareaRef = useRef(null)

  const fetchFileStructure = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/list-files/', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch files');

      const data = await response.json();
      console.log('Fetched file structure:', data);
      setFileStructure(data); 

    } catch (error) {
      console.error('Error fetching file structure:', error);
    }
  };

  useEffect(() => {
    fetchFileStructure(); 
  }, []);

  const handleSave = async () => {
    if (!selectedFile) {
      alert("Please select a file to save.");
      return;
    }

    const filename = selectedFile.split('/').pop();

    const payload = {
      filename: filename,
      content: code,
    };

    try {
      const response = await fetch('http://localhost:8000/api/save-file/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to save file. Try again.');

      const data = await response.json();
      console.log('File saved successfully:', data);
      alert('File saved successfully!');
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Error saving file. Please try again.');
    }
  };

  const handleRun = () => {
    console.log('Running bot:', code)
    alert('Running bot simulation...')
  }

  const uploadFile = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.py,.wls,.js';

    fileInput.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) {
        alert('Please select a file. Make sure it is a .wls, .py, or .js file.');
        return;
      }

      const allowedExtensions = ['.py', '.wls', '.js'];
      const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

      if (!allowedExtensions.includes(extension)) {
        alert('Unsupported file type. Please upload a .wls, .py, or .js file');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('http://localhost:8000/api/upload-file/', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('File upload failed. Please try again.');
        }

        const data = await response.json();
        console.log('Upload Successful:', data);

        if (data.content) {
          setCode(data.content);
          setSelectedFile(`Uploaded/${file.name}`);
          
          // Refresh file list after upload
          await fetchFileStructure();
        }
        alert('File uploaded successfully!');
      } catch (error) {
        console.error('Upload error:', error);
        alert('An error occurred while uploading. Please try again');
      }
    };

    fileInput.click(); 
  };

  const createNewFile = async () => {
    if (newFileName.trim()) {
      console.log('Creating file:', newFileName, 'in', selectedFolder);
      const token = localStorage.getItem('token');

      try {

        const response = await fetch('http://localhost:8000/api/poker/create-file/', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            filename: newFileName
          }),
        });

        if (!response.ok) throw new Error('Failed to create file on server');

        const data = await response.json();
        console.log('File created on server:', data);

        // Refresh file structure from server
        await fetchFileStructure();
        
        // Set as selected file and set default content
        setSelectedFile(`${selectedFolder}/${newFileName}`);
        setCode('// New file\n');
        setShowNewFileModal(false);
        setNewFileName('');
        
        alert('File created successfully!');
      } catch (error) {
        console.error('Error creating file:', error);
        alert('Error creating file. Please try again.');
      }
    }
  };

  const loadFileContent = async (filePath) => {
    try {
      const filename = filePath.split('/').pop();
      const response = await fetch(`http://localhost:8000/api/load-file/${filename}/`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to load file');

      const data = await response.json();
      setCode(data.content || '// File content could not be loaded');
    } catch (error) {
      console.error('Error loading file:', error);
      setCode('// Error loading file content');
    }
  };

  const handleFileSelect = (filePath) => {
    setSelectedFile(filePath);
    loadFileContent(filePath);
  };

  // Get file extension for syntax highlighting
  const getFileExtension = (filename) => {
    if (!filename) return 'text';
    const ext = filename.split('.').pop().toLowerCase();
    return ext;
  };

  // Handle Tab key for indentation
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const value = e.target.value;
      
      // Insert tab character
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      setCode(newValue);
      
      // Set cursor position
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Simple syntax highlighting function
  const highlightSyntax = (text, extension) => {
    if (!text) return '';
    
    let highlighted = text;
    
    // Keywords for different languages
    const keywords = {
      js: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'constructor', 'import', 'export', 'default'],
      py: ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'return', 'import', 'from', 'try', 'except', 'with', 'as'],
      wls: ['Module', 'Function', 'If', 'While', 'For', 'Return', 'Block']
    };
    
    const currentKeywords = keywords[extension] || keywords.js;
    
    // Apply basic syntax highlighting (this is simplified)
    currentKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      highlighted = highlighted.replace(regex, `<span class="text-blue-400 font-semibold">${keyword}</span>`);
    });
    
    // Highlight strings
    highlighted = highlighted.replace(/(["'])((?:(?!\1)[^\\]|\\.)*)(\1)/g, '<span class="text-green-300">$1$2$3</span>');
    
    // Highlight comments
    highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="text-gray-400 italic">$1</span>');
    highlighted = highlighted.replace(/(#.*$)/gm, '<span class="text-gray-400 italic">$1</span>');
    
    return highlighted;
  };

  // Simple SVG icons as inline components
  const FolderIcon = () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  )

  const DocumentIcon = () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )

  const PlusIcon = () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )

  const PlayIcon = () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M6 20l4-16 4 16H6z" />
    </svg>
  )

  const SaveIcon = () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  )

  const UploadIcon = () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-red-900">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">File Explorer</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {fileStructure.folders && fileStructure.folders.length > 0 ? (
              fileStructure.folders.map((folder) => (
                <div key={folder} className="p-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center text-white font-medium">
                      <span className="mr-2 text-blue-400"><FolderIcon /></span>
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
                        <PlusIcon />
                      </button>
                    )}
                  </div>
                  <div className="ml-4 space-y-1">
                    {fileStructure.files && fileStructure.files.map((file) => (
                      <button
                        key={file}
                        onClick={() => handleFileSelect(`${folder}/${file}`)}
                        className={`flex items-center w-full text-left px-2 py-1 rounded text-sm ${
                          selectedFile === `${folder}/${file}`
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <span className="mr-2"><DocumentIcon /></span>
                        {file}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-slate-400 text-center">
                Loading files...
              </div>
            )}
          </div>
        </div>

        {/* Main Editor */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="bg-slate-800 border-b border-slate-700 p-3 flex items-center justify-between">
            <div className="text-white font-medium">
              {selectedFile || 'No file selected'}
              {selectedFile && (
                <span className="ml-2 text-xs text-gray-400">
                  {getFileExtension(selectedFile.split('/').pop())}
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-500 transition-colors"
              >
                <span className="mr-1"><SaveIcon /></span>
                Save
              </button>
              <button
                onClick={handleRun}
                className="flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
              >
                <span className="mr-1"><PlayIcon /></span>
                Test Bot
              </button>
              <button
                onClick={uploadFile}
                className="flex items-center px-3 py-1 bg-red-600 text-white rounded hover:bg-red-500 transition-colors"
              >
                <span className="mr-1"><UploadIcon /></span>
                Load Code 
              </button>
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 bg-gray-900 relative">
            <div className="absolute inset-0 flex">
              {/* Line numbers */}
              <div className="bg-gray-800 text-gray-500 text-xs p-4 border-r border-gray-700 select-none">
                {code.split('\n').map((_, index) => (
                  <div key={index} className="leading-6 text-right pr-2" style={{minWidth: '30px'}}>
                    {index + 1}
                  </div>
                ))}
              </div>
              
              {/* Code editor */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full h-full bg-transparent text-green-400 font-mono text-sm p-4 border-none outline-none resize-none absolute inset-0 z-10"
                  style={{
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    tabSize: 2,
                    lineHeight: '1.5',
                    color: 'transparent',
                    caretColor: '#4ade80'
                  }}
                  spellCheck={false}
                />
                
                {/* Syntax highlighting overlay */}
                <div 
                  className="w-full h-full font-mono text-sm p-4 pointer-events-none absolute inset-0 z-0 overflow-hidden whitespace-pre-wrap break-words"
                  style={{
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    lineHeight: '1.5'
                  }}
                  dangerouslySetInnerHTML={{
                    __html: highlightSyntax(code, getFileExtension(selectedFile?.split('/').pop()))
                  }}
                />
              </div>
            </div>
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
              onKeyPress={(e) => e.key === 'Enter' && createNewFile()}
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowNewFileModal(false)}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createNewFile}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
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