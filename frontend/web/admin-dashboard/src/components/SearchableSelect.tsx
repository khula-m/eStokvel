import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Loader2 } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search…',
  loading = false,
  disabled = false,
  className = '',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = query
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          (o.sublabel && o.sublabel.toLowerCase().includes(query.toLowerCase()))
      )
    : options;

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2463]/20 focus:border-[#0A2463] disabled:opacity-50"
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-1">
          {value && (
            <X
              className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600"
              onClick={(e) => { e.stopPropagation(); onChange(''); setQuery(''); }}
            />
          )}
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </span>
      </button>

      {selected && selected.sublabel && (
        <p className="text-xs text-gray-400 mt-0.5 ml-1 truncate">{selected.sublabel}</p>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search…"
              className="w-full text-sm outline-none bg-transparent"
            />
          </div>
          <ul className="overflow-y-auto max-h-48">
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-sm text-gray-400 text-center">
                {loading ? 'Loading…' : 'No results'}
              </li>
            )}
            {filtered.map((opt) => (
              <li
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${opt.value === value ? 'bg-blue-50 font-medium' : ''}`}
              >
                <div className="text-gray-900">{opt.label}</div>
                {opt.sublabel && <div className="text-xs text-gray-400">{opt.sublabel}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
