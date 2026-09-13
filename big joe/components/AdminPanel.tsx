'use client';

import { useEffect, useState } from 'react';
import { upload } from '@vercel/blob/client';
import {
  RefreshCw, Download, Trash2, Plus, Pencil, LogOut,
  AlertTriangle, CheckCircle2, UploadCloud, X, ImagePlus,
} from 'lucide-react';
import type { Car } from '@/lib/types';
import { formatNaira } from '@/lib/csv';
import { adminLogout, getAdminToken } from '@/lib/auth';
import { publishCarsToSheet } from '@/lib/sheetWrite';

type PublishStatus = 'idle' | 'publishing' | 'success' | 'error';
type LoadStatus = 'loading' | 'loaded' | 'error';

const emptyCar: Car = {
  slug: '',
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  price: 0,
  condition: 'Nigerian Used',
  bodyType: 'Sedan',
  transmission: 'Automatic',
  images: [],
  isAvailable: true,
};

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Curated option sets for fields that realistically only take a handful of
// values — dropdowns are faster and typo-proof. Each still allows a custom
// "Other" entry so an unusual vehicle isn't blocked by the list.
const BRAND_OPTIONS = ['Toyota', 'Lexus', 'Mercedes-Benz', 'Honda', 'Hyundai', 'KIA', 'Nissan', 'Ford'];
const CONDITION_OPTIONS = ['New', 'Nigerian Used', 'Foreign Used', 'Certified Pre-Owned'];
const BODY_TYPE_OPTIONS = ['Sedan', 'SUV', 'Coupe', 'Hatchback', 'Pickup', 'Van', 'Convertible', 'Wagon', 'Truck'];
const TRANSMISSION_OPTIONS = ['Automatic', 'Manual', 'CVT', 'Semi-Automatic'];
const FUEL_TYPE_OPTIONS = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR + 1 - 1990 + 1 }, (_, i) => String(CURRENT_YEAR + 1 - i));

