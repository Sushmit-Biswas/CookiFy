import React from 'react';

interface DemoModeNoticeProps {
  show: boolean;
  onDismiss?: () => void;
}

const DemoModeNotice: React.FC<DemoModeNoticeProps> = ({ show, onDismiss }) => {
  if (!show) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-xl shadow-2xl border border-blue-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-sm">🧪</span>
            </div>
            <div>
              <h4 className="font-bold text-sm">Demo Mode Active</h4>
              <p className="text-xs opacity-90">Using sample data - API not configured</p>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-xs transition-colors"
            >
              ×
            </button>
          )}
        </div>
        <div className="mt-2 text-xs opacity-80">
          You can still explore all features including the Cooking Path functionality!
        </div>
      </div>
    </div>
  );
};

export default DemoModeNotice;