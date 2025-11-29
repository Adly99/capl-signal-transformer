import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, X, ChevronRight } from 'lucide-react';

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (cmd: string) => void;
  logs: string[];
}

const Terminal: React.FC<TerminalProps> = ({ isOpen, onClose, onCommand, logs }) => {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
      // Focus input after a small delay to allow transition
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, logs]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (input.trim()) {
        onCommand(input.trim());
        setInput('');
      }
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 h-64 bg-black/95 border-t border-gray-700 shadow-2xl z-50 flex flex-col font-mono text-sm transition-transform duration-300 ease-in-out">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-gray-800">
        <div className="flex items-center gap-2 text-gray-400">
          <TerminalIcon size={14} />
          <span className="font-bold text-xs uppercase tracking-wider">Console / CLI</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-700">
        <div className="text-gray-500 mb-2">CAPL Transformer CLI v1.0.0. Type 'help' for commands.</div>
        {logs.map((log, index) => (
          <div key={index} className="break-all whitespace-pre-wrap">
            {log.startsWith('>') ? (
              <span className="text-yellow-500 font-bold mr-2">{log}</span>
            ) : log.startsWith('Error:') ? (
              <span className="text-red-400">{log}</span>
            ) : log.startsWith('Success:') ? (
              <span className="text-green-400">{log}</span>
            ) : log.startsWith('Action:') ? (
              <span className="text-blue-400">{log}</span>
            ) : log.startsWith('Info:') ? (
              <span className="text-cyan-600">{log}</span>
            ) : (
              <span className="text-gray-300">{log}</span>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input Line */}
      <div className="p-3 bg-black flex items-center gap-2 border-t border-gray-800">
        <ChevronRight size={16} className="text-blue-500 animate-pulse" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-700 font-mono"
          placeholder="Type command (e.g., upload, run, download, swap)..."
          autoComplete="off"
        />
      </div>
    </div>
  );
};

export default Terminal;