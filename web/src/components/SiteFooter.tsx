export const SiteFooter = () => {
  return (
    <footer className="relative border-t border-og-grid bg-og-ink">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-display text-4xl font-bold text-og-gold text-glow-gold">ogscan.fun</div>
            <div className="mt-2 max-w-md text-xs uppercase tracking-widest text-muted-foreground">
              not financial advice. degens only. powered by jupiter, birdeye, helius & alchemy.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <a href="https://jup.ag" target="_blank" rel="noreferrer" className="hover:text-og-lime">Jupiter</a>
            <a href="https://birdeye.so" target="_blank" rel="noreferrer" className="hover:text-og-lime">Birdeye</a>
            <a href="https://helius.dev" target="_blank" rel="noreferrer" className="hover:text-og-lime">Helius</a>
            <a href="https://alchemy.com" target="_blank" rel="noreferrer" className="hover:text-og-lime">Alchemy</a>
          </div>
        </div>
        <div className="mt-10 border-t border-og-grid pt-4 text-center text-[9px] uppercase tracking-[0.5em] text-muted-foreground">
          © {new Date().getFullYear()} · ogscan.fun · BUILT ON SOLANA
        </div>
      </div>
    </footer>
  );
};
