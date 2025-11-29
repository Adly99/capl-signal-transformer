import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_CAPL_CODE, DEFAULT_MAPPINGS, INITIAL_MODE, NODE_CLI_TEMPLATE } from './constants';
import { TestMode, SignalMapping } from './types';
import MappingEditor from './components/MappingEditor';
import Terminal from './components/Terminal';
import ReadmeModal from './components/ReadmeModal';
import { performLocalTransformation } from './utils/transformer';
import { transformCodeWithAI } from './services/geminiService';
import Button from './components/Button';
import { 
  ArrowRight, ArrowLeft, ArrowRightLeft, Cpu, Laptop, Sparkles, 
  Copy, Check, Settings2, Upload, Download, RefreshCw, Trash2, FileText,
  Terminal as TerminalIcon, BookOpen, FileCode
} from 'lucide-react';

const App: React.FC = () => {
  const [inputCode, setInputCode] = useState(DEFAULT_CAPL_CODE);
  const [outputCode, setOutputCode] = useState("");
  const [mode, setMode] = useState<TestMode>(INITIAL_MODE);
  const [mappings, setMappings] = useState<SignalMapping[]>(DEFAULT_MAPPINGS);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [changeCount, setChangeCount] = useState<number | null>(null);
  
  // Terminal and Readme State
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isReadmeOpen, setIsReadmeOpen] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mappingInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    setTerminalLogs(prev => [...prev, message]);
  };

  // Auto-run local transformation when inputs change
  useEffect(() => {
    if (!isAiProcessing) {
      handleLocalTransform(false); // false = silent mode (no log)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputCode, mode, mappings]);

  // Global keyboard shortcut for terminal
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') {
        setIsTerminalOpen(prev => !prev);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  const handleLocalTransform = (logToTerminal = true) => {
    const result = performLocalTransformation(inputCode, mode, mappings);
    setOutputCode(result.code);
    setChangeCount(result.changes);
    if (logToTerminal) {
      addLog(`Success: Transformation complete. ${result.changes} replacements made.`);
    }
  };

  const handleAiTransform = async () => {
    setIsAiProcessing(true);
    addLog("Info: Starting AI Code Transformation...");
    try {
      const transformed = await transformCodeWithAI(inputCode, mode, mappings);
      setOutputCode(transformed);
      setChangeCount(null);
      addLog("Success: AI Transformation complete.");
    } catch (err) {
      addLog("Error: AI Transformation failed.");
      alert("AI Transformation failed. Check console.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addLog("Info: Output copied to clipboard.");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputCode(content);
        addLog(`Success: Loaded file '${file.name}' (${content.length} bytes).`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleMappingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
            setMappings(json);
            addLog(`Success: Loaded ${json.length} mappings from '${file.name}'.`);
        } else {
            addLog("Error: Invalid JSON format. Expected an array.");
        }
      } catch (err) {
        addLog("Error: Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownload = () => {
    if (!outputCode) {
      addLog("Error: No output code to download.");
      return;
    }
    const blob = new Blob([outputCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `transformed_${mode === TestMode.SIL ? 'SIL' : 'HIL'}.can`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addLog(`Success: Downloaded '${filename}'.`);
  };

  const handleExportCLI = () => {
    // Inject current mappings into the Node.js template
    const scriptContent = NODE_CLI_TEMPLATE.replace(
      '__MAPPINGS_JSON__', 
      JSON.stringify(mappings, null, 2)
    );
    
    const blob = new Blob([scriptContent], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'capl-transformer.js';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addLog("Success: Exported 'capl-transformer.js' for CI/CD usage.");
  };

  const handleClear = () => {
    setInputCode("");
    addLog("Info: Source code cleared.");
  };

  const handleSwap = () => {
    if (!outputCode) {
      addLog("Error: No output code available to swap.");
      return;
    }
    setInputCode(outputCode);
    setOutputCode("");
    const newMode = mode === TestMode.SIL ? TestMode.HIL : TestMode.SIL;
    setMode(newMode);
    addLog(`Success: Swapped Output to Source. Switched mode to ${newMode}.`);
  };

  // --- CLI Command Parser ---
  const handleCommand = (cmdStr: string) => {
    addLog(`> ${cmdStr}`);
    
    const trimmed = cmdStr.trim();
    const firstSpaceIndex = trimmed.indexOf(' ');
    
    let cmd = '';
    let arg = '';
    
    if (firstSpaceIndex === -1) {
      cmd = trimmed.toLowerCase();
    } else {
      cmd = trimmed.substring(0, firstSpaceIndex).toLowerCase();
      arg = trimmed.substring(firstSpaceIndex + 1).trim();
    }

    switch (cmd) {
      case 'help':
      case '?':
        addLog("Available commands:\n  upload [mapping] - Load file (code or json)\n  run              - Execute transform\n  download         - Save output\n  export           - Export CI/CD CLI Tool\n  swap             - Output -> Input & Switch Mode\n  mode [h/s]       - Set HIL or SIL\n  clear            - Clear source\n  docs             - Open Manual");
        break;
      case 'upload':
      case 'load':
        // Check for specific target argument (mapping vs code)
        if (arg && (arg.includes('map') || arg.includes('rule') || arg.includes('json'))) {
             addLog("Action: Opening mapping file selector (.json)...");
             mappingInputRef.current?.click();
        } else {
             // Default to code upload
             if (arg) {
                 const cleanArg = arg.replace(/^"|"$/g, '');
                 if (!cleanArg.includes('map')) {
                    addLog(`Info: Request to load code file '${cleanArg}' received.`);
                 }
                 addLog(`Info: Security restriction: Browser cannot access local paths automatically.`);
             }
             addLog("Action: Opening source code file selector...");
             fileInputRef.current?.click();
        }
        break;
      case 'run':
      case 'transform':
        handleLocalTransform(true);
        break;
      case 'download':
      case 'save':
        handleDownload();
        break;
      case 'export':
      case 'batch':
      case 'cli':
        handleExportCLI();
        break;
      case 'swap':
      case 'replace':
        handleSwap();
        break;
      case 'clear':
        handleClear();
        break;
      case 'mode':
        if (arg.toLowerCase() === 'hil' || arg.toLowerCase() === 'h') {
          setMode(TestMode.HIL);
          addLog("Info: Mode set to HIL (SysVar -> Real)");
        } else if (arg.toLowerCase() === 'sil' || arg.toLowerCase() === 's') {
          setMode(TestMode.SIL);
          addLog("Info: Mode set to SIL (Real -> SysVar)");
        } else {
          addLog("Error: Usage 'mode hil' or 'mode sil'");
        }
        break;
      case 'readme':
      case 'docs':
      case 'man':
        setIsReadmeOpen(true);
        addLog("Action: Opened documentation.");
        break;
      default:
        addLog(`Error: Unknown command '${cmd}'. Type 'help' for list.`);
    }
  };

  return (
    <div className="flex h-screen bg-black text-gray-100 overflow-hidden font-sans relative">
      
      {/* Hidden input for mapping uploads */}
      <input 
        type="file" 
        ref={mappingInputRef} 
        className="hidden" 
        accept=".json" 
        onChange={handleMappingFileUpload}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-900 z-10">
        
        {/* Header */}
        <header className="h-20 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0 z-20 shadow-md">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-2.5 rounded-xl shadow-lg">
              <Settings2 className="text-white h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">CAPL Signal Transformer</h1>
              <p className="text-xs text-gray-500 font-medium">HIL ↔ SIL Automation Tool</p>
            </div>
          </div>

          {/* Transformation Direction Viz */}
          <div className="flex flex-col items-center gap-2 hidden md:flex">
              <div className="flex items-center gap-4 text-sm font-medium">
                  <span className={`transition-colors ${mode === TestMode.SIL ? 'text-green-400' : 'text-gray-600'}`}>Real Signals</span>
                  
                  <div className="flex items-center gap-1">
                    <div className={`h-1 w-12 rounded-full transition-colors ${mode === TestMode.SIL ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
                    {mode === TestMode.SIL ? (
                        <ArrowRight className="text-blue-500 -ml-2" size={16} />
                    ) : (
                        <ArrowLeft className="text-green-500 -mr-2" size={16} />
                    )}
                    <div className={`h-1 w-12 rounded-full transition-colors ${mode === TestMode.HIL ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                  </div>

                  <span className={`transition-colors ${mode === TestMode.HIL ? 'text-blue-400' : 'text-gray-600'}`}>System Variables</span>
              </div>
          </div>

          <div className="flex gap-3">
             {/* New CI/CD Export Button */}
             <button 
               onClick={handleExportCLI}
               className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
               title="Export CI/CD Node.js Tool"
             >
                <FileCode size={18} />
                <span className="text-xs font-semibold hidden sm:inline">Export CLI</span>
             </button>

             {/* Docs Button */}
             <button 
               onClick={() => setIsReadmeOpen(true)}
               className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2"
               title="Open Manual"
             >
                <BookOpen size={18} />
                <span className="text-xs font-semibold hidden sm:inline">Docs</span>
             </button>

             {/* Mode Switcher */}
             <div className="flex bg-black p-1.5 rounded-xl border border-gray-800 shadow-inner">
                <button
                  onClick={() => { setMode(TestMode.HIL); addLog("Info: Mode changed to HIL"); }}
                  className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    mode === TestMode.HIL 
                      ? 'bg-green-700 text-white shadow-lg' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-2"><Cpu size={14} /> TARGET: HIL</span>
                </button>
                <button
                  onClick={() => { setMode(TestMode.SIL); addLog("Info: Mode changed to SIL"); }}
                  className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    mode === TestMode.SIL 
                      ? 'bg-blue-700 text-white shadow-lg' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <span className="flex items-center gap-2"><Laptop size={14} /> TARGET: SIL</span>
                </button>
             </div>
          </div>
        </header>

        {/* Code Editors Container */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Input Panel */}
          <div className="flex-1 flex flex-col border-r border-gray-800 min-w-0 group">
            <div className="px-4 py-2 bg-gray-800 flex justify-between items-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-700">
              <span className="flex items-center gap-2 text-gray-400 group-focus-within:text-blue-400 transition-colors">
                <FileText size={14} />
                Source CAPL Code
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleClear}
                  className="p-1 hover:bg-red-900/30 hover:text-red-400 rounded transition-colors text-gray-500"
                  title="Clear Code"
                >
                  <Trash2 size={14} />
                </button>
                <div className="h-4 w-px bg-gray-700 mx-1"></div>
                <label className="flex items-center gap-2 cursor-pointer bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded transition-colors" title="Upload .can, .cin, .txt">
                  <Upload size={12} />
                  <span className="text-[10px] normal-case">Upload File</span>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".can,.cin,.txt,.cpp" 
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>
            <textarea
              className="flex-1 bg-[#1e1e1e] text-gray-300 p-4 font-mono text-sm resize-none focus:outline-none focus:bg-[#252525] transition-colors border-0 leading-6"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              spellCheck={false}
              placeholder="// Paste your CAPL code here or Upload a file..."
            />
          </div>

          {/* Output Panel */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e] relative group">
            <div className="px-4 py-2 bg-gray-800 flex justify-between items-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-700">
              <span className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${mode === TestMode.SIL ? 'bg-blue-500' : 'bg-green-500'} animate-pulse`}></div>
                Transformed Output
              </span>
              <div className="flex items-center gap-2">
                 {changeCount !== null && (
                   <span className="text-blue-300 normal-case bg-blue-900/40 border border-blue-800 px-2 py-0.5 rounded flex items-center gap-1 mr-2">
                     <ArrowRightLeft size={10} />
                     {changeCount} replacements
                   </span>
                 )}
                 
                 <button 
                    onClick={handleSwap} 
                    disabled={!outputCode}
                    className="flex items-center gap-1.5 bg-gray-700 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-gray-700 text-white px-2 py-1 rounded transition-colors"
                    title="Move Output to Source & Switch Mode"
                 >
                    <RefreshCw size={12} />
                    <span className="text-[10px] normal-case">Swap</span>
                 </button>

                 <div className="h-4 w-px bg-gray-700 mx-1"></div>

                 <button 
                    onClick={handleDownload}
                    disabled={!outputCode}
                    className="text-gray-400 hover:text-white disabled:opacity-30 transition-colors p-1" 
                    title="Download Result"
                 >
                    <Download size={14} />
                 </button>

                 <button 
                    onClick={copyToClipboard} 
                    disabled={!outputCode}
                    className="text-gray-400 hover:text-white disabled:opacity-30 transition-colors p-1" 
                    title="Copy to Clipboard"
                 >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                 </button>
              </div>
            </div>
            <textarea
              className={`flex-1 bg-[#151515] p-4 font-mono text-sm resize-none focus:outline-none border-0 leading-6 ${mode === TestMode.SIL ? 'text-blue-100' : 'text-green-100'}`}
              value={outputCode}
              readOnly
              spellCheck={false}
              placeholder="// Transformed code will appear here..."
            />
            
            {/* AI Floating Button */}
            <div className="absolute bottom-6 right-6 z-10">
               <Button 
                 onClick={handleAiTransform} 
                 isLoading={isAiProcessing}
                 variant="secondary"
                 className="shadow-2xl border border-purple-500/30 hover:border-purple-500/80 !bg-gray-900/80 backdrop-blur-md !text-purple-300 hover:!bg-gray-900 hover:!text-purple-200 transition-all transform hover:scale-105"
                 icon={<Sparkles size={16} />}
               >
                 Smart AI Refactor
               </Button>
            </div>
          </div>

        </div>

        {/* Terminal Toggle Button (Floating or fixed bottom) */}
        {!isTerminalOpen && (
          <button 
            onClick={() => setIsTerminalOpen(true)}
            className="absolute bottom-0 left-0 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 px-3 py-1 text-xs font-mono rounded-tr-lg border-t border-r border-gray-700 flex items-center gap-2 z-20"
          >
            <TerminalIcon size={12} />
            Terminal (~)
          </button>
        )}
      </div>

      {/* Right Sidebar */}
      <MappingEditor 
        mappings={mappings} 
        setMappings={setMappings} 
        currentCode={inputCode}
      />

      {/* Terminal Overlay */}
      <Terminal 
        isOpen={isTerminalOpen} 
        onClose={() => setIsTerminalOpen(false)} 
        onCommand={handleCommand}
        logs={terminalLogs}
      />

      {/* Readme Modal */}
      <ReadmeModal 
        isOpen={isReadmeOpen}
        onClose={() => setIsReadmeOpen(false)}
      />

    </div>
  );
};

export default App;