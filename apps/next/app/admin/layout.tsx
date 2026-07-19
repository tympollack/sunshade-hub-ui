import Link from 'next/link';
import { Activity, LayoutDashboard, Users, CheckSquare } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-zinc-300 font-sans">
      {/* Dense Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-[#111] flex flex-col shrink-0">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white">
            <LayoutDashboard size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wider uppercase">SunShade</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Admin Console</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="px-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 mt-4">Ecosystem</p>
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-800/50 hover:text-white transition-colors group text-sm">
            <Activity size={16} className="text-indigo-400 group-hover:text-indigo-300" />
            Telemetry
          </Link>
          <Link href="/admin/tasks" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-800/50 hover:text-white transition-colors group text-sm">
            <CheckSquare size={16} className="text-emerald-400 group-hover:text-emerald-300" />
            Task Manager
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-800/50 hover:text-white transition-colors group text-sm">
            <Users size={16} className="text-amber-400 group-hover:text-amber-300" />
            User Lookup
          </Link>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-white transition-colors block text-center">
            Return to Hub
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        {children}
      </main>
    </div>
  );
}
