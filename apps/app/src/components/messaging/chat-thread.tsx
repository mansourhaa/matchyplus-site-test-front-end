'use client';

import { matchyBrand } from '@/components/matchy/brand';
import { useAppDispatch, useAppSelector } from '@/features/auth/hooks/use-app-dispatch';
import { selectAuth } from '@/features/auth/store/auth-slice';
import { useI18n } from '@/features/i18n/i18n-provider';
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
import { Heart, Loader2, Mic, Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

function VoiceBubble({ mediaUrl }: { mediaUrl: string | null }) {
  const { url, loading } = useAuthenticatedMediaUrl(mediaUrl);
  if (loading) return <Loader2 size={16} className="animate-spin opacity-70" />;
  if (!url) return null;
  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio controls src={url} className="max-w-[220px]" />
  );
}

type ChatThreadProps = {
  conversationId: string;
};

export function ChatThread({ conversationId }: ChatThreadProps) {
  const { t } = useI18n();
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

  conversationIdRef.current = conversationId;

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

  const startRecording = async () => {
    if (!messaging.conversation?.can_send || recording || acquireInFlightRef.current) return;
    const intendedConversationId = conversationId;
    const generation = recordingGenerationRef.current;
    const acquireEpoch = acquireEpochRef.current;
    acquireInFlightRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const leftOrSwitched =
        acquireEpoch !== acquireEpochRef.current ||
        generation !== recordingGenerationRef.current ||
        conversationIdRef.current !== intendedConversationId;
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
    } catch {
      // Mic permission denied — leave composer usable for text.
    } finally {
      acquireInFlightRef.current = false;
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    const session = activeRecordingSessionRef.current;
    mediaRecorderRef.current = null;
    setRecording(false);
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

  const name = messaging.conversation?.peer?.name || t('chat.title');
  const initial = name.slice(0, 1).toUpperCase();
  const canSend = Boolean(messaging.conversation?.can_send);

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: matchyBrand.bg }}>
      <div
        className="flex items-center gap-3 px-4 py-3 md:px-6"
        style={{ background: 'white', borderBottom: `1px solid ${matchyBrand.border}` }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white"
          style={{ background: matchyBrand.gradient135 }}
        >
          {messaging.conversation?.peer?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={messaging.conversation.peer.image}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            initial
          )}
        </div>
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
          <p className="py-12 text-center text-sm text-[#777]">{t('chat.emptyThread')}</p>
        ) : (
          messaging.messages.map((message) => {
            const mine = message.sender_id === myUserId;
            return (
              <button
                key={message.id}
                type="button"
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
                    <VoiceBubble mediaUrl={message.media_url} />
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
              </button>
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

      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ background: 'white', borderTop: `1px solid ${matchyBrand.border}` }}
      >
        <button
          type="button"
          disabled={!canSend || messaging.sendLoading}
          onClick={() => (recording ? stopRecording() : void startRecording())}
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{
            background: recording ? '#FEE2E2' : matchyBrand.softBlue,
            color: recording ? '#E74C3C' : matchyBrand.blue,
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
          className="flex h-11 w-11 items-center justify-center rounded-2xl text-white disabled:opacity-50"
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
    </div>
  );
}
