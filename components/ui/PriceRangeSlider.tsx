'use client';
import { useCallback } from 'react';

const MIN = 1_000_000;
const MAX = 20_000_000;
const STEP = 500_000;

const fmt = new Intl.NumberFormat('vi-VN');

interface Props {
  /** value in VND. Empty string = "không giới hạn" */
  minValue: string;
  maxValue: string;
  onChange: (next: { min: string; max: string }) => void;
}

/**
 * Dual-handle range slider for VND price (1tr-20tr, step 500k).
 * Uses 2 overlapped <input type="range"> with absolute positioning.
 * Mobile-friendly: 24px touch target on handles via custom CSS.
 */
export default function PriceRangeSlider({ minValue, maxValue, onChange }: Props) {
  // Resolve current numeric values, defaulting to bounds when empty
  const minNum = minValue ? Math.max(MIN, Math.min(MAX, parseInt(minValue, 10) || MIN)) : MIN;
  const maxNum = maxValue ? Math.max(MIN, Math.min(MAX, parseInt(maxValue, 10) || MAX)) : MAX;

  const handleMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = parseInt(e.target.value, 10);
    // Don't let min cross max - keep at least 1 step apart
    const safe = Math.min(next, maxNum - STEP);
    onChange({
      min: safe <= MIN ? '' : String(safe),
      max: maxValue,
    });
  }, [maxNum, maxValue, onChange]);

  const handleMaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = parseInt(e.target.value, 10);
    const safe = Math.max(next, minNum + STEP);
    onChange({
      min: minValue,
      max: safe >= MAX ? '' : String(safe),
    });
  }, [minNum, minValue, onChange]);

  // Position percentages for the highlighted track segment between handles
  const minPct = ((minNum - MIN) / (MAX - MIN)) * 100;
  const maxPct = ((maxNum - MIN) / (MAX - MIN)) * 100;

  return (
    <div className="w-full">
      <div className="relative h-10 select-none">
        {/* Background track */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1.5 bg-stone-200 rounded-full" />
        {/* Active range fill */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-brand-500 rounded-full"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
        />

        {/* Min handle — must be on top so it's clickable on the left edge */}
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={minNum}
          onChange={handleMinChange}
          aria-label="Giá tối thiểu"
          className="price-slider absolute inset-0 w-full appearance-none bg-transparent pointer-events-none"
          style={{ zIndex: minNum > MAX - STEP * 2 ? 4 : 3 }}
        />
        {/* Max handle */}
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={maxNum}
          onChange={handleMaxChange}
          aria-label="Giá tối đa"
          className="price-slider absolute inset-0 w-full appearance-none bg-transparent pointer-events-none"
          style={{ zIndex: 4 }}
        />
      </div>

      <div className="flex items-center justify-between mt-2 text-sm">
        <span className="font-semibold text-stone-700">{fmt.format(minNum)}₫</span>
        <span className="text-stone-400">—</span>
        <span className="font-semibold text-stone-700">{fmt.format(maxNum)}₫</span>
      </div>

      {/* Slider thumb styling — needs raw CSS for cross-browser appearance */}
      <style jsx>{`
        .price-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 9999px;
          background: white;
          border: 2px solid #2563eb;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          cursor: pointer;
          pointer-events: auto;
        }
        .price-slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 9999px;
          background: white;
          border: 2px solid #2563eb;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          cursor: pointer;
          pointer-events: auto;
        }
        .price-slider::-webkit-slider-runnable-track {
          background: transparent;
          border: none;
        }
        .price-slider::-moz-range-track {
          background: transparent;
          border: none;
        }
      `}</style>
    </div>
  );
}
