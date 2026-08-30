'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Megaphone,
  Hexagon,
  Server,
  ShieldCheck,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import type { HubNotification } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: HubNotification[];
  readIds: Set<string>;
  onMarkAllAsRead: () => void;
  onDismissNotification: (id: string) => void;
  onNavigateView?: (view: string) => void;
}

export function NotificationsModal({
  isOpen,
  onClose,
  notifications,
  readIds,
  onMarkAllAsRead,
  onDismissNotification,
  onNavigateView,
}: NotificationsModalProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'announcement' | 'reward' | 'node' | 'security'>('all');

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((notif) => {
    if (activeFilter === 'all') return true;
    return notif.category === activeFilter;
  });

  const countAnnouncements = notifications.filter((n) => n.category === 'announcement').length;
  const countRewards = notifications.filter((n) => n.category === 'reward').length;
  const countNodes = notifications.filter((n) => n.category === 'node').length;

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'announcement':
        return <Megaphone size={16} className="text-orange-500" />;
      case 'reward':
        return <Hexagon size={16} className="text-amber-500" />;
      case 'node':
        return <Server size={16} className="text-emerald-500" />;
      case 'security':
        return <ShieldCheck size={16} className="text-blue-500" />;
      default:
        return <Bell size={16} className="text-zinc-400" />;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'announcement':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      case 'reward':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'node':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'security':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Fixed Standard Height & Width Modal Container */}
      <div className="bg-white dark:bg-[#161616] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl h-[560px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
              <Bell size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="notifications-title" className="font-bold text-zinc-900 dark:text-white text-lg">
                  System Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Ecosystem broadcasts, reward distributions & node health
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-500 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck size={14} />
                <span className="hidden sm:inline">Mark read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Close notifications"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Category Tabs with Dynamic Counts */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/40 overflow-x-auto text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setActiveFilter('announcement')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeFilter === 'announcement'
                ? 'bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
          >
            Announcements ({countAnnouncements})
          </button>
          <button
            onClick={() => setActiveFilter('reward')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeFilter === 'reward'
                ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
          >
            Rewards & HT ({countRewards})
          </button>
          <button
            onClick={() => setActiveFilter('node')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeFilter === 'node'
                ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
          >
            Nodes & Cluster ({countNodes})
          </button>
        </div>

        {/* Notifications List Container with Custom Themed Scrollbar */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0">
          {filteredNotifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800/60 flex items-center justify-center mx-auto text-zinc-400">
                <Bell size={20} />
              </div>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No notifications here</p>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                You are all caught up on system updates, token distributions, and edge node events.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isRead = readIds.has(notif.id);
              return (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-xl transition-colors relative group ${
                    isRead
                      ? 'bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/40'
                      : 'bg-orange-500/[0.04] dark:bg-orange-500/[0.07] border border-orange-500/20 hover:bg-orange-500/[0.09]'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/70 shrink-0 mt-0.5">
                      {getCategoryIcon(notif.category)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">
                            {notif.title}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getCategoryBadgeClass(
                              notif.category
                            )}`}
                          >
                            {notif.category}
                          </span>
                          {!isRead && (
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" title="Unread" />
                          )}
                        </div>

                        <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                          {new Date(notif.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        {notif.action_label && (
                          <button
                            onClick={() => {
                              onClose();
                              if (notif.category === 'announcement') onNavigateView?.('Game Library');
                              else if (notif.category === 'node') onNavigateView?.('Edge Nodes');
                              else if (notif.category === 'reward') onNavigateView?.('Profile');
                            }}
                            className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-500 flex items-center gap-1"
                          >
                            {notif.action_label} <ChevronRight size={12} />
                          </button>
                        )}

                        <button
                          onClick={() => onDismissNotification(notif.id)}
                          className="text-zinc-400 hover:text-rose-500 text-[11px] ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Dismiss notification"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 text-center text-[11px] text-zinc-400 shrink-0">
          SunShade Ecosystem Sentinel • Real-Time Alert Mesh
        </div>
      </div>
    </div>
  );
}
