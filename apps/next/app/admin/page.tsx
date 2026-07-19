import { createSSRClient } from '../../utils/supabase/server';
import { Suspense } from 'react';
import TelemetryLive from './TelemetryLive';
import { Network, ArrowUpRight, ArrowDownRight, Database } from 'lucide-react';

export const metadata = {
  title: 'Telemetry | Admin Console',
};

export default function AdminTelemetryPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 border-b border-zinc-800 pb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Ecosystem Telemetry</h1>
        <p className="text-sm text-zinc-400">Bird's-eye view of network health, game engagement, and token velocity.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <TelemetryLive />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <Suspense fallback={<div className="animate-pulse h-32 bg-zinc-900 rounded-xl"></div>}>
            <TokenVelocity />
          </Suspense>
          <Suspense fallback={<div className="animate-pulse h-32 bg-zinc-900 rounded-xl"></div>}>
            <EdgeNetworkStatus />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function TokenVelocity() {
  const supabase = await createSSRClient();
  
  // Calculate minted (positive) vs spent (negative) in the last 24 hours
  // We can do this in SQL normally, but for Next.js RSC we can just query and aggregate
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const { data: transactions, error: txError } = await supabase
    .from('token_ledger')
    .select('amount')
    .gte('created_at', yesterday.toISOString());

  let minted = 0;
  let spent = 0;

  if (txError) {
    console.error('Failed to fetch token ledger:', txError);
  } else if (transactions) {
    transactions.forEach(t => {
      if (t.amount > 0) minted += t.amount;
      else spent += Math.abs(t.amount);
    });
  }

  return (
    <div className="bg-[#111] border border-zinc-800 p-6 rounded-xl">
      <div className="flex items-center gap-2 mb-6">
        <Database size={18} className="text-zinc-500" />
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">24H Token Velocity</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-[#0a0a0a] rounded-lg border border-zinc-900">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight size={16} className="text-emerald-500" />
            <p className="text-xs text-zinc-500 font-semibold uppercase">Minted</p>
          </div>
          <p className="text-2xl font-mono text-white">{minted.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-[#0a0a0a] rounded-lg border border-zinc-900">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownRight size={16} className="text-rose-500" />
            <p className="text-xs text-zinc-500 font-semibold uppercase">Spent/Burned</p>
          </div>
          <p className="text-2xl font-mono text-white">{spent.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

async function EdgeNetworkStatus() {
  const supabase = await createSSRClient();
  
  const { data: nodes, error: nodeError } = await supabase
    .from('edge_nodes')
    .select('status, id');

  if (nodeError) {
    console.error('Failed to fetch edge nodes:', nodeError);
  }

  const online = nodes?.filter(n => n.status === 'online').length || 0;
  const degraded = nodes?.filter(n => n.status === 'degraded').length || 0;
  const offline = nodes?.filter(n => n.status === 'offline').length || 0;

  return (
    <div className="bg-[#111] border border-zinc-800 p-6 rounded-xl">
      <div className="flex items-center gap-2 mb-6">
        <Network size={18} className="text-zinc-500" />
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Edge Routing Status</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-emerald-400">{online}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Online</p>
        </div>
        <div className="text-center border-x border-zinc-800">
          <p className="text-3xl font-bold text-amber-400">{degraded}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Degraded</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-rose-400">{offline}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Offline</p>
        </div>
      </div>
    </div>
  );
}
