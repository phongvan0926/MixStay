'use client';

import { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';

const ROOM_TYPES = [
  { value: 'don', label: 'Phòng đơn' },
  { value: 'gac_xep', label: 'Gác xép' },
  { value: '1k1n', label: '1 khách 1 ngủ' },
  { value: '2k1n', label: '2 khách 1 ngủ' },
  { value: 'studio', label: 'Studio' },
  { value: 'duplex', label: 'Duplex' },
];

const AMENITY_OPTIONS = [
  'Điều hoà', 'Nóng lạnh', 'WC riêng', 'Bếp riêng', 'Ban công',
  'Giường', 'Tủ quần áo', 'Máy giặt riêng', 'Tủ lạnh', 'Bàn làm việc',
  'Kệ bếp', 'Bình nóng lạnh', 'Rèm cửa', 'Quạt trần', 'Smart TV',
];

function formatVndInput(val: number | string): string {
  const num = typeof val === 'string' ? parseInt(val.replace(/\D/g, ''), 10) : val;
  if (!num || isNaN(num)) return '';
  return num.toLocaleString('vi-VN');
}

function parseVndInput(str: string): number {
  return parseInt(str.replace(/\D/g, ''), 10) || 0;
}

export interface QuickRoomTypeData {
  name: string;
  typeName: string;
  areaSqm: number;
  priceMonthly: number;
  deposit: number;
  totalUnits: number;
  amenities: string[];
  commissionJson: string;
}

interface QuickRoomTypeFormProps {
  onAdd: (data: QuickRoomTypeData) => void;
  onCancel: () => void;
}

export default function QuickRoomTypeForm({ onAdd, onCancel }: QuickRoomTypeFormProps) {
  const [name, setName] = useState('');
  const [typeName, setTypeName] = useState('don');
  const [areaSqm, setAreaSqm] = useState(0);
  const [priceMonthly, setPriceMonthly] = useState(0);
  const [priceDisplay, setPriceDisplay] = useState('');
  const [deposit, setDeposit] = useState(0);
  const [depositDisplay, setDepositDisplay] = useState('');
  const [totalUnits, setTotalUnits] = useState(1);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [com6, setCom6] = useState(40);
  const [com12, setCom12] = useState(50);

  const toggleAmenity = (a: string) => {
    setAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseVndInput(e.target.value);
    setPriceDisplay(num ? formatVndInput(num) : '');
    setPriceMonthly(num);
  };

  const handleDepositChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseVndInput(e.target.value);
    setDepositDisplay(num ? formatVndInput(num) : '');
    setDeposit(num);
  };

  const commCalc6 = useMemo(() => priceMonthly ? formatCurrency((com6 / 100) * priceMonthly) : '', [priceMonthly, com6]);
  const commCalc12 = useMemo(() => priceMonthly ? formatCurrency((com12 / 100) * priceMonthly) : '', [priceMonthly, com12]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (!areaSqm || areaSqm <= 0) return;
    if (!priceMonthly || priceMonthly <= 0) return;

    const commissionObj: Record<string, number> = {};
    if (com6 > 0) commissionObj['6'] = com6;
    if (com12 > 0) commissionObj['12'] = com12;

    onAdd({
      name,
      typeName,
      areaSqm,
      priceMonthly,
      deposit: deposit || priceMonthly,
      totalUnits,
      amenities,
      commissionJson: JSON.stringify(commissionObj),
    });
  };

  return (
    <div className="border border-brand-200 bg-brand-50/30 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-stone-800">Thêm loại phòng mới</h4>
        <button type="button" onClick={onCancel} className="text-stone-400 hover:text-stone-600 text-sm">Huỷ</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-stone-700 mb-1">Tên loại phòng <span className="text-red-500">*</span></label>
          <input type="text" className="input-field" placeholder='VD: "Loại 1 - Phòng đơn"' value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Kiểu phòng</label>
          <select className="input-field" value={typeName} onChange={e => setTypeName(e.target.value)}>
            {ROOM_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Diện tích m² <span className="text-red-500">*</span></label>
          <input type="number" className="input-field" min={1} step={0.5} placeholder="25" value={areaSqm || ''} onChange={e => setAreaSqm(parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Giá thuê/tháng <span className="text-red-500">*</span></label>
          <input type="text" className="input-field" placeholder="3.500.000" value={priceDisplay} onChange={handlePriceChange} />
          {priceMonthly > 0 && <p className="text-xs text-stone-400 mt-0.5">{formatCurrency(priceMonthly)}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Đặt cọc</label>
          <input type="text" className="input-field" placeholder="= 1 tháng tiền thuê" value={depositDisplay} onChange={handleDepositChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Số phòng loại này</label>
          <input type="number" className="input-field" min={1} value={totalUnits} onChange={e => setTotalUnits(parseInt(e.target.value) || 1)} />
        </div>
      </div>

      {/* Quick amenities */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">Tiện ích</label>
        <div className="flex flex-wrap gap-1.5">
          {AMENITY_OPTIONS.map(a => (
            <button key={a} type="button" onClick={() => toggleAmenity(a)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                amenities.includes(a) ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'
              }`}>
              {amenities.includes(a) && <span className="mr-1">✓</span>}{a}
            </button>
          ))}
        </div>
      </div>

      {/* Quick commission */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">Hoa hồng MG</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 whitespace-nowrap">6 tháng:</span>
            <input type="number" className="input-field !py-1.5 text-sm" min={0} max={100} value={com6} onChange={e => setCom6(parseInt(e.target.value) || 0)} />
            <span className="text-xs text-stone-500">%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 whitespace-nowrap">12 tháng:</span>
            <input type="number" className="input-field !py-1.5 text-sm" min={0} max={100} value={com12} onChange={e => setCom12(parseInt(e.target.value) || 0)} />
            <span className="text-xs text-stone-500">%</span>
          </div>
        </div>
        {priceMonthly > 0 && (com6 > 0 || com12 > 0) && (
          <p className="text-xs text-emerald-600 mt-1">
            {com6 > 0 && `6th: ${commCalc6}`}{com6 > 0 && com12 > 0 && ' • '}{com12 > 0 && `12th: ${commCalc12}`}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700">Huỷ</button>
        <button type="button" onClick={handleSubmit}
          className="px-5 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
          disabled={!name.trim() || !areaSqm || !priceMonthly}>
          Thêm loại phòng
        </button>
      </div>
    </div>
  );
}
