'use client';
import { useState } from 'react';
import { INNER_CITY_DISTRICTS, OUTER_DISTRICTS } from '@/lib/hanoi-locations';

interface Props {
  value: string[]; // selected district names, [] = Tất cả
  onChange: (districts: string[]) => void;
}

export default function DistrictPills({ value, onChange }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const selectedOuter = value.filter(d => !INNER_CITY_DISTRICTS.includes(d));
  const hasOuter = selectedOuter.length > 0;

  // Bật/tắt 1 quận trong danh sách chọn
  const toggle = (d: string) => {
    onChange(value.includes(d) ? value.filter(x => x !== d) : [...value, d]);
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* "Tất cả" pill — bỏ chọn hết */}
      <button
        type="button"
        onClick={() => onChange([])}
        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
          value.length === 0
            ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
            : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
        }`}
      >
        Tất cả
      </button>

      {/* 12 quận nội thành làm pill chính — tích nhiều cùng lúc */}
      {INNER_CITY_DISTRICTS.map(d => {
        const active = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            aria-pressed={active}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              active
                ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
            }`}
          >
            {active ? '✓ ' : ''}{d}
          </button>
        );
      })}

      {/* "▼ Quận khác" dropdown — cũng cho tích nhiều */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen(o => !o)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
            hasOuter
              ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
              : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
          }`}
        >
          ▼ {hasOuter ? `Quận khác (${selectedOuter.length})` : 'Quận khác'}
        </button>

        {dropdownOpen && (
          <>
            {/* Backdrop để đóng khi click ra ngoài */}
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
            <div className="absolute top-full left-0 mt-1 w-56 max-h-64 overflow-y-auto bg-white rounded-xl border border-stone-200 shadow-lg z-20 py-1">
              {OUTER_DISTRICTS.map(d => {
                const active = value.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggle(d)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-brand-50 transition-colors flex items-center gap-2 ${
                      active ? 'bg-brand-50 text-brand-700 font-medium' : 'text-stone-700'
                    }`}
                  >
                    <span className="w-4 flex-shrink-0 text-brand-600">{active ? '✓' : ''}</span>
                    {d}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
