'use client';

export const DemoModeBanner = () => {
  return (
    <div className="bg-yellow-500/20 border-2 border-yellow-500 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-center gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="text-center">
          <p className="font-bold text-yellow-400 text-lg">DEMO MODE</p>
          <p className="text-sm text-yellow-300">
            Using simulated transactions - no real SOL transferred
          </p>
        </div>
      </div>
    </div>
  );
};
