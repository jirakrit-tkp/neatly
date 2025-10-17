export default function ChatbotSnackbar({ show, message, type }: { show: boolean; message: string; type: 'success' | 'error' | 'delete' }) {
  if (!show) return null;
  return (
    <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-right duration-300">
      <div
        className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          type === 'success'
            ? 'bg-green-100 text-green-800 border border-green-200'
            : type === 'delete'
            ? 'bg-orange-100 text-orange-800 border border-orange-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}
      >
        {type === 'success' && <span className="text-green-600">✓</span>}
        {type === 'delete' && <span className="text-orange-600">🗑️</span>}
        {type === 'error' && <span className="text-red-600">✕</span>}
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );
}


