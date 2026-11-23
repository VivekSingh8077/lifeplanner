import { ClipboardCopy, ClipboardPaste, Download, Info, Monitor, Moon, Sun, Tags, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { CategoryManager } from '../components/timetable/CategoryManager';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { toDateKey } from '../lib/dates';
import { exportJson, MAX_IMPORT_CHARS, parseImport, type SanitizeResult } from '../lib/storage';
import { useApp } from '../store/AppContext';
import type { AppData } from '../types';

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card p-4 sm:p-5">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function countActivities(d: AppData): number {
  return Object.values(d.timetable).reduce((n, list) => n + list.length, 0);
}

function importSummary(result: SanitizeResult): string {
  const d = result.data;
  const planner = `${countActivities(d)} activities, ${d.categories.length} categories and ${d.goals.length} goals`;
  const health = result.includesHealth
    ? `It also contains ${d.health.weightEntries.length} weight entries, ${d.health.mealEntries.length} food log entries and ${d.health.foods.filter((f) => f.source === 'custom').length} custom foods.`
    : 'It has no Health & Fitness data (older export), so your current health data will be kept as it is.';
  return `The import contains ${planner}. ${health} Your planner data in this browser will be replaced.`;
}

export function SettingsPage() {
  const { data, actions } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [pending, setPending] = useState<SanitizeResult | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const stageImport = (text: string): string | null => {
    try {
      setPending(parseImport(text));
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Could not read that data.';
    }
  };

  const download = () => {
    const blob = new Blob([exportJson(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mylife-planner-${toDateKey(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoking straight away can cancel the download in some browsers (notably Safari/mobile).
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setMessage({ type: 'ok', text: 'Backup downloaded.' });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportJson(data));
      setMessage({ type: 'ok', text: 'Copied to clipboard. Paste it into Import on your other device.' });
    } catch {
      setMessage({ type: 'error', text: 'Clipboard access was blocked. Use Download instead.' });
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_IMPORT_CHARS) {
      setMessage({ type: 'error', text: 'This backup is larger than 5 MB. Choose a smaller JSON file.' });
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    try {
      const error = stageImport(await file.text());
      if (error) setMessage({ type: 'error', text: error });
      else setMessage(null);
    } catch {
      setMessage({ type: 'error', text: 'Could not read that backup file. Try another file or use pasted JSON.' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Appearance, categories and your data.</p>
      </header>

      <Section title="Appearance">
        <div className="space-y-4">
          <div>
            <span className="field-label">Theme</span>
            <SegmentedControl
              label="Theme"
              value={data.theme}
              onChange={actions.setTheme}
              options={[
                { value: 'light', label: 'Light', icon: <Sun size={15} /> },
                { value: 'dark', label: 'Dark', icon: <Moon size={15} /> },
                { value: 'system', label: 'System', icon: <Monitor size={15} /> },
              ]}
            />
          </div>
          <div>
            <span className="field-label">Time format</span>
            <SegmentedControl
              label="Time format"
              value={data.use24h ? '24h' : '12h'}
              onChange={(v) => actions.setUse24h(v === '24h')}
              options={[
                { value: '12h', label: '12-hour' },
                { value: '24h', label: '24-hour' },
              ]}
            />
          </div>
        </div>
      </Section>

      <Section title="Categories" description="Add your own categories and choose which ones count as study or productive time.">
        <button type="button" className="btn btn-secondary" onClick={() => setShowCategories(true)}>
          <Tags size={16} /> Manage categories ({data.categories.length})
        </button>
      </Section>

      <Section
        title="Backup & transfer"
        description="Your data lives in this browser only. Export it to back it up or to move it to another device."
      >
        <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-200">
          <Info size={17} className="mt-0.5 shrink-0" />
          <p>
            Changes made on your laptop do not appear on your phone automatically. To move them, export here and import on the
            other device (download the file, or copy the JSON and paste it there).
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" className="btn btn-primary" onClick={download}>
            <Download size={17} /> Download JSON
          </button>
          <button type="button" className="btn btn-secondary" onClick={copy}>
            <ClipboardCopy size={17} /> Copy JSON
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={17} /> Import from file
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setPasteText('');
              setPasteError('');
              setPasteOpen(true);
            }}
          >
            <ClipboardPaste size={17} /> Import from pasted text
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        {message && (
          <p
            role="status"
            className={`mt-3 text-sm font-medium ${
              message.type === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {message.text}
          </p>
        )}
      </Section>

      <Section title="Danger zone" description="Erase all planner and Health & Fitness data, including your timetable, goals, food diary and weight history, from this browser.">
        <button type="button" className="btn btn-danger" onClick={() => setShowReset(true)}>
          <Trash2 size={17} /> Reset all data
        </button>
      </Section>

      {showCategories && <CategoryManager onClose={() => setShowCategories(false)} />}

      {pasteOpen && (
        <Modal
          title="Import from pasted text"
          onClose={() => setPasteOpen(false)}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setPasteOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!pasteText.trim()}
                onClick={() => {
                  const error = stageImport(pasteText);
                  if (error) setPasteError(error);
                  else setPasteOpen(false);
                }}
              >
                Continue
              </button>
            </>
          }
        >
          <label className="field-label" htmlFor="paste-json">
            Exported JSON
          </label>
          <textarea
            id="paste-json"
            className="field min-h-[200px] py-2 font-mono text-xs"
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value);
              setPasteError('');
            }}
            placeholder='{"app":"mylife-planner", …}'
            spellCheck={false}
          />
          {pasteError && <p className="mt-2 text-sm font-medium text-rose-600">{pasteError}</p>}
        </Modal>
      )}

      {pending && (
        <ConfirmDialog
          title="Replace your data with this import?"
          message={importSummary(pending)}
          confirmLabel="Import and replace"
          onConfirm={() => {
            // Older exports have no health module: keep the health data that is already here.
            actions.importData(pending.includesHealth ? pending.data : { ...pending.data, health: data.health });
            setMessage({ type: 'ok', text: 'Import complete.' });
          }}
          onCancel={() => setPending(null)}
        />
      )}

      {showReset && (
        <ConfirmDialog
          title="Reset all data?"
          message="This permanently deletes ALL data in this browser, including your customised timetable, categories, goals, completion history, Health & Fitness profile, food diary, water logs, exercise logs and weight history. Export a backup first if you might want any of it back."
          confirmLabel="Reset everything"
          danger
          onConfirm={() => {
            actions.resetAll();
            setMessage({ type: 'ok', text: 'Everything was reset to the defaults.' });
          }}
          onCancel={() => setShowReset(false)}
        />
      )}
    </div>
  );
}
