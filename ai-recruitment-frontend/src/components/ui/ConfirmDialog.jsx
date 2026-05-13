import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete', cancelText = 'Cancel', type = 'danger' }) {
  if (!isOpen) return null;

  const colors = {
    danger: {
      bg: 'from-red-500 to-rose-500',
      border: 'border-red-500/30',
      button: 'from-red-500 to-rose-500',
      icon: 'text-red-400'
    },
    warning: {
      bg: 'from-yellow-500 to-orange-500',
      border: 'border-yellow-500/30',
      button: 'from-yellow-500 to-orange-500',
      icon: 'text-yellow-400'
    }
  };

  const color = colors[type] || colors.danger;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl max-w-md w-full overflow-hidden"
        >
          {/* Header with gradient */}
          <div className={`bg-gradient-to-r ${color.bg} p-6`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <AlertTriangle className={`w-6 h-6 ${color.icon}`} />
                </div>
                <h3 className="text-xl font-bold text-white">{title}</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-slate-300 leading-relaxed mb-6">
              {message}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-slate-800/60 text-slate-300 rounded-xl font-semibold hover:bg-slate-700/60 border border-slate-700/50 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 px-4 py-3 bg-gradient-to-r ${color.button} text-white rounded-xl font-semibold hover:shadow-lg transition-all`}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
