'use client';

import { AuthenticatedProfileAvatar } from '@/components/matchy/authenticated-profile-image';
import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { selectAuth } from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
import { ChatIcebreakers } from '@/features/messaging/components/chat-icebreakers';
import { ChatOptionsMenu } from '@/features/messaging/components/chat-options-menu';
import {
  clearSendError,
  fetchConversation,
  fetchMessages,
  selectMessaging,
  sendMessage,
  sendTyping,
  setActiveConversation,
  toggleMessageLike,
  uploadVoiceNote,
} from '@/features/messaging/store/messaging-slice';
import { useAuthenticatedMediaUrl } from '@/hooks/use-authenticated-media-url';
import { shouldAbortMicAcquire } from '@/lib/mic-conversation-binding';
import { ChevronLeft, Heart, Loader2, Mic, Pause, Play, Send, Trash2, Volume2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

function VoiceBubble({ mediaUrl, isMine }: { mediaUrl: string | null; isMine: boolean }) {
  const { url, loading } = useAuthenticatedMediaUrl(mediaUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current || !url) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      void audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && isFinite(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-1 py-1">
        <Loader2 size={16} className="animate-spin opacity-80" />
        <span className="text-xs font-medium opacity-80">Loading voice note…</span>
      </div>
    );
  }

  if (!url) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex max-w-[240px] min-w-[180px] items-center gap-2.5 py-0.5">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="hidden"
      />

      {/* Play / Pause Pill */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-xs transition-transform active:scale-95"
        style={{
          background: isMine ? 'rgba(255, 255, 255, 0.25)' : matchyBrand.softBlue,
          color: isMine ? 'white' : matchyBrand.blue,
        }}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause size={14} fill="currentColor" />
        ) : (
          <Play size={14} className="ml-0.5" fill="currentColor" />
        )}
      </button>

      {/* Waveform & Scrubber */}
      <div className="min-w-0 flex-1">
        <div
          className="relative flex h-5 cursor-pointer items-center gap-0.5"
          onClick={(e) => {
            e.stopPropagation();
            if (!audioRef.current || duration <= 0) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const targetRatio = Math.max(0, Math.min(1, clickX / rect.width));
            audioRef.current.currentTime = targetRatio * duration;
            setCurrentTime(audioRef.current.currentTime);
          }}
        >
          {[30, 60, 90, 45, 80, 100, 50, 70, 85, 40, 65, 95, 55, 35, 75, 45, 60].map(
            (h, i, arr) => {
              const barRatio = (i / arr.length) * 100;
              const isPlayed = barRatio <= progressPercent;
              return (
                <span
                  key={i}
                  className="w-1 rounded-full transition-colors"
                  style={{
                    height: `${Math.max(4, (h * 16) / 100)}px`,
                    background: isMine
                      ? isPlayed
                        ? 'white'
                        : 'rgba(255, 255, 255, 0.4)'
                      : isPlayed
                        ? matchyBrand.blue
                        : '#CBD5E1',
                  }}
                />
              );
            },
          )}
        </div>

        {/* Time info */}
        <div className="flex items-center justify-between font-mono text-[10px] leading-none opacity-85">
          <span>{formatTime(currentTime)}</span>
          <span>{duration > 0 ? formatTime(duration) : '0:00'}</span>
        </div>
      </div>
    </div>
  );
}

type ChatThreadProps = {
  conversationId: string;
};

