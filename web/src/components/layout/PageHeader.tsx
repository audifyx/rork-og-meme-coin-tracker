import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional small uppercase label above the title */
  eyebrow?: string;
  /** Optional leading icon component (e.g. a lucide icon) */
  icon?: React.ComponentType<{ className?: string }>;
  children?: ReactNode;
  showBack?: boolean;
  backTo?: string; // explicit back destination, defaults to browser history
}

export const PageHeader = ({ title, description, eyebrow, icon: Icon, children, showBack = true, backTo }: PageHeaderProps) => {
  const navigate = useNavigate();
  const handleBack = () => {
    if (backTo) navigate(backTo);
    else navigate(-1);
  };
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-background/70 backdrop-blur-2xl">
      {/* premium ambient sheen */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(620px 120px at 50% -40%, hsl(var(--og-lime)/0.10), transparent 70%), radial-gradient(520px 120px at 85% -60%, hsl(var(--og-cyan)/0.08), transparent 70%)",
        }}
      />
      <div className="relative px-4 py-4 lg:px-6">
        <div className="flex items-center justify-center">
          {showBack && (
            <button
              onClick={handleBack}
              className="absolute left-4 lg:left-6 flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
              {backTo && <span className="hidden text-[11px] font-semibold sm:inline">Back</span>}
            </button>
          )}
          <div className="flex flex-col items-center text-center">
            {eyebrow && (
              <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">{eyebrow}</span>
            )}
            <div className="flex items-center gap-2.5">
              {Icon && (
                <span className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-og-lime shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                  <Icon className="h-4 w-4" />
                </span>
              )}
              <h1 className="gradient-text text-xl font-black tracking-tight lg:text-2xl">{title}</h1>
            </div>
            {/* accent underline */}
            <span className="mt-2 h-[2px] w-12 rounded-full bg-gradient-to-r from-og-lime/0 via-og-lime/70 to-og-cyan/0" />
            {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
          </div>
          {children && <div className="absolute right-4 flex items-center gap-2 lg:right-6">{children}</div>}
        </div>
      </div>
    </header>
  );
};
