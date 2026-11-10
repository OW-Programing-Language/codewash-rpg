import React from 'react';

/**
 * Full-screen startup loading overlay with a real percentage bar.
 * Rendered immediately on first paint so the app feels instant while the heavy
 * theme/background art preloads (see utils/assetPreloader.js).
 */
const LoadingScreen = ({ progress = 0, label = 'Loading' }) => {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0f172a] text-slate-200"
      style={{ fontFamily: '"VT323", monospace' }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <h1 className="text-6xl md:text-7xl text-yellow-400 uppercase tracking-widest drop-shadow-[4px_4px_0_#000] mb-10">
        Level Up!
      </h1>

      <div className="w-72 md:w-96 h-6 bg-slate-800 rounded-full border-2 border-slate-600 overflow-hidden shadow-lg">
        <div
          className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-4 text-2xl tracking-widest text-slate-400">
        {label}… <span className="text-yellow-400 font-bold">{pct}%</span>
      </p>
    </div>
  );
};

export default LoadingScreen;