export function ChatThread({ conversationId }: ChatThreadProps) {
  const { t, dir } = useI18n();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const auth = useAppSelector(selectAuth);
  const messaging = useAppSelector(selectMessaging);
  const [draft, setDraft] = useState('');
  const [recording, setRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingGenerationRef = useRef(0);
  const acquireEpochRef = useRef(0);
  const acquireInFlightRef = useRef(false);
  const activeRecordingSessionRef = useRef<{
    conversationId: string;
    uploadOnStop: boolean;
  } | null>(null);
  const conversationIdRef = useRef(conversationId);
  const myUserId = auth.user?.id;

  // Mirrored prop for async mic guard — must update before effects flush on thread switch.
  // https://react.dev/reference/react/useRef#avoiding-recreating-the-ref-contents
  /* eslint-disable react-hooks/refs -- synchronous mirror + epoch bump for getUserMedia guard */
  if (conversationIdRef.current !== conversationId) {
    conversationIdRef.current = conversationId;
    acquireEpochRef.current += 1;
    acquireInFlightRef.current = false;
    const session = activeRecordingSessionRef.current;
    if (session) session.uploadOnStop = false;
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // Safe noop
      }
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }
  /* eslint-enable react-hooks/refs */

  /**
   * Abort in-flight mic acquire or active recording.
   * Do not bump recording generation / clear uploadOnStop for a deliberate stop
   * whose onstop is still pending (including when a new acquire is in flight).
   */
  const releaseMicrophone = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    const active = Boolean(recorder && recorder.state !== 'inactive');
    if (acquireInFlightRef.current) {
      acquireEpochRef.current += 1;
    }
    if (active) {
      recordingGenerationRef.current += 1;
      if (activeRecordingSessionRef.current) {
        activeRecordingSessionRef.current.uploadOnStop = false;
      }
    }
    mediaRecorderRef.current = null;
    if (active && recorder) {
      try {
        recorder.stop();
      } catch {
        // Already stopped — still release tracks below.
      }
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setRecording(false);
  }, []);

  useEffect(() => {
    dispatch(setActiveConversation(conversationId));
    void dispatch(fetchConversation(conversationId));
    void dispatch(fetchMessages({ conversationId }));
    return () => {
      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
        typingTimer.current = null;
      }
      // Clear peer “Typing…” for the thread we are leaving.
      void dispatch(sendTyping({ conversationId, isTyping: false }));
      releaseMicrophone();
      dispatch(setActiveConversation(null));
    };
  }, [conversationId, dispatch, releaseMicrophone]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messaging.messages.length, messaging.peerTyping]);

  const emitTyping = useCallback(
    (isTyping: boolean) => {
      void dispatch(sendTyping({ conversationId, isTyping }));
    },
    [conversationId, dispatch],
  );

  const onDraftChange = (value: string) => {
    setDraft(value);
    emitTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(false), 1200);
  };

  const onSend = async () => {
    const content = draft.trim();
    if (!content || !messaging.conversation?.can_send) return;
    setDraft('');
    emitTyping(false);
    try {
      await dispatch(sendMessage({ conversationId, content, message_type: 'text' }));
    } catch {
      // Thunk maps errors into sendError; keep composer usable.
    }
  };

  const onToggleLike = (messageId: string) => {
    void dispatch(toggleMessageLike({ conversationId, messageId }));
  };

  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear timer on unmount or finish
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    };
  }, []);

  const startRecording = async () => {
    if (!messaging.conversation?.can_send || recording || acquireInFlightRef.current) return;
    const intendedConversationId = conversationId;
    const generation = recordingGenerationRef.current;
    const acquireEpoch = acquireEpochRef.current;
    acquireInFlightRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const leftOrSwitched = shouldAbortMicAcquire(
        acquireEpoch,
        acquireEpochRef.current,
        generation,
        recordingGenerationRef.current,
        intendedConversationId,
        conversationIdRef.current,
      );
      if (leftOrSwitched) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const session = {
        conversationId: intendedConversationId,
        uploadOnStop: false,
      };
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      activeRecordingSessionRef.current = session;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (mediaStreamRef.current === stream) mediaStreamRef.current = null;
        if (activeRecordingSessionRef.current === session) {
          activeRecordingSessionRef.current = null;
        }
        // uploadOnStop is set only by deliberate stopRecording. Leave/abort clears
        // it on the active session; do not also require generation match or a later
        // mid-record abort of a new take can suppress this finished clip's upload.
        const shouldUpload = session.uploadOnStop;
        session.uploadOnStop = false;
        if (!shouldUpload) return;
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (blob.size > 0) {
          void dispatch(uploadVoiceNote({ conversationId: session.conversationId, blob }));
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordingSeconds(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      // Mic permission denied — leave composer usable for text.
    } finally {
      acquireInFlightRef.current = false;
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    const session = activeRecordingSessionRef.current;
    mediaRecorderRef.current = null;
    setRecording(false);
    setRecordingSeconds(0);
    if (recorder && recorder.state !== 'inactive') {
      // Deliberate stop — allow this session's onstop to upload; do not bump generation.
      if (session) session.uploadOnStop = true;
      try {
        recorder.stop();
      } catch {
        if (session) session.uploadOnStop = false;
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    const session = activeRecordingSessionRef.current;
    if (session) session.uploadOnStop = false;
    mediaRecorderRef.current = null;
    setRecording(false);
    setRecordingSeconds(0);
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // Safe noop
      }
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const name = messaging.conversation?.peer?.name || t('chat.title');
  const canSend = Boolean(messaging.conversation?.can_send);

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: matchyBrand.bg }}>
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 md:px-6"
        style={{ background: 'white', borderBottom: `1px solid ${matchyBrand.border}` }}
      >
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => router.push('/matches')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-slate-100 active:scale-95"
            style={{
              background: matchyBrand.bg,
              border: `1px solid ${matchyBrand.borderStrong}`,
            }}
            aria-label={t('common.back')}
          >
            <ChevronLeft
              size={20}
              color={matchyBrand.text}
              className={dir === 'rtl' ? 'rotate-180' : ''}
            />
          </button>

          <AuthenticatedProfileAvatar
            image={messaging.conversation?.peer?.image}
            name={name}
            sizeClassName="h-10 w-10 shrink-0"
            roundedClassName="rounded-full"
            textClassName="text-sm font-bold text-white"
          />
          <div className="min-w-0">
            <p className="truncate font-bold" style={{ color: matchyBrand.textDark }}>
              {name}
            </p>
            <p className="text-xs text-[#888]">
              {messaging.peerTyping
                ? t('chat.typing')
                : canSend
                  ? t('chat.active')
                  : t('chat.readOnly')}
            </p>
          </div>
        </div>

        <ChatOptionsMenu peer={messaging.conversation?.peer} conversationId={conversationId} />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4 md:px-6">
        {messaging.hasMore && (
          <div className="flex justify-center pb-2">
            <button
              type="button"
              disabled={messaging.messagesLoadingMore}
              onClick={() =>
                void dispatch(fetchMessages({ conversationId, cursor: messaging.nextCursor }))
              }
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{ background: matchyBrand.softBlue, color: matchyBrand.blue }}
            >
              {messaging.messagesLoadingMore ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                t('chat.loadOlder')
              )}
            </button>
          </div>
        )}

        {messaging.messagesLoading && messaging.messages.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin" color={matchyBrand.teal} />
          </div>
        ) : messaging.messagesError && messaging.messages.length === 0 ? (
          <div className="space-y-3 py-12 text-center">
            <p className="text-sm text-[#E74C3C]">{t(messaging.messagesError)}</p>
            <button
              type="button"
              onClick={() => void dispatch(fetchMessages({ conversationId }))}
              className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
              style={{ background: matchyBrand.gradient }}
            >
              {t('common.retry')}
            </button>
          </div>
        ) : messaging.messages.length === 0 ? (
          <ChatIcebreakers
            peer={messaging.conversation?.peer}
            onSelect={(msg) => {
              setDraft(msg);
            }}
            disabled={!canSend}
          />
        ) : (
          messaging.messages.map((message) => {
            const mine = message.sender_id === myUserId;
            return (
              <div
                key={message.id}
                onDoubleClick={() => onToggleLike(message.id)}
                className={`flex w-full flex-col ${mine ? 'items-end' : 'items-start'}`}
              >
                <div
                  className="max-w-[80%] rounded-2xl px-3 py-2 text-left text-sm"
                  style={{
                    background: mine ? matchyBrand.teal : 'white',
                    color: mine ? 'white' : matchyBrand.textDark,
                    border: mine ? 'none' : `1px solid ${matchyBrand.border}`,
                  }}
                >
                  {message.message_type === 'VOICE' ? (
                    <VoiceBubble mediaUrl={message.media_url} isMine={mine} />
                  ) : (
                    <p className="break-words whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1 px-1 text-[10px] text-[#999]">
                  {message.like_count > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <Heart
                        size={10}
                        fill={message.liked_by_me ? matchyBrand.teal : 'transparent'}
                        color={matchyBrand.teal}
                      />
                      {message.like_count}
                    </span>
                  )}
                  {mine && <span>{message.is_read ? t('chat.read') : t('chat.sent')}</span>}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {messaging.sendError && (
        <div className="flex items-center justify-between px-4 py-2 text-sm text-[#E74C3C]">
          <span>{t(messaging.sendError)}</span>
          <button type="button" onClick={() => dispatch(clearSendError())}>
            {t('common.close')}
          </button>
        </div>
      )}

      {/* Composer Toolbar */}
      <div
        className="px-4 py-3"
        style={{ background: 'white', borderTop: `1px solid ${matchyBrand.border}` }}
      >
        {recording ? (
          /* Live Vocal Recording HUD */
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              {/* Recording Indicator */}
              <span className="flex h-2.5 w-2.5 rounded-full bg-rose-600"></span>

              {/* Timer */}
              <span className="font-mono text-xs font-bold text-rose-700">
                {Math.floor(recordingSeconds / 60)
                  .toString()
                  .padStart(2, '0')}
                :{(recordingSeconds % 60).toString().padStart(2, '0')}
              </span>

              {/* Static Waveform Aesthetic */}
              <div className="flex items-center gap-0.5 px-2">
                {[6, 12, 18, 10, 16, 8, 14, 10, 15, 7].map((h, idx) => (
                  <span
                    key={idx}
                    className="w-0.5 rounded-full bg-rose-400"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
            </div>

            {/* Actions: Cancel & Send */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100/70"
              >
                <Trash2 size={14} />
                <span>{t('chat.cancelRecording')}</span>
              </button>

              <button
                type="button"
                onClick={stopRecording}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-rose-500 to-[#E24E59] text-white shadow-xs transition-opacity hover:opacity-95 active:scale-95"
                aria-label={t('chat.sendVoiceNote')}
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        ) : (
          /* Standard Input Bar */
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canSend || messaging.sendLoading}
              onClick={() => void startRecording()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform active:scale-95 disabled:opacity-50"
              style={{
                background: matchyBrand.softBlue,
                color: matchyBrand.blue,
              }}
              aria-label={t('chat.voice')}
            >
              <Mic size={18} />
            </button>
            <input
              value={draft}
              disabled={!canSend || messaging.sendLoading}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void onSend();
                }
              }}
              placeholder={canSend ? t('chat.placeholder') : t('chat.readOnly')}
              className="flex-1 rounded-2xl px-4 py-3 text-sm disabled:opacity-70"
              style={{ background: matchyBrand.bg, border: `1px solid ${matchyBrand.border}` }}
            />
            <button
              type="button"
              disabled={!canSend || messaging.sendLoading || !draft.trim()}
              onClick={() => void onSend()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white transition-opacity hover:opacity-95 active:scale-95 disabled:opacity-50"
              style={{ background: matchyBrand.gradient }}
              aria-label={t('chat.send')}
            >
              {messaging.sendLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
