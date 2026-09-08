'use client';

import { AdminAvatarImage } from '@/components/admin/admin-avatar-image';
import {
  CONTACT_COLORS,
  CONTACT_ICONS,
  CONTACT_LABELS,
  PLAN_COLOR,
  PLAN_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
} from '@/features/admin-users/labels';
import type { AdminManagedUser, AdminUserUpdate } from '@/features/admin-users/types';
import { useAdminUserPhoto } from '@/hooks/use-admin-user-photo';
import { useAdminUserVideo } from '@/hooks/use-admin-user-video';
import {
  Activity,
  AlertTriangle,
  Award,
  Ban,
  CheckCircle,
  ChevronLeft,
  Clock,
  CreditCard,
  Crown,
  Edit2,
  Filter,
  Mail,
  MapPin,
  Phone,
  PlayCircle,
  Save,
  Star,
  Trash2,
  Users,
  Video as VideoIcon,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

type DetailTab = 'profile' | 'activity' | 'subscription' | 'video';

/**
 * Static illustration data, matching legacy's own "Historique de facturation" — there is no
 * real transaction/billing ledger anywhere in the product yet (confirmed: no Transaction/
 * Payment model in the schema), so this stays a mock like legacy's until that gets built.
 */
const MOCK_BILLING_HISTORY = [
  { id: 'b1', label: 'Abonnement Premium — Avril 2026', amount: 9.9, date: '01/04/2026' },
  { id: 'b2', label: 'Abonnement Premium — Mars 2026', amount: 9.9, date: '01/03/2026' },
  { id: 'b3', label: 'Boost profil × 2', amount: 4, date: '15/02/2026' },
];

const EDITABLE_FIELDS = [
  { label: 'Nom complet', field: 'name', icon: Users },
  { label: 'Email', field: 'email', icon: Mail },
  { label: 'Téléphone', field: 'phone', icon: Phone },
  { label: 'Rôle / Métier', field: 'job', icon: Award },
  { label: 'Catégorie', field: 'category', icon: Filter },
  { label: 'Ville', field: 'city', icon: MapPin },
  { label: 'Tarif', field: 'price', icon: CreditCard },
  { label: 'Expérience', field: 'experience', icon: Clock },
] as const;

export function AdminUserDetail({
  user,
  onClose,
  onSave,
  onChangeStatus,
  onDelete,
}: {
  user: AdminManagedUser;
  onClose: () => void;
  onSave: (changes: AdminUserUpdate) => void;
  onChangeStatus: (status: AdminManagedUser['status']) => void;
  onDelete: () => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>('profile');
  const [editMode, setEditMode] = useState(false);
  const [edited, setEdited] = useState<AdminManagedUser>(user);
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const photoUrl = useAdminUserPhoto(user.id, user.image);
  const videoUrl = useAdminUserVideo(user.id, user.video);

  const isBanned = user.status === 'BANNED';

  const detailTabs = [
    { key: 'profile' as const, label: 'Profil', icon: Users },
    { key: 'activity' as const, label: 'Activité', icon: Activity },
    { key: 'subscription' as const, label: 'Abonnement', icon: Crown },
    { key: 'video' as const, label: 'Vidéo', icon: VideoIcon },
  ];

  const handleSave = () => {
    const changes: AdminUserUpdate = {};
    EDITABLE_FIELDS.forEach(({ field }) => {
      if (edited[field] !== user[field]) {
        changes[field] = edited[field] ?? '';
      }
    });
    if (edited.bio !== user.bio) changes.bio = edited.bio ?? '';

    onSave(changes);
    setEditMode(false);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEdited(user);
  };

  return (
    <div className="flex w-full flex-col" style={{ background: '#F5F7FA' }}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-0">
        <div className="mb-5 flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl px-3 py-2 transition-colors"
            style={{
              background: 'white',
              border: '1px solid #E8E8E8',
              color: '#555',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <ChevronLeft size={16} />
            <span>Utilisateurs</span>
          </button>
          <span style={{ color: '#CCC', fontSize: '16px' }}>/</span>
          <div className="flex items-center gap-2">
            <AdminAvatarImage
              photoUrl={photoUrl}
              name={user.name}
              className="h-7 w-7 rounded-lg"
              fontSize={11}
            />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#353535' }}>{user.name}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
              style={{
                background: STATUS_COLOR[user.status] + '18',
                border: `1px solid ${STATUS_COLOR[user.status]}33`,
              }}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ background: STATUS_COLOR[user.status] }}
              />
              <span style={{ fontSize: '12px', color: STATUS_COLOR[user.status], fontWeight: 700 }}>
                {STATUS_LABEL[user.status]}
              </span>
            </div>
            <button
              type="button"
              onClick={() => (editMode ? handleCancelEdit() : setEditMode(true))}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-white"
              style={{
                background: editMode ? '#61BCA6' : '#2F76BB',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              <Edit2 size={14} />
              {editMode ? 'Annuler' : 'Modifier'}
            </button>
          </div>
        </div>

        <div
          className="mb-4 flex shrink-0 items-center gap-4 rounded-2xl p-4"
          style={{ background: 'white', border: '1px solid #F0F0F0' }}
        >
          <div className="relative shrink-0">
            <AdminAvatarImage
              photoUrl={photoUrl}
              name={user.name}
              className="h-16 w-16 rounded-2xl"
              fontSize={26}
            />
            <div
              className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 border-white"
              style={{ background: STATUS_COLOR[user.status] }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p style={{ fontSize: '18px', fontWeight: 800, color: '#1A1A2E' }}>{user.name}</p>
            <p style={{ fontSize: '13px', color: '#2F76BB', fontWeight: 600 }}>
              {user.job ?? 'Membre Matchy+'}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                <Star size={12} color="#F5A623" fill="#F5A623" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#353535' }}>
                  {user.rating}
                </span>
                <span style={{ fontSize: '11px', color: '#888' }}>({user.reviews})</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin size={12} color="#61BCA6" />
                <span style={{ fontSize: '12px', color: '#555' }}>{user.city ?? '—'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Award size={12} color="#2F76BB" />
                <span style={{ fontSize: '12px', color: '#555' }}>
                  {user.experience ?? 'Non renseigné'}
                </span>
              </div>
              <span
                className="rounded-full px-2.5 py-0.5"
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  background: PLAN_COLOR[user.plan] + '20',
                  color: PLAN_COLOR[user.plan],
                }}
              >
                {PLAN_LABEL[user.plan]}
              </span>
            </div>
          </div>
        </div>

        <div
          className="mb-4 flex shrink-0 gap-1 overflow-x-auto"
          style={{ borderBottom: '1px solid #E8E8E8' }}
        >
          {detailTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-1.5 px-4 py-2.5 whitespace-nowrap"
              style={{
                fontSize: '13px',
                fontWeight: activeTab === key ? 700 : 500,
                color: activeTab === key ? '#2F76BB' : '#888',
                background: 'transparent',
                borderBottom: activeTab === key ? '2.5px solid #2F76BB' : '2.5px solid transparent',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div>
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div
                className="rounded-2xl p-5"
                style={{ background: 'white', border: '1px solid #F0F0F0' }}
              >
                <p
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#1A1A2E',
                    marginBottom: '14px',
                  }}
                >
                  Informations personnelles
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {EDITABLE_FIELDS.map(({ label, field, icon: Icon }) => (
                    <div key={field} className="flex flex-col gap-1">
                      <label
                        htmlFor={`field-${field}`}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#888',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {label}
                      </label>
                      {editMode ? (
                        <input
                          id={`field-${field}`}
                          value={edited[field] ?? ''}
                          onChange={(event) =>
                            setEdited({ ...edited, [field]: event.target.value })
                          }
                          className="rounded-xl px-3 py-2 outline-none"
                          style={{
                            fontSize: '13px',
                            background: '#F5F7FA',
                            border: '1.5px solid #D0E4F7',
                            color: '#353535',
                          }}
                        />
                      ) : (
                        <div
                          className="flex items-center gap-2 rounded-xl px-3 py-2"
                          style={{ background: '#F5F7FA' }}
                        >
                          <Icon size={14} color="#888" />
                          <span style={{ fontSize: '13px', color: '#353535' }}>
                            {user[field] ?? (field === 'job' ? 'Membre Matchy+' : 'Non renseigné')}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="rounded-2xl p-5"
                style={{ background: 'white', border: '1px solid #F0F0F0' }}
              >
                <label
                  htmlFor="field-bio"
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#1A1A2E',
                    display: 'block',
                    marginBottom: '10px',
                  }}
                >
                  Biographie
                </label>
                {editMode ? (
                  <textarea
                    id="field-bio"
                    value={edited.bio ?? ''}
                    onChange={(event) => setEdited({ ...edited, bio: event.target.value })}
                    className="w-full resize-none rounded-xl px-3 py-2.5 outline-none"
                    style={{
                      fontSize: '13px',
                      background: '#F5F7FA',
                      border: '1.5px solid #D0E4F7',
                      color: '#353535',
                      minHeight: '90px',
                    }}
                  />
                ) : (
                  <p
                    className="rounded-xl px-3 py-2.5"
                    style={{
                      fontSize: '13px',
                      color: '#444',
                      background: '#F5F7FA',
                      lineHeight: '1.7',
                    }}
                  >
                    {user.bio ?? '—'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div
                  className="rounded-2xl p-5"
                  style={{ background: 'white', border: '1px solid #F0F0F0' }}
                >
                  <p
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#1A1A2E',
                      marginBottom: '10px',
                    }}
                  >
                    Compétences
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {user.interests.length === 0 ? (
                      <span style={{ fontSize: '12px', color: '#AAA' }}>—</span>
                    ) : (
                      user.interests.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full px-3 py-1"
                          style={{
                            fontSize: '12px',
                            background: '#F0F7FF',
                            color: '#2F76BB',
                            border: '1px solid #D6E8FA',
                          }}
                        >
                          {tag}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div
                  className="rounded-2xl p-5"
                  style={{ background: 'white', border: '1px solid #F0F0F0' }}
                >
                  <p
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#1A1A2E',
                      marginBottom: '10px',
                    }}
                  >
                    Modes de contact
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {user.contact_modes.length === 0 ? (
                      <span style={{ fontSize: '12px', color: '#AAA' }}>—</span>
                    ) : (
                      user.contact_modes.map((mode) => {
                        const Icon = CONTACT_ICONS[mode] ?? Phone;
                        const modeColor = CONTACT_COLORS[mode] ?? '#8A8A8A';
                        return (
                          <div
                            key={mode}
                            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
                            style={{
                              background: modeColor + '15',
                              border: `1px solid ${modeColor}33`,
                            }}
                          >
                            <Icon size={14} color={modeColor} />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: modeColor }}>
                              {CONTACT_LABELS[mode] ?? mode}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div
                className="rounded-2xl p-4"
                style={{ border: '1px solid #FFE0E0', background: '#FFF8F8' }}
              >
                <p
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#E74C3C',
                    marginBottom: '10px',
                  }}
                >
                  Zone dangereuse
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBanConfirm(true)}
                    className="flex items-center gap-2 rounded-xl px-4 py-2"
                    style={{
                      background: isBanned ? '#61BCA6' : '#E74C3C',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    {isBanned ? <CheckCircle size={14} /> : <Ban size={14} />}
                    {isBanned ? 'Réactiver' : 'Bannir'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 rounded-xl px-4 py-2"
                    style={{
                      background: '#FFF0F0',
                      color: '#E74C3C',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: '1px solid #FFCCCC',
                    }}
                  >
                    <Trash2 size={14} />
                    Supprimer le compte
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: 'Total matches',
                  value: user.matches,
                  color: '#2F76BB',
                  bg: '#E8F0FA',
                  icon: Zap,
                },
                {
                  label: 'Missions complètes',
                  value: user.missions,
                  color: '#61BCA6',
                  bg: '#E8F7F3',
                  icon: CheckCircle,
                },
                {
                  label: 'Revenus générés',
                  value: `${user.total_earnings} DT`,
                  color: '#F5A623',
                  bg: '#FFF8EB',
                  icon: CreditCard,
                },
                {
                  label: 'Avis reçus',
                  value: user.reviews,
                  color: '#9B59B6',
                  bg: '#F3E8FA',
                  icon: Star,
                },
              ].map(({ label, value, color, bg, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-2xl p-4"
                  style={{ background: 'white', border: '1px solid #F0F0F0' }}
                >
                  <div
                    className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{ background: bg }}
                  >
                    <Icon size={18} color={color} />
                  </div>
                  <p style={{ fontSize: '22px', fontWeight: 800, color: '#1A1A2E' }}>{value}</p>
                  <p style={{ fontSize: '12px', color: '#888' }}>{label}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="space-y-4">
              <div
                className="rounded-2xl p-5"
                style={{
                  background: `linear-gradient(135deg, ${PLAN_COLOR[user.plan]}15, ${PLAN_COLOR[user.plan]}08)`,
                  border: `1.5px solid ${PLAN_COLOR[user.plan]}33`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Crown size={24} color={PLAN_COLOR[user.plan]} />
                    <div>
                      <p style={{ fontSize: '16px', fontWeight: 800, color: '#1A1A2E' }}>
                        {PLAN_LABEL[user.plan]}
                      </p>
                      <p style={{ fontSize: '12px', color: '#888' }}>
                        Inscrit depuis {user.create_at?.slice(0, 10) ?? '—'}
                      </p>
                    </div>
                  </div>
                  <span
                    className="rounded-full px-3 py-1"
                    style={{
                      background: PLAN_COLOR[user.plan],
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    {isBanned ? 'Suspendu' : 'Actif'}
                  </span>
                </div>
              </div>

              <div
                className="rounded-2xl p-4"
                style={{ background: 'white', border: '1px solid #F0F0F0' }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#353535' }}>
                    Historique de facturation
                  </p>
                  <span
                    className="rounded-full px-2 py-0.5"
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      background: '#F5F7FA',
                      color: '#AAA',
                    }}
                    title="Aucun système de paiement réel n'existe encore — ces montants sont illustratifs, comme dans l'ancienne version."
                  >
                    Données d’exemple
                  </span>
                </div>
                <div className="space-y-2.5">
                  {MOCK_BILLING_HISTORY.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5"
                      style={{ background: '#F5F7FA' }}
                    >
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#353535' }}>
                          {item.label}
                        </p>
                        <p style={{ fontSize: '11px', color: '#AAA' }}>{item.date}</p>
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: 700, color: '#FF6B6B' }}>
                        -{item.amount} DT
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'video' && (
            <div className="space-y-4">
              {videoUrl ? (
                <>
                  <div
                    className="relative overflow-hidden rounded-2xl"
                    style={{ background: '#000', aspectRatio: '16/9' }}
                  >
                    <video
                      src={videoUrl}
                      className="h-full w-full object-cover"
                      controls
                      preload="metadata"
                      poster={photoUrl ?? undefined}
                      style={{ display: 'block' }}
                    />
                  </div>
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: 'white', border: '1px solid #F0F0F0' }}
                  >
                    <div className="space-y-2">
                      {[
                        { label: 'Présenté par', value: user.name },
                        { label: 'Rôle présenté', value: user.job ?? '—' },
                        { label: 'Statut', value: isBanned ? 'Masquée (banni)' : 'Visible' },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="flex items-center justify-between rounded-xl px-3 py-2"
                          style={{ background: '#F5F7FA' }}
                        >
                          <span style={{ fontSize: '12px', color: '#888' }}>{label}</span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#353535' }}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center">
                  <PlayCircle size={40} color="#CCC" className="mx-auto mb-3" />
                  <p style={{ fontSize: '14px', color: '#AAA' }}>
                    {user.video ? 'Chargement de la vidéo…' : 'Aucune vidéo de présentation'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {editMode && (
          <div className="mt-2 flex shrink-0 gap-3 pt-4" style={{ borderTop: '1px solid #E8E8E8' }}>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="flex items-center justify-center gap-2 rounded-xl px-6 py-3"
              style={{ background: '#F5F5F5', color: '#888', fontSize: '14px', fontWeight: 700 }}
            >
              <X size={16} />
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-white"
              style={{
                background: 'linear-gradient(90deg, #61BCA6, #2F76BB)',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              <Save size={16} />
              Sauvegarder les modifications
            </button>
          </div>
        )}

        {showBanConfirm && (
          <div
            className="mt-2 shrink-0 rounded-2xl p-5"
            style={{ background: 'white', border: '1.5px solid #FFCCCC' }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: '#FFF0F0' }}
              >
                <AlertTriangle size={20} color="#E74C3C" />
              </div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#353535' }}>
                {isBanned ? 'Réactiver ce compte ?' : 'Bannir cet utilisateur ?'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowBanConfirm(false)}
                className="flex-1 rounded-xl py-2.5"
                style={{ background: '#F5F5F5', color: '#888', fontSize: '13px', fontWeight: 700 }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeStatus(isBanned ? 'ACTIVE' : 'BANNED');
                  setShowBanConfirm(false);
                }}
                className="flex-1 rounded-xl py-2.5 text-white"
                style={{
                  background: isBanned ? '#61BCA6' : '#E74C3C',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                {isBanned ? 'Réactiver' : 'Bannir'}
              </button>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div
            className="mt-2 shrink-0 rounded-2xl p-5"
            style={{ background: 'white', border: '1.5px solid #FFD0D0' }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: '#FFF0F0' }}
              >
                <Trash2 size={18} color="#E74C3C" />
              </div>
              <p style={{ fontSize: '15px', fontWeight: 700, color: '#353535' }}>
                Supprimer définitivement ce compte ?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl py-2.5"
                style={{ background: '#F5F5F5', color: '#888', fontSize: '13px', fontWeight: 700 }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 rounded-xl py-2.5 text-white"
                style={{ background: '#E74C3C', fontSize: '13px', fontWeight: 700 }}
              >
                Supprimer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
