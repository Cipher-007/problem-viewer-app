import { problems } from '@/data/problems';
import Navbar from '@/components/Navbar';
import CodeBlock from '@/components/CodeBlock';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, BookOpen, Terminal, CheckCircle2, PlayCircle, Lightbulb } from 'lucide-react';

export function generateStaticParams() {
  return problems.map((problem) => ({
    id: problem.id,
  }));
}

export default async function ProblemPage({ params }) {
  const { id } = await params;
  const problem = problems.find((p) => p.id === id);

  if (!problem) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Problem Not Found</h1>
          <Link href="/" className="text-violet-600 hover:underline">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-100/40 via-gray-50 to-gray-50 dark:from-violet-900/10 dark:via-gray-950 dark:to-gray-950">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 mb-10 transition-colors group font-medium"
        >
          <div className="p-1 rounded-full bg-gray-200 dark:bg-gray-800 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors">
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> 
          </div>
          Back to Challenges
        </Link>
        
        <div className="space-y-10">
          {/* Header */}
          <div className="relative">
            <div className="absolute -left-4 -top-4 w-20 h-20 bg-violet-500/10 rounded-full blur-2xl"></div>
            <h1 className="relative text-4xl md:text-5xl font-black mb-6 text-gray-900 dark:text-white tracking-tight">
              {problem.title}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl">
              {problem.description}
            </p>
          </div>

          {/* Problem Statement */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30 px-8 py-5 flex items-center gap-3">
              <div className="p-2 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-lg text-fuchsia-600 dark:text-fuchsia-400">
                <BookOpen size={20} />
              </div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">Problem Statement</h2>
            </div>
            <div className="p-8 prose prose-lg dark:prose-invert max-w-none whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-loose">
              {problem.statement}
            </div>
          </div>

          {/* Solution */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30 px-8 py-5 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={20} />
              </div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">Solution Files</h2>
            </div>
            <div className="p-8 space-y-10">
              {Object.entries(problem.solution).map(([filename, code]) => {
                const extension = filename.split('.').pop();
                let language = 'yaml';
                if (extension === 'js') language = 'javascript';
                if (extension === 'tf') language = 'hcl';
                if (extension === 'Dockerfile') language = 'dockerfile';
                if (extension === 'py') language = 'python';
                if (extension === 'go') language = 'go';
                
                return (
                  <div key={filename} className="space-y-4">
                    <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <Terminal size={16} className="text-violet-500" />
                      {filename}
                    </div>
                    <CodeBlock code={code} language={language} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* How to Run */}
          {problem.howToRun && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30 px-8 py-5 flex items-center gap-3">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg text-cyan-600 dark:text-cyan-400">
                  <PlayCircle size={20} />
                </div>
                <h2 className="font-bold text-lg text-gray-900 dark:text-white">How to Run</h2>
              </div>
              <div className="p-8 prose prose-lg dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 leading-loose">
                <ReactMarkdown
                  components={{
                    code({node, inline, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || '')
                      return !inline && match ? (
                        <CodeBlock code={String(children).replace(/\n$/, '')} language={match[1]} />
                      ) : (
                        <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-fuchsia-600 dark:text-fuchsia-400" {...props}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {problem.howToRun}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Explanation */}
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-8 md:p-10 shadow-xl shadow-violet-500/20 text-white">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Lightbulb size={24} className="text-yellow-300" />
                </div>
                <h2 className="text-2xl font-bold">Explanation</h2>
              </div>
              <p className="text-violet-100 text-lg leading-relaxed opacity-90">{problem.explanation}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
