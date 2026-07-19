import { createSSRClient } from '../../../utils/supabase/server';
import TaskForm from './TaskForm';
import TaskRow from './TaskRow';
import { Suspense } from 'react';

export const metadata = {
  title: 'Task Manager | Admin Console',
};

export default function TasksPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Global Task Manager</h1>
        <p className="text-sm text-zinc-400">Configure daily, weekly, and monthly bounties to drive engagement across the ecosystem.</p>
      </div>

      <TaskForm />

      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Configured Tasks</h2>
        <Suspense fallback={<div className="animate-pulse h-32 bg-zinc-900 rounded-xl"></div>}>
          <TaskList />
        </Suspense>
      </div>
    </div>
  );
}

async function TaskList() {
  const supabase = await createSSRClient();
  const { data: tasks, error } = await supabase
    .from('global_tasks')
    .select('*')
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false });

  if (error || !tasks) {
    return (
      <div className="p-4 border border-red-500/50 bg-red-500/10 rounded-lg">
        <p className="text-red-400 text-sm">Failed to load tasks. Verify you are an admin.</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return <p className="text-sm text-zinc-500">No tasks configured.</p>;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </div>
  );
}
