'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  gameName: string;
}

interface State {
  hasError: boolean;
  errorMsg: string | null;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMsg: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[Hub Error] ${this.props.gameName} Widget Crashed:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[160px] p-6 border border-red-500/30 dark:border-red-500/20 bg-red-50 dark:bg-red-950/20 rounded-xl flex flex-col items-center justify-center text-center">
          <h3 className="text-red-600 dark:text-red-400 font-semibold mb-2">
            {this.props.gameName} is currently unavailable.
          </h3>
          <p className="text-xs text-red-500/80 mb-4 max-w-xs line-clamp-2">
            {this.state.errorMsg || 'An unexpected error occurred while loading this widget.'}
          </p>
          <button 
            onClick={() => this.setState({ hasError: false, errorMsg: null })}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCcw size={14} />
            Retry Connection
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
