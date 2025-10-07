export const Footer = () => {
  return (
    <footer className="bg-slate-900/50 backdrop-blur-lg border-t border-slate-800 py-6">
      <div className="container mx-auto px-4 text-center">
        <p className="text-slate-400 flex items-center justify-center gap-2">
          Powered by
          <span className="font-semibold bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
            Solana
          </span>
        </p>
      </div>
    </footer>
  );
};
