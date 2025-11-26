'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

export default function CodeBlock({ code, language = 'yaml' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden border border-gray-700 shadow-lg">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 rounded-md bg-gray-800/50 hover:bg-gray-700/80 text-gray-400 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
        aria-label="Copy code"
      >
        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
      </button>
      <SyntaxHighlighter 
        language={language} 
        style={vscDarkPlus}
        customStyle={{ margin: 0, padding: '1.5rem', borderRadius: '0.5rem', fontSize: '0.9rem' }}
        showLineNumbers={true}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
