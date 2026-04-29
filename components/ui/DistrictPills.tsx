'use client';
import { useState } from 'react';

const PRIMARY_DISTRICTS = [
  'Cầu Giấy',
  'Đống Đa',
  'Thanh Xuân',
  'Ba Đình',
  'Hai Bà Trưng',
  'Nam Từ Liêm',
  'Hoàng Mai',
];

const OTHER_DISTRICTS = [
  // Nội thành còn lại
  'Bắc Từ Liêm', 'Hà Đông', 'Hoàn Kiếm', 'Long Biên', 'Tây Hồ',
  // Thị xã + huyện ngoại thành
  'Sơn Tây',
  'Ba Vì', 'Chương Mỹ', 'Đan Phượng', 'Đông Anh', 'Gia Lâm',
  'Hoài Đức', 'Mê Linh', 'Mỹ Đức', 'Phú Xuyên', 'Phúc Thọ',
  'Quốc Oai', 'Sóc Sơn', 'Thạch Thất', 'Thanh Oai', 'Thanh Trì',
  'Thường Tín', 'Ứng Hòa',
];

interface Props {
  value: string; // selected district name, '' = Tất cả
  onChange: (district: string) => void;
}

export default function DistrictPills({ value, onChange }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isOtherSelected = !!value && !PRIMARY_DISTRICTS.includes(value);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* "Tất cả" pill */}
      <button
        type="button"
        onClick={() => onChange('')}
        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
          value === ''
            ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
            : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
        }`}
      >
        Tất cả
      </button>

      {/* 7 primary pills */}
      {PRIMARY_DISTRICTS.map(d => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
            value === d
              ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
              : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
          }`}
        >
          {d}
        </button>
      ))}

      {/* "▼ Quận khác" dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen(o => !o)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
            isOtherSelected
              ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
              : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
          }`}
        >
          ▼ {isOtherSelected ? value : 'Quận khác'}
        </button>

        {dropdownOpen && (
          <>
            {/* Backdrop để đóng khi click ra ngoài */}
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
            <div className="absolute top-full left-0 mt-1 w-56 max-h-64 overflow-y-auto bg-white rounded-xl border border-stone-200 shadow-lg z-20 py-1">
              {OTHER_DISTRICTS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { onChange(d); setDropdownOpen(false); }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-brand-50 transition-colors ${
                    value === d ? 'bg-brand-50 text-brand-700 font-medium' : 'text-stone-700'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
