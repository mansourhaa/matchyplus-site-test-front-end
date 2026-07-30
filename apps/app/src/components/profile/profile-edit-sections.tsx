'use client';

import type { ProfileEducation, ProfileExperience } from '@/features/onboarding/types';
import { Briefcase, Clock, GraduationCap, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

export function ProfileCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-4 mb-3 rounded-2xl bg-white p-4 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

export function SectionHeading({
  icon,
  title,
  onEdit,
  action,
}: {
  icon?: ReactNode;
  title: string;
  onEdit?: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-bold text-[#353535]">{title}</h2>
      </div>
      {action ??
        (onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1 rounded-lg bg-[#E8F0FA] px-2.5 py-1 text-xs font-semibold text-[#2F76BB]"
          >
            <Pencil size={11} /> Modifier
          </button>
        ))}
    </div>
  );
}

export function EditSheet({
  title,
  children,
  onClose,
  error,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  error?: string | null;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/50 md:items-center md:justify-center"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white md:max-w-md md:rounded-3xl"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#F0F0F0] bg-white px-5 py-4">
          <h2 className="text-base font-extrabold text-[#1A1A2E]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={20} color="#888" />
          </button>
        </div>
        <div className="p-5">
          {error && (
            <p className="mb-4 text-xs text-[#E24E59]" role="alert">
              {error}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export function TagEditor({
  title,
  values,
  suggestions,
  maxItems,
  onChange,
  onClose,
  onSave,
  error,
}: {
  title: string;
  values: string[];
  suggestions: string[];
  maxItems?: number;
  onChange: (values: string[]) => void;
  onClose: () => void;
  onSave: (values: string[]) => Promise<boolean>;
  error?: string | null;
}) {
  const [draft, setDraft] = useState(values);
  const [input, setInput] = useState('');
  const add = (raw: string) => {
    const value = raw.trim();
    if (!value || draft.some((entry) => entry.toLowerCase() === value.toLowerCase())) return;
    if (maxItems && draft.length >= maxItems) return;
    setDraft([...draft, value]);
    setInput('');
  };
  return (
    <EditSheet title={title} onClose={onClose} error={error}>
      <div className="mb-3 flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add(input);
            }
          }}
          className="min-w-0 flex-1 rounded-xl border border-[#E0E0E0] bg-[#F5F7FA] px-3 py-2.5 text-[13px] outline-none"
          placeholder={`Ajouter ${title.toLowerCase()}`}
        />
        <button
          type="button"
          onClick={() => add(input)}
          className="rounded-xl bg-[#E8F7F3] px-3 text-xs font-bold text-[#2A8F76]"
        >
          Ajouter
        </button>
      </div>
      {maxItems && (
        <p className="mb-3 text-xs text-[#888]">
          {draft.length}/{maxItems} sélectionnés
        </p>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        {draft.map((value) => (
          <button
            type="button"
            key={value}
            onClick={() => setDraft(draft.filter((entry) => entry !== value))}
            className="flex items-center gap-1 rounded-full border border-[#C5D8F0] bg-[#EEF5FF] px-3 py-1.5 text-xs font-semibold text-[#2F76BB]"
          >
            {value} <X size={12} />
          </button>
        ))}
      </div>
      <p className="mb-2 text-xs font-semibold text-[#777]">Suggestions</p>
      <div className="mb-5 flex flex-wrap gap-2">
        {suggestions
          .filter((suggestion) => !draft.includes(suggestion))
          .map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              onClick={() => add(suggestion)}
              disabled={Boolean(maxItems && draft.length >= maxItems)}
              className="rounded-full border border-[#E0E0E0] bg-[#F5F7FA] px-3 py-2 text-xs font-semibold text-[#555] disabled:opacity-40"
            >
              + {suggestion}
            </button>
          ))}
      </div>
      <SheetSave
        onClick={async () => {
          if (await onSave(draft)) {
            onChange(draft);
            onClose();
          }
        }}
      />
    </EditSheet>
  );
}

export function ChoiceEditor({
  title,
  values,
  selected,
  multiple = false,
  onChange,
  onClose,
  onSave,
  error,
}: {
  title: string;
  values: { value: string; label: string }[];
  selected: string[];
  multiple?: boolean;
  onChange: (values: string[]) => void;
  onClose: () => void;
  onSave: (values: string[]) => Promise<boolean>;
  error?: string | null;
}) {
  // Same local-draft rule as TagEditor: selection only touches this draft. In multiple
  // mode it commits on Enregistrer; in single-select mode there's no separate save
  // button, so each tap attempts to persist immediately, but the parent only learns
  // about it (via onChange) once that attempt actually succeeds.
  const [draft, setDraft] = useState(selected);
  return (
    <EditSheet title={title} onClose={onClose} error={error}>
      <div className="mb-4 space-y-2">
        {values.map((option) => {
          const active = draft.includes(option.value);
          return (
            <button
              type="button"
              key={option.value}
              onClick={() => {
                const next = multiple
                  ? active
                    ? draft.filter((value) => value !== option.value)
                    : [...draft, option.value]
                  : [option.value];
                setDraft(next);
                if (!multiple) {
                  void onSave(next).then((persisted) => {
                    if (persisted) {
                      onChange(next);
                      onClose();
                    }
                  });
                }
              }}
              className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold"
              style={{
                background: active ? '#EEF5FF' : '#F5F7FA',
                border: active ? '1.5px solid #2F76BB' : '1.5px solid transparent',
                color: active ? '#2F76BB' : '#555',
              }}
            >
              {option.label}
              <span
                className="h-5 w-5 rounded-full"
                style={{
                  border: `2px solid ${active ? '#2F76BB' : '#CCC'}`,
                  background: active ? '#2F76BB' : 'white',
                }}
              />
            </button>
          );
        })}
      </div>
      {multiple && (
        <SheetSave
          onClick={async () => {
            if (await onSave(draft)) {
              onChange(draft);
              onClose();
            }
          }}
        />
      )}
    </EditSheet>
  );
}

function SheetSave({ onClick }: { onClick: () => void | Promise<void> }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl bg-[#2F76BB] py-3 text-sm font-bold text-white"
    >
      Enregistrer
    </button>
  );
}

const emptyExperience = (): ProfileExperience => ({
  id: '',
  title: '',
  company: '',
  type: '',
  startDate: '',
  endDate: '',
  current: false,
});

export function ExperienceSection({
  values,
  onChange,
  onSave,
}: {
  values: ProfileExperience[];
  onChange: (values: ProfileExperience[]) => void;
  onSave: (values: ProfileExperience[]) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState<ProfileExperience | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const openEditor = (entry: ProfileExperience) => {
    setSaveError(null);
    setEditing(entry);
  };
  const closeEditor = () => {
    setSaveError(null);
    setEditing(null);
  };
  const persist = async (next: ProfileExperience[]) => {
    setSaving(true);
    setSaveError(null);
    const persisted = await onSave(next);
    setSaving(false);
    if (persisted) {
      onChange(next);
      setEditing(null);
    } else {
      setSaveError('Échec de la sauvegarde. Réessayez.');
    }
  };
  const save = (entry: ProfileExperience) => {
    const value = { ...entry, id: entry.id || `exp-${Date.now()}` };
    void persist(
      entry.id ? values.map((item) => (item.id === entry.id ? value : item)) : [...values, value],
    );
  };
  const remove = () => {
    if (!editing?.id) return;
    void persist(values.filter((item) => item.id !== editing.id));
  };

  return (
    <>
      <ProfileCard>
        <SectionHeading
          title="Expériences professionnelles"
          icon={
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF5FF]">
              <Briefcase size={15} color="#2F76BB" />
            </span>
          }
          action={
            <button
              type="button"
              onClick={() => openEditor(emptyExperience())}
              className="flex items-center gap-1 rounded-lg bg-[#EEF5FF] px-2.5 py-1 text-xs font-semibold text-[#2F76BB]"
            >
              <Plus size={11} /> Ajouter
            </button>
          }
        />
        {values.length ? (
          <div className="space-y-2">
            {values.map((entry) => (
              <button
                type="button"
                key={entry.id}
                onClick={() => openEditor(entry)}
                className="flex w-full gap-3 rounded-xl border border-[#E8F0FA] bg-[#F5F7FA] p-3 text-left"
              >
                <Briefcase size={16} color="#2F76BB" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-[#2F76BB]">
                    {entry.title}
                  </span>
                  <span className="block text-xs text-[#555]">
                    {entry.company || 'Entreprise non renseignée'}
                  </span>
                </span>
                <Pencil size={14} color="#AAA" />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 py-4 text-xs text-[#AAA]">
            <Clock size={24} color="#DDD" />
            <p>Aucune expérience pour l&apos;instant</p>
          </div>
        )}
      </ProfileCard>
      {editing && (
        <ExperienceEditor
          value={editing}
          onSave={save}
          onDelete={editing.id ? remove : undefined}
          onClose={closeEditor}
          saving={saving}
          error={saveError}
        />
      )}
    </>
  );
}

function ExperienceEditor({
  value,
  onSave,
  onDelete,
  onClose,
  saving,
  error,
}: {
  value: ProfileExperience;
  onSave: (value: ProfileExperience) => void;
  onDelete?: () => void;
  onClose: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <EditSheet
      title={value.id ? "Modifier l'expérience" : 'Ajouter une expérience'}
      onClose={onClose}
      error={error}
    >
      <EditorInput
        label="Intitulé du poste *"
        value={draft.title}
        onChange={(title) => setDraft({ ...draft, title })}
      />
      <EditorInput
        label="Entreprise"
        value={draft.company}
        onChange={(company) => setDraft({ ...draft, company })}
      />
      <EditorInput
        label="Type de contrat"
        value={draft.type}
        onChange={(type) => setDraft({ ...draft, type })}
      />
      <div className="grid grid-cols-2 gap-3">
        <EditorInput
          type="month"
          label="Début"
          value={draft.startDate}
          onChange={(startDate) => setDraft({ ...draft, startDate })}
        />
        <EditorInput
          type="month"
          label="Fin"
          value={draft.endDate}
          onChange={(endDate) => setDraft({ ...draft, endDate })}
          disabled={draft.current}
        />
      </div>
      <label className="mb-4 flex items-center gap-2 text-sm text-[#555]">
        <input
          type="checkbox"
          checked={draft.current}
          onChange={(event) =>
            setDraft({
              ...draft,
              current: event.target.checked,
              endDate: event.target.checked ? '' : draft.endDate,
            })
          }
        />
        Poste actuel
      </label>
      <div className="flex gap-2">
        {onDelete && <DeleteButton onClick={onDelete} disabled={saving} />}
        <button
          type="button"
          disabled={!draft.title.trim() || saving}
          onClick={() => onSave({ ...draft, title: draft.title.trim() })}
          className="flex-1 rounded-xl bg-[#2F76BB] py-3 text-sm font-bold text-white disabled:bg-[#DDD]"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </EditSheet>
  );
}

const emptyEducation = (): ProfileEducation => ({
  id: '',
  school: '',
  degree: '',
  field: '',
  startDate: '',
  endDate: '',
  result: '',
});

export function EducationSection({
  values,
  onChange,
  onSave,
}: {
  values: ProfileEducation[];
  onChange: (values: ProfileEducation[]) => void;
  onSave: (values: ProfileEducation[]) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState<ProfileEducation | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const openEditor = (entry: ProfileEducation) => {
    setSaveError(null);
    setEditing(entry);
  };
  const closeEditor = () => {
    setSaveError(null);
    setEditing(null);
  };
  const persist = async (next: ProfileEducation[]) => {
    setSaving(true);
    setSaveError(null);
    const persisted = await onSave(next);
    setSaving(false);
    if (persisted) {
      onChange(next);
      setEditing(null);
    } else {
      setSaveError('Échec de la sauvegarde. Réessayez.');
    }
  };
  const save = (entry: ProfileEducation) => {
    const value = { ...entry, id: entry.id || `edu-${Date.now()}` };
    void persist(
      entry.id ? values.map((item) => (item.id === entry.id ? value : item)) : [...values, value],
    );
  };
  const remove = () => {
    if (!editing?.id) return;
    void persist(values.filter((item) => item.id !== editing.id));
  };

  return (
    <>
      <ProfileCard>
        <SectionHeading
          title="Formations & Diplômes"
          icon={
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0FBF8]">
              <GraduationCap size={15} color="#61BCA6" />
            </span>
          }
          action={
            <button
              type="button"
              onClick={() => openEditor(emptyEducation())}
              className="flex items-center gap-1 rounded-lg bg-[#E8F7F3] px-2.5 py-1 text-xs font-semibold text-[#2A8F76]"
            >
              <Plus size={11} /> Ajouter
            </button>
          }
        />
        {values.length ? (
          values.map((entry) => (
            <button
              type="button"
              key={entry.id}
              onClick={() => openEditor(entry)}
              className="mb-2 flex w-full gap-3 rounded-xl border border-[#E8F0FA] bg-[#F5F7FA] p-3 text-left"
            >
              <GraduationCap size={16} color="#61BCA6" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold text-[#2A8F76]">
                  {entry.school}
                </span>
                <span className="block text-xs text-[#555]">
                  {entry.degree || entry.field || 'Formation'}
                </span>
              </span>
              <Pencil size={14} color="#AAA" />
            </button>
          ))
        ) : (
          <div className="flex flex-col items-center gap-1 py-4 text-xs text-[#AAA]">
            <GraduationCap size={24} color="#DDD" />
            <p>Aucune formation pour l&apos;instant</p>
          </div>
        )}
      </ProfileCard>
      {editing && (
        <EditSheet
          title={editing.id ? 'Modifier la formation' : 'Ajouter une formation'}
          onClose={closeEditor}
          error={saveError}
        >
          <EducationEditor
            value={editing}
            onSave={save}
            onDelete={editing.id ? remove : undefined}
            saving={saving}
          />
        </EditSheet>
      )}
    </>
  );
}

function EducationEditor({
  value,
  onSave,
  onDelete,
  saving,
}: {
  value: ProfileEducation;
  onSave: (value: ProfileEducation) => void;
  onDelete?: () => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <>
      <EditorInput
        label="École / Établissement *"
        value={draft.school}
        onChange={(school) => setDraft({ ...draft, school })}
      />
      <EditorInput
        label="Diplôme"
        value={draft.degree}
        onChange={(degree) => setDraft({ ...draft, degree })}
      />
      <EditorInput
        label="Domaine d'études"
        value={draft.field}
        onChange={(field) => setDraft({ ...draft, field })}
      />
      <div className="grid grid-cols-2 gap-3">
        <EditorInput
          type="month"
          label="Début"
          value={draft.startDate}
          onChange={(startDate) => setDraft({ ...draft, startDate })}
        />
        <EditorInput
          type="month"
          label="Fin"
          value={draft.endDate}
          onChange={(endDate) => setDraft({ ...draft, endDate })}
        />
      </div>
      <EditorInput
        label="Mention / Résultat"
        value={draft.result}
        onChange={(result) => setDraft({ ...draft, result })}
      />
      <div className="flex gap-2">
        {onDelete && <DeleteButton onClick={onDelete} disabled={saving} />}
        <button
          type="button"
          disabled={!draft.school.trim() || saving}
          onClick={() => onSave({ ...draft, school: draft.school.trim() })}
          className="flex-1 rounded-xl bg-[#61BCA6] py-3 text-sm font-bold text-white disabled:bg-[#DDD]"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </>
  );
}

function EditorInput({
  label,
  value,
  onChange,
  type = 'text',
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="mb-4 block text-xs text-[#888]">
      {label}
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-xl border border-[#E0E0E0] bg-[#F5F7FA] px-4 py-3 text-sm text-[#353535] outline-none disabled:opacity-50"
      />
    </label>
  );
}

function DeleteButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-[#FEE2E2] px-4 text-[#E24E59] disabled:opacity-50"
      aria-label="Supprimer"
    >
      <Trash2 size={16} />
    </button>
  );
}
