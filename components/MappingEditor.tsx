import React, { useState, useEffect } from 'react';
import { SignalMapping } from '../types';
import { MAPPING_PRESETS } from '../constants';
import Button from './Button';
import { Plus, Trash2, Wand2, Download, Upload, Code, List, FileJson, CheckCircle, AlertCircle } from 'lucide-react';
import { generateMappingsFromCode } from '../services/geminiService';

interface MappingEditorProps {
  mappings: SignalMapping[];
  setMappings: (m: SignalMapping[]) => void;
  currentCode: string;
}

const MappingEditor: React.FC<MappingEditorProps> = ({ mappings, setMappings, currentCode }) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'json'>('list');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Sync JSON text when mappings change (if not currently editing JSON)
  useEffect(() => {
    if (viewMode === 'list') {
      setJsonText(JSON.stringify(mappings, null, 2));
      setJsonError(null);
    }
  }, [mappings, viewMode]);

  const getNextId = (list: SignalMapping[]) => {
    const maxId = list.reduce((max, m) => {
      const num = parseInt(m.id, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    return (maxId + 1).toString();
  };

  const handleAdd = () => {
    setMappings([
      ...mappings,
      { id: getNextId(mappings), realSignal: '', simSignal: '', description: '' }
    ]);
  };

  const handleRemove = (id: string) => {
    setMappings(mappings.filter(m => m.id !== id));
  };

  const handleChange = (id: string, field: keyof SignalMapping, value: string) => {
    setMappings(mappings.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleJsonChange = (val: string) => {
    setJsonText(val);
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        setMappings(parsed);
        setJsonError(null);
      } else {
        setJsonError("Root must be an array");
      }
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  const handleAiSuggest = async () => {
    setIsAiLoading(true);
    const suggestions = await generateMappingsFromCode(currentCode);
    if (suggestions.length > 0) {
      // Calculate start ID for new items
      let currentMaxId = mappings.reduce((max, m) => {
        const num = parseInt(m.id, 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);

      const newMappings = [...mappings];
      suggestions.forEach(s => {
        if (!newMappings.some(e => e.realSignal === s.realSignal)) {
          currentMaxId++;
          // Overwrite AI's random ID with incremental ID
          newMappings.push({ ...s, id: currentMaxId.toString() });
        }
      });
      setMappings(newMappings);
    }
    setIsAiLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
            setMappings(json);
        } else {
            alert("Invalid JSON format. Expected an array.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(mappings, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "capl_mapping.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-700 w-full md:w-96 shrink-0 transition-all shadow-xl z-20">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex flex-col gap-3 bg-gray-850">
        <div className="flex justify-between items-center">
            <h2 className="font-semibold text-gray-200 flex items-center gap-2">
                <FileJson size={18} className="text-blue-400" />
                <span>Mapping Rules</span>
            </h2>
            <div className="flex gap-1 bg-gray-800 rounded p-1">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    title="List View"
                >
                    <List size={16} />
                </button>
                <button 
                    onClick={() => setViewMode('json')}
                    className={`p-1.5 rounded transition-colors ${viewMode === 'json' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    title="JSON Editor"
                >
                    <Code size={16} />
                </button>
            </div>
        </div>
        
        {/* Toolbar */}
        <div className="flex justify-between items-center text-xs">
             <div className="flex items-center gap-2">
                <span className="text-gray-500">Presets:</span>
                <select 
                    className="bg-gray-800 text-gray-300 border border-gray-700 rounded px-2 py-1 outline-none focus:border-blue-500"
                    onChange={(e) => {
                        if (MAPPING_PRESETS[e.target.value]) {
                            setMappings(MAPPING_PRESETS[e.target.value]);
                        }
                    }}
                    defaultValue=""
                >
                    <option value="" disabled>Load...</option>
                    {Object.keys(MAPPING_PRESETS).map(key => (
                        <option key={key} value={key}>{key}</option>
                    ))}
                </select>
             </div>
             <div className="flex gap-2">
                <label className="cursor-pointer text-gray-400 hover:text-white transition-colors" title="Import JSON">
                    <Upload size={16} />
                    <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
                </label>
                <button onClick={handleDownload} className="text-gray-400 hover:text-white transition-colors" title="Export JSON">
                    <Download size={16} />
                </button>
             </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#1a1a1a]">
        
        {viewMode === 'json' ? (
            <div className="h-full flex flex-col">
                <div className={`text-xs mb-2 flex items-center gap-2 ${jsonError ? 'text-red-400' : 'text-green-400'}`}>
                    {jsonError ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                    {jsonError ? "Invalid JSON" : "Valid Configuration"}
                </div>
                <textarea 
                    className={`w-full h-full bg-[#111] font-mono text-xs p-3 rounded border resize-none focus:outline-none focus:ring-1 ${jsonError ? 'border-red-500 focus:ring-red-500 text-red-100' : 'border-gray-700 focus:ring-blue-500 text-blue-100'}`}
                    value={jsonText}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    spellCheck={false}
                />
            </div>
        ) : (
            <div className="space-y-3">
                {mappings.length === 0 && (
                <div className="text-center text-gray-500 py-10 text-sm border-2 border-dashed border-gray-800 rounded-lg">
                    No active mappings.<br/>Add manual, load preset,<br/>or use AI Scan.
                </div>
                )}
                {mappings.map((m) => (
                <div key={m.id} className="bg-gray-800/50 p-3 rounded border border-gray-700 group relative hover:border-blue-500/30 transition-colors">
                    <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-1">
                      <span className="text-[10px] text-gray-500 font-mono tracking-tighter">ID: {m.id}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mb-2">
                      <div>
                          <div className="flex justify-between mb-1">
                              <label className="text-[10px] uppercase text-green-500/70 font-bold tracking-wider">HIL (Real)</label>
                          </div>
                          <input 
                          className="w-full bg-gray-900 text-green-400 text-xs p-2 rounded border border-gray-700 focus:border-green-500/50 outline-none font-mono placeholder-gray-700"
                          value={m.realSignal}
                          placeholder="$Signal"
                          onChange={(e) => handleChange(m.id, 'realSignal', e.target.value)}
                          />
                      </div>
                      <div>
                          <div className="flex justify-between mb-1">
                              <label className="text-[10px] uppercase text-blue-500/70 font-bold tracking-wider">SIL (SysVar)</label>
                          </div>
                          <input 
                          className="w-full bg-gray-900 text-blue-400 text-xs p-2 rounded border border-gray-700 focus:border-blue-500/50 outline-none font-mono placeholder-gray-700"
                          value={m.simSignal}
                          placeholder="sysvar::Namespace::Var"
                          onChange={(e) => handleChange(m.id, 'simSignal', e.target.value)}
                          />
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-800/50">
                      <label className="text-[10px] uppercase text-gray-500 font-bold tracking-wider mb-1 block">Description</label>
                      <input 
                        className="w-full bg-gray-900 text-gray-300 text-xs p-2 rounded border border-gray-700 focus:border-gray-500/50 outline-none placeholder-gray-600"
                        value={m.description || ''}
                        placeholder="Rule description..."
                        onChange={(e) => handleChange(m.id, 'description', e.target.value)}
                      />
                    </div>

                    <button 
                    onClick={() => handleRemove(m.id)}
                    className="absolute top-2 right-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove Rule"
                    >
                    <Trash2 size={14} />
                    </button>
                </div>
                ))}
            </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-700 bg-gray-850 flex flex-col gap-2">
        {viewMode === 'list' && (
            <Button variant="secondary" size="sm" onClick={handleAdd} icon={<Plus size={16} />} className="w-full bg-gray-800 hover:bg-gray-700">
            Add Empty Mapping
            </Button>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleAiSuggest} 
          isLoading={isAiLoading}
          icon={<Wand2 size={16} />} 
          className="w-full text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 border border-purple-900/30"
        >
          AI Scan & Suggest
        </Button>
      </div>
    </div>
  );
};

export default MappingEditor;