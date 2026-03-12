import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy ${label || 'ID'}: ${text}`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
    >
      {copied ? (
        <><Check className="w-3 h-3 text-green-500" /><span className="text-green-600">Copied</span></>
      ) : (
        <><Copy className="w-3 h-3" /><span>{label || text.slice(0, 8) + '…'}</span></>
      )}
    </button>
  );
}
