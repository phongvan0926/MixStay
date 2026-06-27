'use client';
import { useState, useRef, useEffect, useMemo } from 'react';

// Bỏ dấu tiếng Việt + về chữ thường để lọc gợi ý không phân biệt dấu/hoa-thường.
// VD: gõ "tu liem" vẫn khớp "Từ Liêm".
function normalizeVi(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  /** Cho phép giữ giá trị tự gõ không nằm trong options (vd tên đường). Mặc định true. */
  allowFreeText?: boolean;
  id?: string;
  className?: string;
  /** Số gợi ý tối đa hiển thị. */
  maxVisible?: number;
}

export default function Combobox({
  value,
  onChange,
  options,
  placeholder,
  allowFreeText = true,
  id,
  className = '',
  maxVisible = 50,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(''); // text đang gõ (chỉ dùng khi đang mở)
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Đóng → hiển thị value đã chọn; mở → hiển thị text đang gõ để lọc.
  const inputValue = open ? query : value;

  const filtered = useMemo(() => {
    const q = normalizeVi(query.trim());
    const base = q ? options.filter(o => normalizeVi(o).includes(q)) : options;
    return base.slice(0, maxVisible);
  }, [query, options, maxVisible]);

  // Đóng dropdown khi click ra ngoài (và chốt giá trị đang gõ nếu hợp lệ).
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        commitAndClose();
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, options]);

  const openDropdown = () => {
    setQuery(value);
    setHighlight(0);
    setOpen(true);
  };

  const select = (opt: string) => {
    onChange(opt);
    setOpen(false);
  };

  // Khi rời khỏi: nếu gõ trùng (không phân biệt dấu) 1 option thì chuẩn hóa về option đó;
  // nếu cho gõ tự do thì giữ nguyên text; nếu không (dropdown cố định) thì giữ value cũ.
  const commitAndClose = () => {
    const q = query.trim();
    if (q) {
      const exact = options.find(o => normalizeVi(o) === normalizeVi(q));
      if (exact) onChange(exact);
      else if (allowFreeText) onChange(q);
    } else if (allowFreeText) {
      onChange('');
    }
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        openDropdown();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) select(filtered[highlight]);
      else commitAndClose();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
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
        className={`input-field pr-9 ${className}`}
        placeholder={placeholder}
        value={inputValue}
        onFocus={openDropdown}
        onChange={e => {
          if (!open) setOpen(true);
          setQuery(e.target.value);
          setHighlight(0);
          if (allowFreeText) onChange(e.target.value); // cập nhật ngay cho ô gõ tự do
        }}
        onKeyDown={onKeyDown}
      />
      {/* Mũi tên chevron */}
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </span>

      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-30 top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white rounded-xl border border-stone-200 shadow-lg py-1"
        >
          {filtered.map((opt, i) => (
            <li key={opt}>
              <button
                type="button"
                role="option"
                aria-selected={opt === value}
                onMouseDown={e => { e.preventDefault(); select(opt); }}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  i === highlight ? 'bg-brand-50 text-brand-700' : 'text-stone-700 hover:bg-stone-50'
                } ${opt === value ? 'font-medium' : ''}`}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
