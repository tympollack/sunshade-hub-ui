'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, LayoutDashboard, Users, CheckSquare, Sliders, ArrowLeft } from 'lucide-react';
import { AppShell, AtmosphericBadge } from '@digitalcanopy/ui';

const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Telemetry', icon: Activity, iconColor: 'text-indigo-400' },
  { href: '/admin/tasks', label: 'Task Manager', icon: CheckSquare, iconColor: 'text-emerald-400' },
  { href: '/admin/users', label: 'User Lookup', icon: Users, iconColor: 'text-amber-400' },
  { href: '/admin/library', label: 'Game Library', icon: LayoutDashboard, iconColor: 'text-orange-400' },
  { href: '/admin/flags', label: 'Feature Flags & Cards', icon: Sliders, iconColor: 'text-purple-400' },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AppShell
      testID="admin-app-shell"
      className="bg-[#0a0a0a] text-zinc-200"
      headerClassName="bg-[#111]/95 border-zinc-800"
      sidebarClassName="bg-[#111] border-zinc-800"
      mainClassName="bg-[#0a0a0a]"
      headerTitle={
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-white tracking-wider uppercase">SunShade Admin</span>
          <AtmosphericBadge label="Console" variant="core" size="sm" />
        </div>
      }
      headerRight={
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Hub</span>
        </Link>
      }
      sidebar={({ collapsed, closeMobileDrawer }) => (
        <div className="flex flex-col h-full">
          <div className={`p-4 border-b border-zinc-800 flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white shrink-0">
              <LayoutDashboard size={18} />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white tracking-wider uppercase truncate">SunShade</h1>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono truncate">Admin Console</p>
              </div>
            )}
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {!collapsed && (
              <p className="px-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 mt-2">
                Ecosystem
              </p>
            )}
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
                  onClick={closeMobileDrawer}
                  className={`flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 min-h-[40px] rounded-md transition-colors text-sm ${
                    isActive
                      ? 'bg-zinc-800 text-white font-semibold'
                      : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-white'
                  }`}
                >
                  <Icon size={16} className={`${item.iconColor} shrink-0`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-zinc-800">
            <Link
              href="/dashboard"
              title={collapsed ? 'Return to Hub' : undefined}
              onClick={closeMobileDrawer}
              className={`flex items-center ${collapsed ? 'justify-center' : 'justify-center gap-2'} min-h-[36px] text-xs text-zinc-400 hover:text-white transition-colors`}
            >
              <ArrowLeft size={14} />
              {!collapsed && <span>Return to Hub</span>}
            </Link>
          </div>
        </div>
      )}
    >
      {children}
    </AppShell>
  );
}
