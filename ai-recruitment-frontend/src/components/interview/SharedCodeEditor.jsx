import React, { useState } from 'react';
import { Play, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SharedCodeEditor({ interviewId }) {
  const [code, setCode] = useState('// Write your code here\n\n');
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' }
  ];

  const handleRun = () => {
    setOutput('Code execution simulated...\n\nOutput: Hello World!');
    toast.success('Code executed');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Code copied');
  };

  return (
    <div className="h-full bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-purple-500/20">
        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-2 bg-black/60 border border-purple-500/20 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
          >
            {languages.map(lang => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-all text-sm font-semibold flex items-center gap-2"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleRun}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all text-sm font-semibold flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Run
          </button>
        </div>
      </div>

      {/* Editor & Output */}
      <div className="flex-1 grid grid-cols-2 gap-0">
        {/* Code Editor */}
        <div className="border-r border-purple-500/20">
          <div className="bg-black/60 px-4 py-2 border-b border-purple-500/20">
            <span className="text-purple-300 text-xs font-semibold">Code Editor</span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-[calc(100%-40px)] p-4 bg-slate-900 text-white font-mono text-sm focus:outline-none resize-none"
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div>
          <div className="bg-black/60 px-4 py-2 border-b border-purple-500/20">
            <span className="text-purple-300 text-xs font-semibold">Output</span>
          </div>
          <div className="p-4 h-[calc(100%-40px)] overflow-auto">
            {output ? (
              <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                {output}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-purple-300/50 text-sm">
                Run code to see output
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
