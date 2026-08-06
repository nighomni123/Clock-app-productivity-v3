import React from 'react';
import { Clock } from 'lucide-react';

interface TimePickerInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
}

export const TimePickerInput: React.FC<TimePickerInputProps> = ({ label, value, onChange, required }) => {
  const handleSetNow = () => {
    const now = new Date();
    // Round to nearest 15 minutes
    const ms = 1000 * 60 * 15;
    const rounded = new Date(Math.round(now.getTime() / ms) * ms);
    const h = String(rounded.getHours()).padStart(2, '0');
    const m = String(rounded.getMinutes()).padStart(2, '0');
    onChange(`${h}:${m}`);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [hStr, mStr] = e.target.value.split(':');
    if (hStr && mStr) {
      let m = parseInt(mStr, 10);
      let h = parseInt(hStr, 10);
      const remainder = m % 15;
      if (remainder !== 0) {
        if (remainder >= 8) {
          m += (15 - remainder);
        } else {
          m -= remainder;
        }
        if (m === 60) {
          m = 0;
          h = (h + 1) % 24;
        }
        onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-zinc-400 block">{label}</label>
        <button
          type="button"
          onClick={handleSetNow}
          className="text-[10px] font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 transition px-2 py-0.5 rounded bg-emerald-950/20 border border-emerald-900/50"
        >
          Set to Now
        </button>
      </div>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-emerald-400">
          <Clock className="h-4 w-4 text-zinc-500 group-focus-within:text-emerald-500" />
        </div>
        <input
          type="time"
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          step="900"
          className="w-full rounded-xl bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/50 hover:border-zinc-700 [color-scheme:dark] transition-colors"
        />
      </div>
    </div>
  );
};
