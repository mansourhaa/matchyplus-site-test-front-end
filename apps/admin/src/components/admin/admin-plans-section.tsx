'use client';

import type { AdminPlan, AdminPlanUpdate, PlanLimitField } from '@/features/admin-plans/types';
import { formatLimit, formatPrice } from '@/features/admin-plans/types';
import {
  Infinity as InfinityIcon,
  Check,
  CheckCircle,
  Crown,
  Plus,
  Save,
  Sliders,
  Star,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';

type EditorTab = 'general' | 'features' | 'limits' | 'preview';

const PRESET_COLORS = [
  '#888888',
  '#2F76BB',
  '#F5A623',
  '#61BCA6',
  '#9B59B6',
  '#E74C3C',
  '#1ABC9C',
  '#E67E22',
];

const LIMIT_ROWS: { field: PlanLimitField; label: string; description: string }[] = [
  { field: 'swipes_per_day', label: 'Swipes par jour', description: '-1 = illimité' },
  {
    field: 'profiles_per_category',
    label: 'Profils par catégorie',
    description: 'Profils visibles dans chaque catégorie',
  },
  { field: 'messages_per_day', label: 'Messages par jour', description: 'Messages envoyés / 24h' },
  {
    field: 'actions_per_day',
    label: 'Actions libres par jour',
    description: 'Actions de matching gratuites',
  },
  { field: 'boosts_per_month', label: 'Boosts par mois', description: '0 = aucun' },
  {
    field: 'super_connects_per_month',
    label: 'Super Connexions par mois',
    description: '0 = aucune',
  },
];

const EDITOR_TABS: { key: EditorTab; label: string }[] = [
  { key: 'general', label: 'Général' },
  { key: 'features', label: 'Fonctionnalités' },
  { key: 'limits', label: 'Limites' },
  { key: 'preview', label: 'Aperçu' },
];

function LimitRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const isUnlimited = value === -1;
  const inputId = `limit-${label}`;

  return (
    <div
      className="flex flex-col gap-2 rounded-xl p-3"
      style={{ background: '#F5F7FA', border: '1px solid #EBEBEB' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <label htmlFor={inputId} style={{ fontSize: '13px', fontWeight: 600, color: '#353535' }}>
            {label}
          </label>
          <p style={{ fontSize: '11px', color: '#AAA' }}>{description}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(isUnlimited ? 10 : -1)}
          className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1"
          style={{
            fontSize: '11px',
            fontWeight: 700,
            background: isUnlimited ? '#E8F7F3' : '#F0F0F0',
            color: isUnlimited ? '#61BCA6' : '#888',
            border: isUnlimited ? '1px solid #C0EAE0' : '1px solid #E0E0E0',
          }}
        >
          <InfinityIcon size={12} />
          {isUnlimited ? 'Illimité' : 'Limité'}
        </button>
      </div>
      {!isUnlimited && (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            value={Math.max(0, value)}
            onChange={(event) => onChange(Number(event.target.value))}
            className="flex-1"
            style={{ accentColor: '#2F76BB' }}
            aria-label={`${label} (curseur)`}
          />
          <input
            id={inputId}
            type="number"
            min={0}
            value={String(Math.max(0, value))}
            onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
            className="w-16 rounded-lg px-2 py-1 text-center outline-none"
            style={{
              fontSize: '13px',
              fontWeight: 700,
              background: 'white',
              border: '1.5px solid #D0E4F7',
              color: '#2F76BB',
            }}
          />
        </div>
      )}
    </div>
  );
}

function AppPreviewCard({ plan }: { plan: AdminPlan }) {
  return (
    <div
      className="rounded-3xl p-5"
      style={{ background: 'white', border: `2px solid ${plan.color}`, maxWidth: '320px' }}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-2xl"
          style={{ background: plan.color + '20' }}
        >
          <Crown size={20} color={plan.color} />
        </div>
        {plan.badge && (
          <span
            className="rounded-full px-2.5 py-1"
            style={{ fontSize: '11px', fontWeight: 800, background: plan.color, color: 'white' }}
          >
            {plan.badge}
          </span>
        )}
      </div>
      <p style={{ fontSize: '20px', fontWeight: 900, color: '#1A1A2E', marginTop: '12px' }}>
        {plan.name}
      </p>
      <p style={{ fontSize: '12px', color: '#888' }}>{plan.description}</p>
      <p style={{ fontSize: '26px', fontWeight: 900, color: plan.color, marginTop: '10px' }}>
        {formatPrice(plan.price)}
        {plan.price > 0 && (
          <span style={{ fontSize: '12px', color: '#AAA', fontWeight: 600 }}> /mois</span>
        )}
      </p>
      {plan.trial_days > 0 && (
        <p style={{ fontSize: '11px', color: '#61BCA6', fontWeight: 700 }}>
          {plan.trial_days} jours d&apos;essai offerts
        </p>
      )}
      <div className="mt-4 space-y-2">
        {plan.features.map((feature) => (
          <div key={feature} className="flex items-start gap-2">
            <Check size={14} color={plan.color} className="mt-0.5 shrink-0" />
            <span style={{ fontSize: '12px', color: '#555' }}>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminPlansSection({
  plans,
  saving,
  savedAt,
  onSave,
}: {
  plans: AdminPlan[];
  saving: boolean;
  savedAt: string | null;
  onSave: (id: AdminPlan['id'], changes: AdminPlanUpdate) => Promise<boolean>;
}) {
  const [selectedId, setSelectedId] = useState<AdminPlan['id'] | null>(null);
  // `null` means "no local edits" — the server's copy is shown as-is. Deriving the shown
  // plan this way avoids syncing state to props in an effect.
  const [draft, setDraft] = useState<AdminPlan | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('general');
  const [newFeature, setNewFeature] = useState('');

  const selected = plans.find((plan) => plan.id === selectedId) ?? plans[0] ?? null;

  if (!selected) {
    return <p style={{ fontSize: '13px', color: '#AAA' }}>Chargement des forfaits…</p>;
  }

  const edited = draft?.id === selected.id ? draft : selected;
  const hasChanges = JSON.stringify(edited) !== JSON.stringify(selected);

  const change = (patch: Partial<AdminPlan>) => setDraft({ ...edited, ...patch });

  const selectPlan = (plan: AdminPlan) => {
    setSelectedId(plan.id);
    setDraft(null);
    setActiveTab('general');
  };

  const handleSave = async () => {
    const { id, sort_order, ...changes } = edited;
    const ok = await onSave(id, changes);
    // Drop the draft so the server's stored copy becomes the source of truth again.
    if (ok) setDraft(null);
  };

  const addFeature = () => {
    const trimmed = newFeature.trim();
    if (!trimmed) return;
    change({ features: [...edited.features, trimmed] });
    setNewFeature('');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isSelected = plan.id === selected.id;
          return (
            <div
              key={plan.id}
              role="button"
              tabIndex={0}
              onClick={() => selectPlan(plan)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') selectPlan(plan);
              }}
              className="cursor-pointer rounded-2xl p-4 transition-all"
              style={{
                background: 'white',
                border: isSelected ? `2px solid ${plan.color}` : '1px solid #F0F0F0',
                opacity: plan.is_active ? 1 : 0.6,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-xl"
                    style={{ background: plan.color + '20' }}
                  >
                    <Crown size={16} color={plan.color} />
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: '#1A1A2E' }}>
                      {plan.name}
                    </p>
                    <p style={{ fontSize: '11px', color: '#888' }}>{formatPrice(plan.price)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`${plan.is_active ? 'Désactiver' : 'Activer'} ${plan.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSave(plan.id, { is_active: !plan.is_active });
                  }}
                >
                  {plan.is_active ? (
                    <ToggleRight size={26} color="#61BCA6" />
                  ) : (
                    <ToggleLeft size={26} color="#CCC" />
                  )}
                </button>
              </div>
              {plan.badge && (
                <span
                  className="mt-2 inline-block rounded-full px-2 py-0.5"
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    background: plan.color + '20',
                    color: plan.color,
                  }}
                >
                  {plan.badge}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl" style={{ background: 'white', border: '1px solid #F0F0F0' }}>
        <div
          className="flex items-center justify-between px-5 pt-4"
          style={{ borderBottom: '1px solid #F0F0F0' }}
        >
          <div className="flex gap-1 overflow-x-auto">
            {EDITOR_TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className="px-4 py-2.5 whitespace-nowrap"
                style={{
                  fontSize: '13px',
                  fontWeight: activeTab === key ? 700 : 500,
                  color: activeTab === key ? edited.color : '#888',
                  borderBottom:
                    activeTab === key ? `2px solid ${edited.color}` : '2px solid transparent',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {savedAt && !hasChanges && (
            <span
              className="flex items-center gap-1"
              style={{ fontSize: '12px', color: '#61BCA6', fontWeight: 700 }}
            >
              <CheckCircle size={13} />
              Enregistré
            </span>
          )}
        </div>

        <div className="p-5">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="plan-name" style={labelStyle}>
                    Nom du forfait
                  </label>
                  <input
                    id="plan-name"
                    value={edited.name}
                    onChange={(event) => change({ name: event.target.value })}
                    style={inputStyle}
                    className="rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="plan-price" style={labelStyle}>
                    Prix (DT / mois)
                  </label>
                  <input
                    id="plan-price"
                    type="number"
                    min={0}
                    step={0.1}
                    value={String(edited.price)}
                    onChange={(event) => change({ price: Math.max(0, Number(event.target.value)) })}
                    style={inputStyle}
                    className="rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="plan-badge" style={labelStyle}>
                    Badge
                  </label>
                  <input
                    id="plan-badge"
                    value={edited.badge}
                    placeholder="Populaire"
                    onChange={(event) => change({ badge: event.target.value })}
                    style={inputStyle}
                    className="rounded-xl px-3 py-2 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="plan-trial" style={labelStyle}>
                    Jours d&apos;essai
                  </label>
                  <input
                    id="plan-trial"
                    type="number"
                    min={0}
                    value={String(edited.trial_days)}
                    onChange={(event) =>
                      change({ trial_days: Math.max(0, Number(event.target.value)) })
                    }
                    style={inputStyle}
                    className="rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="plan-description" style={labelStyle}>
                  Description
                </label>
                <textarea
                  id="plan-description"
                  value={edited.description}
                  onChange={(event) => change({ description: event.target.value })}
                  style={{ ...inputStyle, minHeight: '70px' }}
                  className="resize-none rounded-xl px-3 py-2 outline-none"
                />
              </div>

              <div>
                <p style={labelStyle}>Couleur</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Couleur ${color}`}
                      onClick={() => change({ color })}
                      className="h-8 w-8 rounded-lg"
                      style={{
                        background: color,
                        border: edited.color === color ? '3px solid #1A1A2E' : '1px solid #E0E0E0',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-3">
              {edited.features.length === 0 && (
                <p style={{ fontSize: '13px', color: '#AAA' }}>Aucune fonctionnalité listée.</p>
              )}
              {edited.features.map((feature, index) => (
                <div
                  key={`${feature}-${index}`}
                  className="flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{ background: '#F5F7FA', border: '1px solid #EBEBEB' }}
                >
                  <Star size={13} color={edited.color} className="shrink-0" />
                  <input
                    value={feature}
                    aria-label={`Fonctionnalité ${index + 1}`}
                    onChange={(event) => {
                      const features = [...edited.features];
                      features[index] = event.target.value;
                      change({ features });
                    }}
                    className="flex-1 bg-transparent outline-none"
                    style={{ fontSize: '13px', color: '#353535' }}
                  />
                  <button
                    type="button"
                    aria-label={`Supprimer la fonctionnalité ${index + 1}`}
                    onClick={() =>
                      change({ features: edited.features.filter((_, i) => i !== index) })
                    }
                  >
                    <Trash2 size={14} color="#E74C3C" />
                  </button>
                </div>
              ))}

              <div className="flex gap-2">
                <input
                  value={newFeature}
                  aria-label="Nouvelle fonctionnalité"
                  placeholder="Ajouter une fonctionnalité…"
                  onChange={(event) => setNewFeature(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addFeature();
                    }
                  }}
                  style={inputStyle}
                  className="flex-1 rounded-xl px-3 py-2 outline-none"
                />
                <button
                  type="button"
                  onClick={addFeature}
                  className="flex items-center gap-1 rounded-xl px-4"
                  style={{
                    background: edited.color,
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  <Plus size={14} />
                  Ajouter
                </button>
              </div>
            </div>
          )}

          {activeTab === 'limits' && (
            <div className="space-y-3">
              <div className="mb-1 flex items-center gap-2">
                <Sliders size={14} color="#888" />
                <p style={{ fontSize: '12px', color: '#888' }}>
                  Basculez sur « Illimité » ou fixez une valeur.
                </p>
              </div>
              {LIMIT_ROWS.map(({ field, label, description }) => (
                <LimitRow
                  key={field}
                  label={label}
                  description={description}
                  value={edited[field]}
                  onChange={(value) => change({ [field]: value } as Partial<AdminPlan>)}
                />
              ))}
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-3">
              <p style={{ fontSize: '12px', color: '#888' }}>
                Aperçu de la carte telle qu&apos;elle apparaît dans l&apos;application.
              </p>
              <AppPreviewCard plan={edited} />
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {LIMIT_ROWS.map(({ field, label }) => (
                  <div key={field} className="rounded-xl p-3" style={{ background: '#F5F7FA' }}>
                    <p style={{ fontSize: '11px', color: '#888' }}>{label}</p>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: '#1A1A2E' }}>
                      {formatLimit(edited[field])}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {hasChanges && (
          <div
            className="flex gap-3 px-5 py-4"
            style={{ borderTop: '1px solid #F0F0F0', background: '#FAFBFC' }}
          >
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5"
              style={{ background: '#F5F5F5', color: '#888', fontSize: '13px', fontWeight: 700 }}
            >
              <X size={15} />
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-white"
              style={{
                background: saving ? '#9BBEDD' : 'linear-gradient(90deg, #61BCA6, #2F76BB)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              <Save size={15} />
              {saving ? 'Enregistrement…' : 'Enregistrer le forfait'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const inputStyle: React.CSSProperties = {
  fontSize: '13px',
  background: '#F5F7FA',
  border: '1.5px solid #D0E4F7',
  color: '#353535',
};
