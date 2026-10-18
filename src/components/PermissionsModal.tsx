import React, { useState } from 'react';
import { ShieldAlert, Video, Check, Layers } from 'lucide-react';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasOverlayPermission: boolean;
  hasMediaPermission: boolean;
  onGrantOverlay: () => void;
  onGrantMedia: () => void;
  onStartService: () => void;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onClose,
  hasOverlayPermission,
  hasMediaPermission,
  onGrantOverlay,
  onGrantMedia,
  onStartService
}) => {
  const [step, setStep] = useState<1 | 2>(hasOverlayPermission ? 2 : 1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl space-y-4">
        {step === 1 && !hasOverlayPermission ? (
          <>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Display Over Other Apps</h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Android requires explicit user permission (<code className="text-purple-300">SYSTEM_ALERT_WINDOW</code>) for
                Floating Buddy to display above your home screen, browser, and games.
              </p>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-300">Allow display over other apps</span>
              <button
                onClick={() => {
                  onGrantOverlay();
                  setStep(2);
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow"
              >
                Grant Permission
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Start Screen Capture?</h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Floating Buddy uses <code className="text-sky-300">MediaProjection</code> to snap what's on screen when you double-tap
                the slime, analyzing it via OpenRouter Vision AI.
              </p>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700 text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-white">Android System Confirmation:</p>
              <p className="text-slate-400 text-[11px]">
                "Floating Buddy AI will have access to all of the information that is visible on your screen."
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  onGrantMedia();
                  onStartService();
                  onClose();
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-xl transition-all shadow"
              >
                Start now
              </button>
              <button
                onClick={() => {
                  onStartService();
                  onClose();
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium py-2.5 px-4 rounded-xl border border-slate-700"
              >
                Without Screen Capture
              </button>
            </div>
          </>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white px-2 py-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
