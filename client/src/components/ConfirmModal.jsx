export default function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', confirmClass, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <p className="text-base font-bold text-white mb-1">{title}</p>
        )}
        {message && (
          <p className="text-sm text-gray-400 mb-5">{message}</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 font-semibold text-sm active:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${confirmClass ?? 'bg-yellow-500 text-gray-900 active:bg-yellow-400'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
