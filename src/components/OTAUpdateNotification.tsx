import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, DownloadCloud, CheckCircle2, AlertCircle, RefreshCw, X, FileText, ArrowRight } from 'lucide-react';
import { otaManager, OTAUpdateState, OTAManifest } from '../utils/otaManager';

interface OTAUpdateNotificationProps {
  language: 'en' | 'sw';
}

export const OTAUpdateNotification: React.FC<OTAUpdateNotificationProps> = ({ language }) => {
  const [otaState, setOtaState] = useState<OTAUpdateState>(otaManager.getState());
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const unsub = otaManager.subscribe((state) => {
      setOtaState(state);
      if (state.status === 'available' && state.availableUpdate) {
        if (state.availableUpdate.mandatory) {
          setShowModal(true);
        }
      }
    });
    return unsub;
  }, []);

  const isEn = language === 'en';
  const manifest = otaState.availableUpdate;

  if (!manifest || dismissed) return null;

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await otaManager.applyUpdate(manifest);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <>
      {/* Optional Update Banner */}
      {!manifest.mandatory && !showModal && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 inset-x-0 z-[9990] bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2 text-xs font-medium shadow-md flex items-center justify-between gap-3 select-none"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-white/20 font-bold uppercase tracking-wider text-[10px]">
              OTA Hotfix v{manifest.version}
            </span>
            <span>
              {isEn
                ? `A dynamic update is ready: "${manifest.title}"`
                : `Sasisho jipya linapatikana: "${manifest.title}"`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1 rounded-lg bg-white text-orange-700 hover:bg-orange-50 font-bold text-xs shadow-sm flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>{isEn ? 'Update Now' : 'Sasisha Sasa'}</span>
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Mandatory or Expanded Hotfix Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[99995] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-stone-900 border-2 border-orange-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl text-white relative select-none"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold font-display text-white">
                      {isEn ? 'Over-The-Air Hotfix' : 'Sasisho la Papo Hapo'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[10px] font-mono font-bold">
                      v{manifest.version}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">
                    {manifest.mandatory
                      ? (isEn ? 'Mandatory stability patch required' : 'Sasisho la lazima linahitajika')
                      : (isEn ? 'Recommended performance enhancements' : 'Maboresho ya mfumo')}
                  </p>
                </div>
              </div>

              {!manifest.mandatory && (
                <button
                  onClick={() => setShowModal(false)}
                  className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Patch Notes Card */}
            <div className="bg-stone-950/70 border border-stone-800 rounded-2xl p-4 mb-5 text-xs text-stone-300 space-y-2">
              <div className="flex items-center gap-1.5 text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                <FileText className="w-3.5 h-3.5 text-orange-400" />
                <span>{isEn ? 'Patch Details' : 'Maelezo ya Maboresho'}</span>
              </div>
              <p className="font-semibold text-stone-100">{manifest.title}</p>
              <p className="text-stone-300 leading-relaxed whitespace-pre-line">{manifest.patchNotes}</p>
              
              <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-[10px] text-stone-500 font-mono">
                <span>Checksum: {manifest.bundleChecksum.slice(0, 16)}...</span>
                <span>Track: {manifest.channel}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {!manifest.mandatory && (
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-all cursor-pointer"
                >
                  {isEn ? 'Later' : 'Baadaye'}
                </button>
              )}

              <button
                id="apply-ota-hotfix-btn"
                onClick={handleApply}
                disabled={isApplying}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-orange-950/50 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isApplying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isEn ? 'Applying Hotfix...' : 'Inaweka Sasisho...'}</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-4 h-4" />
                    <span>{isEn ? 'Apply & Reload Now' : 'Weka na Anza Upya'}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};
