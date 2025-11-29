import React from 'react';
import { X, Download, FileText } from 'lucide-react';
import { README_CONTENT } from '../constants';
import Button from './Button';

interface ReadmeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReadmeModal: React.FC<ReadmeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleDownloadReadme = () => {
    const blob = new Blob([README_CONTENT], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'CAPL_Transformer_Manual.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#252525] rounded-t-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="text-blue-400" size={20} />
            Documentation & Manual
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 text-gray-300 leading-relaxed font-sans">
          <div className="prose prose-invert prose-sm max-w-none">
            {README_CONTENT.split('\n').map((line, i) => {
              if (line.startsWith('## ')) {
                return <h3 key={i} className="text-lg font-bold text-white mt-6 mb-3 pb-1 border-b border-gray-700">{line.replace('## ', '')}</h3>;
              }
              if (line.startsWith('# ')) {
                return <h1 key={i} className="text-2xl font-bold text-blue-400 mb-4">{line.replace('# ', '')}</h1>;
              }
              if (line.startsWith('### ')) {
                return <h4 key={i} className="text-md font-semibold text-gray-200 mt-4 mb-2">{line.replace('### ', '')}</h4>;
              }
              if (line.startsWith('- ')) {
                return <li key={i} className="ml-4 list-disc text-gray-400 mb-1">{line.replace('- ', '')}</li>;
              }
              if (line.startsWith('```')) {
                 return <div key={i} className="text-xs text-gray-500 my-1">{line.replace(/```/g, '')}</div>
              }
              // Basic highlighting for code blocks roughly
              if (line.trim().startsWith('node ') || line.trim().startsWith('sh ')) {
                 return <div key={i} className="bg-black/50 p-2 font-mono text-xs text-green-400 rounded border border-gray-800 my-1">{line}</div>;
              }
              if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ') || line.startsWith('4. ')) {
                 return <div key={i} className="font-bold text-blue-300 mt-3">{line}</div>;
              }
              if (line.trim() === '') return <br key={i} />;
              return <p key={i} className="mb-1">{line}</p>;
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-[#252525] rounded-b-xl flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={handleDownloadReadme} icon={<Download size={16} />}>
            Download Manual
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReadmeModal;