'use client';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export function LoadingOverlay({ visible, message = 'Aguarde…' }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/50 backdrop-blur-[2px] transition-opacity duration-150">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#d0dae8] border-t-[#3a9fd8]" />
        <span className="text-xs font-medium tracking-wide text-gray-400">{message}</span>
      </div>
    </div>
  );
}
