'use client';

import { LocationRequiredOverlay } from '@/components/matching/location-required-overlay';
import { matchyBrand, scoreTierColor } from '@/components/matchy/brand';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { useI18n } from '@/features/i18n/i18n-provider';
import { useLocationGate } from '@/features/location/location-context';
import { fetchSwipeFeed, selectMatching } from '@/features/matching/store/matching-slice';
import { toast } from '@/lib/toast';
import { Filter, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export function SearchView() {
  const { t, locale } = useI18n();
  const dispatch = useAppDispatch();
  const matching = useAppSelector(selectMatching);
  const {
    latitude,
    longitude,
    locationRequired,
    activating,
    accessMessage,
    requestBrowserLocation,
    locationSynced,
  } = useLocationGate();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!locationSynced || latitude == null || longitude == null) return;
    if (!matching.feedLoaded && !matching.feedLoading) {
      void dispatch(fetchSwipeFeed({ latitude, longitude }));
    }
  }, [dispatch, locationSynced, latitude, longitude, matching.feedLoaded, matching.feedLoading]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matching.feed;
    return matching.feed.filter((p) => {
      const hay = [p.name, p.job, p.service_type, p.category, p.city, ...(p.interests || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [matching.feed, query]);

  const title = locale === 'fr' ? 'Recherche' : locale === 'ar' ? 'بحث' : t('search.title');

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      style={{ background: matchyBrand.bg }}
    >
      <div
        className="flex shrink-0 items-center justify-between px-4 py-3 md:px-6"
        style={{ background: 'white', borderBottom: '1px solid #F0F0F0' }}
      >
        <p style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E' }}>{title}</p>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-4 md:px-8">
        {locationRequired && (
          <LocationRequiredOverlay
            message={accessMessage}
            onActivate={() => void requestBrowserLocation()}
            busy={activating}
          />
        )}

        {!locationRequired && (
          <>
            <div className="mb-3 flex items-center gap-2">
              <div
                className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5"
                style={{ background: 'white', border: '1px solid #E0E0E0' }}
              >
                <Search size={16} color="#999" />
                <input
                  className="flex-1 bg-transparent text-[#353535] outline-none"
                  style={{ fontSize: 13 }}
                  placeholder={t('search.placeholder')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button type="button" onClick={() => setQuery('')}>
                    <X size={14} color="#CCC" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => toast.message(t('search.filtersSoon'))}
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'white', border: '1px solid #E0E0E0' }}
              >
                <Filter size={18} color="#5C5C5C" />
              </button>
              <button
                type="button"
                onClick={() =>
                  void dispatch(fetchSwipeFeed({ latitude: latitude!, longitude: longitude! }))
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: matchyBrand.softBlue, color: matchyBrand.blue }}
              >
                <RefreshCw size={16} />
              </button>
            </div>

            <div className="relative flex-1 overflow-y-auto pb-4">
              {matching.feedLoading && !matching.feedLoaded ? (
                <div className="flex h-40 flex-col items-center justify-center text-center">
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#61BCA6]" />
                  <p className="text-[#888]" style={{ fontSize: 14 }}>
                    Chargement des profils...
                  </p>
                </div>
              ) : filtered.length === 0 ? (
                <p
                  className="rounded-3xl bg-white px-5 py-10 text-center text-sm text-[#777]"
                  style={{ border: `1px solid ${matchyBrand.border}` }}
                >
                  {t('search.empty')}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((profile) => {
                    const score = Math.round(profile.match_score);
                    const color = scoreTierColor(score);
                    return (
                      <div
                        key={profile.id}
                        className="rounded-2xl bg-white p-3 shadow-sm"
                        style={{
                          border: profile.liked_me
                            ? `1.5px solid ${matchyBrand.teal}`
                            : `1px solid ${matchyBrand.border}`,
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-bold text-white"
                            style={{ background: matchyBrand.gradient135 }}
                          >
                            {profile.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={profile.image}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              profile.name.slice(0, 1)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate font-bold"
                              style={{ color: matchyBrand.textDark }}
                            >
                              {profile.name}
                            </p>
                            <p className="truncate text-xs" style={{ color: matchyBrand.muted }}>
                              {profile.service_type || profile.job || profile.category}
                            </p>
                            {profile.city && (
                              <p
                                className="truncate text-[11px]"
                                style={{ color: matchyBrand.mutedLight }}
                              >
                                {profile.city}
                                {profile.distance_km != null ? ` · ${profile.distance_km} km` : ''}
                              </p>
                            )}
                          </div>
                          <span
                            className="rounded-full px-2 py-1 text-[11px] font-bold"
                            style={{
                              background: `${color}22`,
                              color,
                              border: `1px solid ${color}55`,
                            }}
                          >
                            {score}%
                          </span>
                        </div>
                        {profile.interests?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {profile.interests.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                style={{
                                  background: matchyBrand.softBlue,
                                  color: matchyBrand.blue,
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
