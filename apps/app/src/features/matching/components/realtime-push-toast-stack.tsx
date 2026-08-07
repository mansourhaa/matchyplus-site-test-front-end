'use client';

import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media-url';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye } from 'lucide-react';

import type { PushToastItem } from '../types';

function PushToastCard({ item }: { item: PushToastItem }) {
  const photo = useAuthenticatedMediaUrl(item.viewerImage);

  return (
    <motion.div
      initial={{ opacity: 0, y: -24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -18, scale: 0.98 }}
      transition={{ type: 'spring', damping: 22, stiffness: 270 }}
      className="pointer-events-auto rounded-2xl p-3"
      style={{
        background: 'white',
        border: '1px solid #D0E4F7',
        boxShadow: '0 12px 30px rgba(0,0,0,0.16)',
      }}
    >
      <div className="flex items-start gap-3">
        {photo.url ? (
          <div
            className="h-9 w-9 shrink-0 overflow-hidden rounded-full"
            style={{ border: '1px solid #DCE7F2' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt=""
              className="h-full w-full object-cover"
              style={{ filter: 'blur(3px)' }}
            />
          </div>
        ) : (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ background: '#E8F0FA' }}
          >
            <Eye size={17} color="#2F76BB" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate" style={{ fontSize: 13, fontWeight: 800, color: '#253044' }}>
            {item.title}
          </p>
          <p style={{ fontSize: 12, color: '#5E6980', marginTop: 2, lineHeight: 1.4 }}>
            {item.body}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/** Transient, non-clickable push cards for realtime events — auto-dismissed by the caller. */
export function RealtimePushToastStack({ items }: { items: PushToastItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-3 right-3 z-[60]">
      <div className="w-full max-w-sm space-y-2">
        <AnimatePresence>
          {items.map((item) => (
            <PushToastCard key={item.id} item={item} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
