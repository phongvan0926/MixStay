'use client';
import { useState, useRef, useEffect, useMemo } from 'react';

// Bỏ dấu tiếng Việt + về chữ thường để lọc gợi ý không phân biệt dấu/hoa-thường.
function normalizeVi(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
}

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string; // value đang chọn (vd propertyId)
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  maxVisible?: number;
  emptyText?: string;
}

/**
 * Ô chọn có TÌM KIẾM: gõ để lọc nhanh danh sách (khi nhiều lựa chọn).
 * KHÁC Combobox: CHỈ nhận giá trị khi người dùng chọn 1 mục hợp lệ trong dropdown —
 * text gõ tay không khớp sẽ KHÔNG được nhận (đóng lại về lựa chọn cũ).
 */
export default function SearchableSelect({
  value, onChange, options, placeholder, id, className = '', disabled = false,
  maxVisible = 50, emptyText = 'Không tìm thấy — hãy chọn từ danh sách',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(() => options.find(o => o.value === value)?.label || '', [options, value]);
  const inputValue = open ? query : selectedLabel;

  const filtered = useMemo(() => {
    const q = normalizeVi(query.trim());
    const base = q ? options.filter(o => normalizeVi(o.label).includes(q)) : options;
    return base.slice(0, maxVisible);
  }, [query, options, maxVisible]);

  // Click ra ngoài → đóng, KHÔNG nhận text tự gõ (giữ nguyên value đã chọn).
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closeNoCommit();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const openDropdown = () => { setQuery(''); setHighlight(0); setOpen(true); };
  const closeNoCommit = () => { setOpen(false); setQuery(''); };
  const select = (opt: SelectOption) => { onChange(opt.value); setOpen(false); setQuery(''); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); openDropdown(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlight]) select(filtered[highlight]); }
    else if (e.key === 'Escape') { e.preventDefault(); closeNoCommit(); }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        className={`input-field pr-9 ${className}`}
        placeholder={placeholder}
        value={inputValue}
        onFocus={openDropdown}
        onChange={e => { if (!open) setOpen(true); setQuery(e.target.value); setHighlight(0); }}
        onKeyDown={onKeyDown}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </span>

      {open && (
        <ul
          role="listbox"
          className="absolute z-30 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white rounded-xl border border-stone-200 shadow-lg py-1"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-stone-400">{emptyText}</li>
          ) : (
            filtered.map((opt, i) => (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  onMouseDown={e => { e.preventDefault(); select(opt); }}
                  onMouseEnter={() => setHighlight(i)}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                    i === highlight ? 'bg-brand-50 text-brand-700' : 'text-stone-700 hover:bg-stone-50'
                  } ${opt.value === value ? 'font-medium' : ''}`}
                >
                  {opt.label}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
