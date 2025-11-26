import { problems } from '@/data/problems';
import ProblemCard from '@/components/ProblemCard';
import Navbar from '@/components/Navbar';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-200/40 via-gray-50 to-gray-50 dark:from-violet-900/20 dark:via-gray-950 dark:to-gray-950">
      <Navbar />
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 dark:from-violet-400 dark:via-fuchsia-400 dark:to-pink-400 animate-gradient-x">
              Master DevOps
            </span>
            <br />
            <span className="text-gray-900 dark:text-white">Challenges</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Level up your engineering skills with real-world scenarios in <span className="font-semibold text-violet-600 dark:text-violet-400">Ansible</span>, <span className="font-semibold text-fuchsia-600 dark:text-fuchsia-400">Terraform</span>, and <span className="font-semibold text-cyan-600 dark:text-cyan-400">Kubernetes</span>.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {problems.map((problem) => (
            <ProblemCard key={problem.id} problem={problem} />
          ))}
        </div>
      </main>
    </div>
  );
}
