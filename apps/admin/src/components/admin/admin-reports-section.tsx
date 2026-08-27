'use client';

import { REPORT_STATUS_COLOR, REPORT_STATUS_LABEL } from '@/features/admin-reports/labels';
import type { AdminReport, ReportStatus } from '@/features/admin-reports/types';
import { STATUS_COLOR, STATUS_LABEL } from '@/features/admin-users/labels';
import type { UserStatus } from '@/features/admin-users/types';
import { useAdminUserPhoto } from '@/hooks/use-admin-user-photo';
import { Ban, CheckCircle, Flag, ShieldCheck, UserRound, XCircle } from 'lucide-react';

const STATUS_FILTERS: { key: 'all' | ReportStatus; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'PENDING', label: 'En attente' },
  { key: 'REVIEWED', label: 'Examinés' },
  { key: 'RESOLVED', label: 'Résolus' },
  { key: 'DISMISSED', label: 'Rejetés' },
];

// Actions offered per report, each moving it to a treatment state.
const REPORT_ACTIONS: { status: ReportStatus; label: string; icon: typeof CheckCircle }[] = [
  { status: 'REVIEWED', label: 'Examiné', icon: ShieldCheck },
  { status: 'RESOLVED', label: 'Résolu', icon: CheckCircle },
  { status: 'DISMISSED', label: 'Rejeter', icon: XCircle },
];

function Avatar({
  id,
  name,
  image,
  size = 40,
}: {
  id: string;
  name: string;
  image: string | null;
  size?: number;
}) {
  const photoUrl = useAdminUserPhoto(id, image);

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className="rounded-xl object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-xl"
      style={{ width: size, height: size, background: 'linear-gradient(135deg, #2F76BB, #61BCA6)' }}
    >
      <span className="text-white" style={{ fontSize: size * 0.4, fontWeight: 800 }}>
        {name.charAt(0)}
      </span>
    </div>
  );
}

