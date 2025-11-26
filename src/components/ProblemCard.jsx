import Link from 'next/link';
import { ArrowRight, Code2, Layers, Server, ShieldCheck } from 'lucide-react';

const getIcon = (id) => {
  if (id.includes('auth')) return <ShieldCheck size={24} />;
  if (id.includes('terraform')) return <Layers size={24} />;
  if (id.includes('k8s')) return <Server size={24} />;
  return <Code2 size={24} />;
};

const getGradient = (id) => {
  if (id.includes('auth')) return 'from-emerald-500 to-teal-500';
  if (id.includes('terraform')) return 'from-violet-500 to-purple-500';
  if (id.includes('k8s')) return 'from-blue-500 to-cyan-500';
  return 'from-fuchsia-500 to-pink-500';
};

export default function ProblemCard({ problem }) {
  const gradient = getGradient(problem.id);
  
  return (
    <Link href={`/problems/${problem.id}`} className="block group relative bg-white dark:bg-gray-900 rounded-2xl shadow-sm hover:shadow-2xl hover:shadow-violet-500/10 transition-all duration-500 border border-gray-100 dark:border-gray-800 overflow-hidden hover:-translate-y-2 cursor-pointer">
      <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${gradient} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>
      
      <div className="p-8">
        <div className="flex items-start justify-between mb-6">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300`}>
            {getIcon(problem.id)}
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-violet-600 group-hover:to-fuchsia-600 transition-all duration-300">
          {problem.title}
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8 line-clamp-2 leading-relaxed">
          {problem.description}
        </p>
        
        <div className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
          <span>Solve Challenge</span>
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
