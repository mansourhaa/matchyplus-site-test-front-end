'use client';

import { Trash2 } from 'lucide-react';

export function ConfirmDeletePopup({
  isOpen,
  userName,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  userName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="animate-in fade-in zoom-in w-96 overflow-hidden rounded-2xl duration-200"
        style={{ background: 'white', boxShadow: '0 24px 48px rgba(0,0,0,0.25)' }}
      >
        <div
          className="flex items-center gap-3 p-4"
          style={{ background: '#FFF0F0', borderBottom: '1px solid #FFD0D0' }}
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: '#E74C3C15' }}
          >
            <Trash2 size={20} color="#E74C3C" />
          </div>
          <div>
            <p style={{ fontSize: '16px', fontWeight: 800, color: '#E74C3C' }}>
              Supprimer l&apos;utilisateur
            </p>
            <p style={{ fontSize: '12px', color: '#888' }}>Cette action est irréversible</p>
          </div>
        </div>

        <div className="p-5">
          <p style={{ fontSize: '14px', color: '#353535', marginBottom: '8px' }}>
            Êtes-vous sûr de vouloir supprimer{' '}
            <strong style={{ color: '#E74C3C' }}>{userName}</strong> ?
          </p>
          <p style={{ fontSize: '12px', color: '#AAA' }}>
            Toutes ses données, ses matches et son historique seront définitivement effacés.
          </p>
        </div>

        <div
          className="flex gap-3 p-4"
          style={{ borderTop: '1px solid #F0F0F0', background: '#FAFBFC' }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl py-2.5 font-semibold transition-all"
            style={{ background: '#F5F5F5', color: '#888', fontSize: '13px' }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-semibold transition-all"
            style={{ background: '#E74C3C', color: 'white', fontSize: '13px' }}
          >
            Supprimer définitivement
          </button>
        </div>
      </div>
    </div>
  );
}
