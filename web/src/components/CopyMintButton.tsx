import { useCallback, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { copyTextToClipboard, shortAddr } from "@/lib/og";

type CopyMintButtonProps = {
  mint: string | null | undefined;
  label?: string;
  copiedLabel?: string;
  className?: string;
  iconClassName?: string;
  stopPropagation?: boolean;
};

export const CopyMintButton = ({
  mint,
  label = "copy CA",
  copiedLabel = "copied",
  className,
  iconClassName,
  stopPropagation = true,
}: CopyMintButtonProps) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    if (stopPropagation) event.stopPropagation();
    const cleanMint: string = mint?.trim() ?? "";
    if (!cleanMint) return;

    void copyTextToClipboard(cleanMint).then((didCopy: boolean) => {
      if (didCopy) {
        setCopied(true);
        toast.success("CA copied", { description: shortAddr(cleanMint, 8) });
        window.setTimeout(() => setCopied(false), 1300);
        return;
      }

      window.prompt("Copy this contract address:", cleanMint);
    });
  }, [mint, stopPropagation]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>): void => {
    if (stopPropagation) event.stopPropagation();
  }, [stopPropagation]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      onKeyDown={handleKeyDown}
      disabled={!mint}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 border border-og-grid px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-widest text-foreground/70 transition hover:border-og-lime hover:text-og-lime disabled:cursor-not-allowed disabled:opacity-40",
        copied && "border-og-lime bg-og-lime/10 text-og-lime",
        className,
      )}
      aria-label={mint ? `Copy contract address ${shortAddr(mint, 6)}` : "Copy contract address"}
    >
      {copied ? <Check className={cn("h-3.5 w-3.5", iconClassName)} /> : <Copy className={cn("h-3.5 w-3.5", iconClassName)} />}
      {copied ? copiedLabel : label}
    </button>
  );
};
