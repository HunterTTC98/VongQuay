import React, { useEffect } from 'react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  Ticket as TicketIcon,
  HelpCircle,
  PartyPopper,
  Flame,
  ArrowRight,
} from 'lucide-react';

export type StatusPopupType =
  | 'spins_exhausted'
  | 'spin_result'
  | 'error'
  | 'warning'
  | 'success'
  | 'info';

export interface StatusPopupData {
  isOpen: boolean;
  type: StatusPopupType;
  title: string;
  message?: string;
  subMessage?: string;
  slotName?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

interface StatusPopupModalProps {
  popup: StatusPopupData;
  onClose: () => void;
}

export const StatusPopupModal: React.FC<StatusPopupModalProps> = ({ popup, onClose }) => {
  useEffect(() => {
    if (!popup.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [popup.isOpen, onClose]);

  if (!popup.isOpen) return null;

  const getHeaderIcon = () => {
    switch (popup.type) {
      case 'spins_exhausted':
        return (
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-inner border border-amber-300">
            <Sparkles className="w-7 h-7 animate-pulse" />
          </div>
        );
      case 'spin_result':
        return (
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shadow-inner border border-rose-300">
            <PartyPopper className="w-7 h-7 text-rose-600 animate-bounce" />
          </div>
        );
      case 'success':
        return (
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner border border-emerald-300">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
        );
      case 'warning':
      case 'error':
        return (
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shadow-inner border border-rose-300">
            <AlertTriangle className="w-7 h-7 text-rose-600" />
          </div>
        );
      default:
        return (
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-inner border border-blue-300">
            <HelpCircle className="w-7 h-7 text-blue-600" />
          </div>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center border border-amber-200/80 relative animate-scale-up">
        {/* Quick Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
          aria-label="Đóng popup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Visual Icon */}
        <div className="flex justify-center mb-3.5">{getHeaderIcon()}</div>

        {/* Title */}
        <h3 className="text-lg font-black text-gray-900 tracking-tight mb-2">
          {popup.title}
        </h3>

        {/* Slot Name Highlight for spin results */}
        {popup.slotName && (
          <div className="my-3 py-2 px-3 bg-amber-50 rounded-2xl border border-amber-200 font-black text-amber-900 text-base">
            {popup.slotName}
          </div>
        )}

        {/* Concise Message */}
        {popup.message && (
          <p className="text-sm text-gray-600 leading-relaxed font-medium mb-1">
            {popup.message}
          </p>
        )}

        {popup.subMessage && (
          <p className="text-xs text-gray-600 font-medium mb-4">{popup.subMessage}</p>
        )}

        {/* Action Buttons */}
        <div className="mt-5 space-y-2">
          {popup.actionLabel && popup.onAction && (
            <button
              type="button"
              onClick={() => {
                popup.onAction?.();
                onClose();
              }}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-sm shadow-md shadow-red-500/20 active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              <span>{popup.actionLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {popup.secondaryLabel && popup.onSecondary ? (
            <button
              type="button"
              onClick={() => {
                popup.onSecondary?.();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition active:scale-95"
            >
              {popup.secondaryLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs border border-gray-200 transition active:scale-95"
            >
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
