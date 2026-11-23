import { Droplets, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { waterOn } from '../../lib/healthStats';
import { Modal } from '../ui/Modal';
import { ProgressBar } from '../ui/ProgressBar';
import { useToast } from '../ui/Toast';

const QUICK = [150, 250, 330, 500, 750, 1000];

function nowTime(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function WaterModal({ date, targetMl, onClose }: { date: string; targetMl: number; onClose: () => void }) {
  const { data, actions } = useApp();
  const toast = useToast();
  const [custom, setCustom] = useState('');

  const total = waterOn(data.health.waterEntries, date);
  const entries = data.health.waterEntries.filter((w) => w.date === date).sort((a, b) => b.time.localeCompare(a.time));
  const customMl = Number(custom);
  const customValid = custom.trim() !== '' && Number.isFinite(customMl) && customMl >= 10 && customMl <= 5000;

  const add = (ml: number) => {
    actions.addWater({ date, time: nowTime(), ml });
    toast.show(`Added ${ml} ml of water`);
  };

  return (
    <Modal title="Add water" onClose={onClose} footer={<button type="button" className="btn btn-primary" onClick={onClose}>Done</button>}>
      <div className="mb-4 rounded-2xl bg-sky-50 p-4 dark:bg-sky-500/10">
        <div className="flex items-baseline justify-between">
          <p className="flex items-center gap-2 text-sm font-medium text-sky-800 dark:text-sky-200">
            <Droplets size={16} /> Today
          </p>
          <p className="text-sm tabular-nums text-sky-900 dark:text-sky-100">
            <span className="text-xl font-semibold">{total}</span> / {targetMl} ml
          </p>
        </div>
        <ProgressBar className="mt-2" value={(total / targetMl) * 100} color="#0ea5e9" label="Water intake today" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {QUICK.map((ml) => (
          <button key={ml} type="button" className="btn btn-secondary min-h-[52px] flex-col gap-0 text-base font-semibold" onClick={() => add(ml)}>
            {ml}
            <span className="text-[11px] font-normal text-slate-500">ml</span>
          </button>
        ))}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!customValid) return;
          add(Math.round(customMl));
          setCustom('');
        }}
      >
        <input
          className="field min-w-0 flex-1"
          inputMode="numeric"
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, ''))}
          placeholder="Other amount (ml)"
          aria-label="Custom amount in millilitres"
        />
        <button type="submit" className="btn btn-primary" disabled={!customValid}>
          Add
        </button>
      </form>

      {entries.length > 0 && (
        <ul className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          {entries.map((w) => (
            <li key={w.id} className="flex items-center justify-between gap-3 py-1 pl-4 pr-1">
              <span className="text-sm text-slate-700 dark:text-slate-200">
                <span className="font-semibold tabular-nums">{w.ml} ml</span> <span className="text-slate-400">· {w.time}</span>
              </span>
              <button type="button" className="btn-icon hover:text-rose-600" aria-label={`Remove ${w.ml} ml entry`} onClick={() => actions.deleteWater(w.id)}>
                <Trash2 size={17} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