export function AdminPanel({ onLoggedOut }: { onLoggedOut: () => void }) {
  const [cars, setCars] = useState<Car[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Car | null>(null);
  const [publishStatus, setPublishStatus] = useState<PublishStatus>('idle');
  const [publishError, setPublishError] = useState<string | null>(null);

  async function loadInventory() {
    setLoadStatus('loading');
    try {
      const res = await fetch('/api/inventory/read');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load inventory.');
      setCars(data.cars);
      setLoadStatus('loaded');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load inventory.');
      setLoadStatus('error');
    }
  }

  useEffect(() => {
    // Standard fetch-on-mount: loadInventory sets a loading state before its
    // first await, which is what this lint rule flags, but there's no
    // external system to subscribe to here — this *is* the fetch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInventory();
  }, []);

  const busy = publishStatus === 'publishing';

  function exportCsv() {
    const headers = [
      'Slug', 'Brand', 'Model', 'Year', 'Price', 'Condition', 'BodyType', 'Transmission',
      'Mileage', 'Color', 'Engine', 'FuelType', 'Location', 'Images', 'Description', 'isAvailable',
    ];
    const rows = cars.map((c) => [
      c.slug, c.brand, c.model, c.year, c.price, c.condition, c.bodyType, c.transmission,
      c.mileage ?? '', c.color ?? '', c.engine ?? '', c.fuelType ?? '', c.location ?? '',
      c.images.join(' | '), c.description ?? '', c.isAvailable ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `big-joe-autos-inventory-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function mutateAndPublish(next: Car[]) {
    setCars(next);
    setPublishStatus('publishing');
    setPublishError(null);
    const result = await publishCarsToSheet(next);
    if (result.ok) {
      setPublishStatus('success');
    } else {
      setPublishStatus('error');
      setPublishError(result.error ?? 'Publish failed.');
    }
  }

  function handleFormSave(car: Car) {
    // `editing` holds the pre-edit record (its slug tells us which row this
    // was, even if the slug itself just changed in the form).
    const wasExisting = editing && cars.some((c) => c.slug === editing.slug);
    const next = wasExisting
      ? cars.map((c) => (c.slug === editing!.slug ? car : c))
      : [car, ...cars];
    void mutateAndPublish(next);
    setEditing(null);
  }

  function handleDelete(slug: string) {
    void mutateAndPublish(cars.filter((c) => c.slug !== slug));
  }

  function handleLogout() {
    adminLogout();
    onLoggedOut();
  }

  return (
    <div className="min-h-screen bg-base p-4 sm:p-8">
      <div className="mx-auto max-w-3xl rounded-lg border border-edge bg-surface">
        <div className="flex items-center justify-between border-b border-edge p-5">
          <div>
            <h1 className="font-display text-xl font-bold text-ink">Dealer CMS</h1>
            <p className="tech-label">Big Joe Autos — inventory admin</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md border border-edge px-3 py-1.5 text-xs text-mute hover:border-red/60 hover:text-red-glow"
          >
            <LogOut size={13} /> Log out
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-5">
          {publishStatus !== 'idle' && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-md border p-3 text-xs ${
                publishStatus === 'error'
                  ? 'border-red/40 bg-red/10 text-red-glow'
                  : publishStatus === 'publishing'
                    ? 'border-blue/30 bg-blue/10 text-blue-glow'
                    : 'border-ok/30 bg-ok/10 text-ok'
              }`}
            >
              {publishStatus === 'publishing' && <UploadCloud size={14} className="animate-pulse" />}
              {publishStatus === 'success' && <CheckCircle2 size={14} />}
              {publishStatus === 'error' && <AlertTriangle size={14} />}
              {publishStatus === 'publishing' && 'Publishing to Google Sheet…'}
              {publishStatus === 'success' && 'Published — the Sheet and public site are up to date.'}
              {publishStatus === 'error' &&
                `Publish failed: ${publishError ?? 'unknown error'}. Your change is visible here but NOT saved to the Sheet.`}
            </div>
          )}

          {loadStatus === 'error' && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-red/40 bg-red/10 p-3 text-xs text-red-glow">
              <AlertTriangle size={14} /> {loadError}
              <button onClick={loadInventory} className="ml-auto underline">Retry</button>
            </div>
          )}

          <section className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setEditing(emptyCar)}
              disabled={busy || loadStatus === 'loading'}
              className="flex items-center gap-2 rounded-md border border-edge px-3 py-2 text-sm text-ink hover:border-blue-glow/60 disabled:opacity-50"
            >
              <Plus size={15} /> Add vehicle
            </button>
            <button
              onClick={exportCsv}
              disabled={loadStatus !== 'loaded'}
              className="flex items-center gap-2 rounded-md border border-edge px-3 py-2 text-sm text-ink hover:border-blue-glow/60 disabled:opacity-50"
            >
              <Download size={15} /> Export CSV
            </button>
            <button
              onClick={loadInventory}
              className="flex items-center gap-2 rounded-md border border-edge px-3 py-2 text-sm text-mute hover:text-ink"
            >
              <RefreshCw size={15} className={loadStatus === 'loading' ? 'animate-spin' : ''} /> Refresh
            </button>
          </section>

          <p className="mb-4 flex items-start gap-2 rounded-md border border-blue/20 bg-blue/5 p-3 text-xs text-mute">
            <UploadCloud size={14} className="mt-0.5 shrink-0 text-blue-glow" />
            Adding, editing, or deleting below publishes directly to your Google Sheet and re-syncs the public site
            within about 90 seconds.
          </p>

          {editing && (
            <CarForm car={editing} onCancel={() => setEditing(null)} onSave={handleFormSave} disabled={busy} />
          )}

          <section>
            <h2 className="mb-2 tech-label">Current inventory ({cars.length})</h2>
            {loadStatus === 'loading' ? (
              <p className="p-4 text-center text-sm text-mute">Loading…</p>
            ) : (
              <div className="divide-y divide-edge rounded-md border border-edge">
                {cars.map((car) => (
                  <div key={car.slug} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">
                        {car.brand} {car.model} · {car.year}
                      </p>
                      <p className="text-xs text-mute">{formatNaira(car.price)} · {car.condition} · /{car.slug}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => setEditing(car)}
                        disabled={busy}
                        aria-label={`Edit ${car.brand} ${car.model}`}
                        className="rounded p-2 text-mute hover:text-blue-glow disabled:opacity-50"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(car.slug)}
                        disabled={busy}
                        aria-label={`Delete ${car.brand} ${car.model}`}
                        className="rounded p-2 text-mute hover:text-red-glow disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
                {cars.length === 0 && (
                  <p className="p-4 text-center text-sm text-mute">No vehicles yet. Add one above.</p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function CarForm({
  car,
  onCancel,
  onSave,
  disabled,
}: {
  car: Car;
  onCancel: () => void;
  onSave: (car: Car) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<Car>(car);
  const [slugTouched, setSlugTouched] = useState(Boolean(car.slug));

  const set = <K extends keyof Car>(key: K, value: Car[K]) => setDraft((d) => ({ ...d, [key]: value }));

  function handleBrandModelChange(key: 'brand' | 'model', value: string) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    if (!slugTouched) {
      set('slug', slugify(`${next.brand}-${next.model}-${next.year || ''}`));
    }
  }

  return (
    <section className="mb-6 rounded-md border border-edge bg-surface2 p-4">
      <h3 className="mb-3 tech-label !text-blue-glow">{car.slug ? 'Edit vehicle' : 'Add vehicle'}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectField label="Brand" value={draft.brand} options={BRAND_OPTIONS} onChange={(v) => handleBrandModelChange('brand', v)} />
        <Field label="Model" value={draft.model} onChange={(v) => handleBrandModelChange('model', v)} />
        <Field
          label="Slug (permalink — keep it stable once shared!)"
          value={draft.slug}
          onChange={(v) => {
            setSlugTouched(true);
            set('slug', slugify(v));
          }}
          full
        />
        <SelectField
          label="Year"
          value={String(draft.year)}
          options={YEAR_OPTIONS}
          onChange={(v) => set('year', Number(v) || draft.year)}
          allowOther={false}
        />
        <Field label="Price (NGN)" value={String(draft.price)} onChange={(v) => set('price', Number(v) || 0)} />
        <SelectField label="Condition" value={draft.condition} options={CONDITION_OPTIONS} onChange={(v) => set('condition', v)} />
        <SelectField label="Body type" value={draft.bodyType} options={BODY_TYPE_OPTIONS} onChange={(v) => set('bodyType', v)} />
        <SelectField label="Transmission" value={draft.transmission} options={TRANSMISSION_OPTIONS} onChange={(v) => set('transmission', v)} />
        <SelectField label="Fuel type" value={draft.fuelType ?? ''} options={FUEL_TYPE_OPTIONS} onChange={(v) => set('fuelType', v)} />
        <Field
          label="Mileage (km)"
          value={draft.mileage !== undefined ? String(draft.mileage) : ''}
          onChange={(v) => set('mileage', v ? Number(v) : undefined)}
        />
        <Field label="Color" value={draft.color ?? ''} onChange={(v) => set('color', v)} />
        <Field label="Engine (e.g. 2.5L)" value={draft.engine ?? ''} onChange={(v) => set('engine', v)} />
        <Field label="Location" value={draft.location ?? ''} onChange={(v) => set('location', v)} />
        <ImagesField images={draft.images} onChange={(imgs) => set('images', imgs)} />
        <Field label="Description" value={draft.description ?? ''} onChange={(v) => set('description', v)} full />
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={draft.isAvailable}
            onChange={(e) => set('isAvailable', e.target.checked)}
            className="accent-blue-glow"
          />
          Available for sale
        </label>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-md border border-edge px-4 py-2 text-sm text-mute">
          Cancel
        </button>
        <button
          onClick={() => onSave(draft)}
          disabled={disabled || !draft.brand || !draft.model || !draft.slug}
          className="flex items-center gap-2 rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <UploadCloud size={15} /> Save & publish
        </button>
      </div>
    </section>
  );
}

function ImagesField({ images, onChange }: { images: string[]; onChange: (images: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteValue, setPasteValue] = useState('');

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const token = getAdminToken();
    if (!token) {
      setError('Your session expired — log in again.');
      return;
    }

    setUploading(true);
    setError(null);
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const blob = await upload(`cars/${Date.now()}-${file.name}`, file, {
          access: 'public',
          handleUploadUrl: '/api/admin/upload',
          headers: { Authorization: `Bearer ${token}` },
        });
        uploaded.push(blob.url);
      }
      onChange([...images, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function addPastedUrls() {
    const urls = pasteValue.split(/[|,\n]/).map((s) => s.trim()).filter(Boolean);
    if (urls.length === 0) return;
    onChange([...images, ...urls]);
    setPasteValue('');
  }

  function removeAt(i: number) {
    onChange(images.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col gap-2 text-xs text-mute sm:col-span-2">
      <span>Photos</span>

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {images.map((img, i) => (
            <div key={img + i} className="group relative aspect-square overflow-hidden rounded-md border border-edge bg-base">
              {/* Admin previews only — arbitrary user-picked files, not worth
                  routing through next/image's optimizer for a thumbnail. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X size={12} />
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] text-white">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-edge bg-base px-3 py-4 text-ink hover:border-blue-glow/60">
        {uploading ? (
          <>
            <UploadCloud size={16} className="animate-pulse" /> Uploading…
          </>
        ) : (
          <>
            <ImagePlus size={16} /> Upload photos
          </>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          disabled={uploading}
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />
      </label>

      {error && (
        <p className="flex items-center gap-1.5 text-red-glow">
          <AlertTriangle size={12} /> {error}
        </p>
      )}

      <details className="text-mute">
        <summary className="cursor-pointer select-none">Or paste image URLs instead</summary>
        <div className="mt-2 flex gap-2">
          <input
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            placeholder="https://... (comma or | separated for multiple)"
            className="flex-1 rounded-md border border-edge bg-base px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-blue-glow"
          />
          <button
            type="button"
            onClick={addPastedUrls}
            className="rounded-md border border-edge px-3 py-2 text-sm text-ink hover:border-blue-glow/60"
          >
            Add
          </button>
        </div>
      </details>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  full,
  allowOther = true,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  full?: boolean;
  allowOther?: boolean;
}) {
  const isCustom = allowOther && value !== '' && !options.includes(value);
  const [showCustom, setShowCustom] = useState(isCustom);

  return (
    <div className={`flex flex-col gap-1 text-xs text-mute ${full ? 'sm:col-span-2' : ''}`}>
      <label>{label}</label>
      <select
        value={showCustom ? '__other__' : value}
        onChange={(e) => {
          if (e.target.value === '__other__') {
            setShowCustom(true);
            onChange('');
          } else {
            setShowCustom(false);
            onChange(e.target.value);
          }
        }}
        className="rounded-md border border-edge bg-base px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-blue-glow"
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        {allowOther && <option value="__other__">Other…</option>}
      </select>
      {showCustom && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter custom value"
          autoFocus
          className="rounded-md border border-edge bg-base px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-blue-glow"
        />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 text-xs text-mute ${full ? 'sm:col-span-2' : ''}`}>
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-edge bg-base px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-blue-glow"
      />
    </label>
  );
}
