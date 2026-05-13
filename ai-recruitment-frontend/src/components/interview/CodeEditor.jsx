import React, { useState, useRef, useEffect } from 'react';
import { Play, Save, Code2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function CodeEditor({ interviewId, questionId, onSubmit }) {
  const [code, setCode] = useState('// Write your code here\n\n');
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const editorRef = useRef(null);

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'typescript', label: 'TypeScript' }
  ];

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await api.post(`/interviews/${interviewId}/coding`, {
        interview_id: interviewId,
        question_id: questionId,
        code,
        language
      });

      toast.success('Code submitted and analyzed!');
      setOutput(JSON.stringify(response.data.analysis, null, 2));
      onSubmit?.(code);
    } catch (error) {
      toast.error('Failed to submit code');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Monitor copy-paste
  const handlePaste = (e) => {
    api.post(`/interviews/${interviewId}/events`, {
      interview_id: interviewId,
      event_type: 'copy_paste',
      event_data: { length: e.clipboardData.getData('text').length },
      severity: 'medium'
    }).catch(console.error);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Code2 className="w-5 h-5 text-purple-400" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-4 py-2 bg-black/60 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:border-purple-500"
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
            onClick={handleSubmit}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>Analyzing...</>
            ) : (
              <>
                <Play className="w-4 h-4 inline mr-2" />
                Submit & Analyze
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 grid grid-cols-2 gap-4">
        <div className="bg-slate-900 rounded-xl border border-purple-500/20 overflow-hidden">
          <div className="bg-black/60 px-4 py-2 border-b border-purple-500/20">
            <span className="text-purple-300 text-sm font-semibold">Code Editor</span>
          </div>
          <textarea
            ref={editorRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onPaste={handlePaste}
            className="w-full h-[calc(100%-40px)] p-4 bg-slate-900 text-white font-mono text-sm focus:outline-none resize-none"
            spellCheck={false}
          />
        </div>

        <div className="bg-slate-900 rounded-xl border border-purple-500/20 overflow-hidden">
          <div className="bg-black/60 px-4 py-2 border-b border-purple-500/20">
            <span className="text-purple-300 text-sm font-semibold">AI Analysis</span>
          </div>
          <div className="p-4 h-[calc(100%-40px)] overflow-auto">
            {output ? (
              <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                {output}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-purple-300/50">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                  <p>Submit code to see AI analysis</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-200">
          <strong>Note:</strong> Your coding activity is being monitored. Copy-paste actions and tab switches are tracked for fraud detection.
        </div>
      </div>
    </div>
  );
}