function ReportRow({
  report,
  onSetStatus,
}: {
  report: AdminReport;
  onSetStatus: (id: string, status: ReportStatus) => void;
}) {
  return (
    <div className="rounded-xl p-3" style={{ background: '#F5F7FA', border: '1px solid #EEE' }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserRound size={14} color="#888" />
          <span style={{ fontSize: '12px', color: '#888' }}>Signalé par</span>
          <Avatar
            id={report.reporter.id}
            name={report.reporter.name}
            image={report.reporter.image}
            size={22}
          />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#353535' }}>
            {report.reporter.name}
          </span>
          <span style={{ fontSize: '11px', color: '#AAA' }}>{report.reporter.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5"
            style={{
              fontSize: '11px',
              fontWeight: 700,
              background: REPORT_STATUS_COLOR[report.status] + '20',
              color: REPORT_STATUS_COLOR[report.status],
            }}
          >
            {REPORT_STATUS_LABEL[report.status]}
          </span>
          <span style={{ fontSize: '11px', color: '#AAA' }}>
            {new Date(report.create_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      <p style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A2E', marginTop: '8px' }}>
        {report.reason}
      </p>
      {report.details && (
        <p style={{ fontSize: '13px', color: '#555', marginTop: '2px' }}>{report.details}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {REPORT_ACTIONS.map(({ status, label, icon: Icon }) => {
          const active = report.status === status;
          return (
            <button
              key={status}
              type="button"
              disabled={active}
              onClick={() => onSetStatus(report.id, status)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                background: active ? REPORT_STATUS_COLOR[status] : 'white',
                color: active ? 'white' : REPORT_STATUS_COLOR[status],
                border: `1px solid ${REPORT_STATUS_COLOR[status]}${active ? '' : '40'}`,
                cursor: active ? 'default' : 'pointer',
              }}
            >
              <Icon size={13} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AdminReportsSection({
  groups,
  statusFilter,
  loading,
  onFilterChange,
  onSetStatus,
  onBanReported,
}: {
  groups: { reported: AdminReport['reported']; reports: AdminReport[] }[];
  statusFilter: 'all' | ReportStatus;
  loading: boolean;
  onFilterChange: (status: 'all' | ReportStatus) => void;
  onSetStatus: (id: string, status: ReportStatus) => void;
  onBanReported: (reportedId: string, next: UserStatus) => void;
}) {
  const totalReports = groups.reduce((sum, group) => sum + group.reports.length, 0);

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap items-center gap-2 rounded-2xl p-3"
        style={{ background: 'white', border: '1px solid #F0F0F0' }}
      >
        {STATUS_FILTERS.map(({ key, label }) => {
          const active = statusFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onFilterChange(key)}
              className="rounded-xl px-3 py-1.5"
              style={{
                fontSize: '13px',
                fontWeight: active ? 700 : 500,
                background: active ? '#2F76BB' : '#F5F7FA',
                color: active ? 'white' : '#555',
              }}
            >
              {label}
            </button>
          );
        })}
        <span className="ml-auto" style={{ fontSize: '13px', color: '#888' }}>
          {groups.length} utilisateur{groups.length > 1 ? 's' : ''} signalé
          {groups.length > 1 ? 's' : ''} · {totalReports} signalement{totalReports > 1 ? 's' : ''}
        </span>
      </div>

      {loading && groups.length === 0 && (
        <p style={{ fontSize: '13px', color: '#AAA' }}>Chargement des signalements…</p>
      )}

      {!loading && groups.length === 0 && (
        <div
          className="flex flex-col items-center justify-center rounded-2xl p-12 text-center"
          style={{ background: 'white', border: '1px solid #F0F0F0' }}
        >
          <div
            className="mb-3 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: '#F0F0F0' }}
          >
            <Flag size={24} color="#CCC" />
          </div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#888' }}>
            Aucun signalement pour ce filtre
          </p>
        </div>
      )}

      {groups.map(({ reported, reports }) => {
        const pending = reports.filter((report) => report.status === 'PENDING').length;
        const isBanned = reported.status === 'BANNED';
        return (
          <div
            key={reported.id}
            className="overflow-hidden rounded-2xl"
            style={{ background: 'white', border: '1px solid #F0F0F0' }}
          >
            {/* Reported-user header: the "per user" grouping the admin asked for. */}
            <div
              className="flex flex-wrap items-center gap-3 p-4"
              style={{ background: '#FFF8F8', borderBottom: '1px solid #FFECEC' }}
            >
              <Avatar id={reported.id} name={reported.name} image={reported.image} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p style={{ fontSize: '15px', fontWeight: 800, color: '#1A1A2E' }}>
                    {reported.name}
                  </p>
                  <span
                    className="flex items-center gap-1 rounded-full px-2 py-0.5"
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      background: STATUS_COLOR[reported.status] + '20',
                      color: STATUS_COLOR[reported.status],
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: STATUS_COLOR[reported.status] }}
                    />
                    {STATUS_LABEL[reported.status]}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#888' }}>
                  {[reported.job, reported.city].filter(Boolean).join(' · ') || reported.email}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p style={{ fontSize: '18px', fontWeight: 800, color: '#E74C3C' }}>
                    {reports.length}
                  </p>
                  <p style={{ fontSize: '11px', color: '#888' }}>
                    signalement{reports.length > 1 ? 's' : ''}
                    {pending > 0 ? ` · ${pending} en attente` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onBanReported(reported.id, isBanned ? 'ACTIVE' : 'BANNED')}
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-white"
                  style={{
                    background: isBanned ? '#61BCA6' : '#E74C3C',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  {isBanned ? <CheckCircle size={14} /> : <Ban size={14} />}
                  {isBanned ? 'Réactiver' : 'Bannir'}
                </button>
              </div>
            </div>

            <div className="space-y-2 p-4">
              {reports.map((report) => (
                <ReportRow key={report.id} report={report} onSetStatus={onSetStatus} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
