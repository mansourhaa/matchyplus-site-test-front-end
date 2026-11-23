'use client';

import { useI18n } from '@/features/i18n/i18n-provider';
import { Mic, Square, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/** Same limit as the presentation video. */
export const VOICE_NEED_MAX_SECONDS = 20;

const AUDIO_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];

function pickAudioType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return undefined;
  return AUDIO_TYPES.find((type) => {
    try {
      return MediaRecorder.isTypeSupported(type);
    } catch {
      return false;
    }
  });
}

type VoiceNeedRecorderProps = {
  /** A recording is kept (shown as « recorded », with ✕ to delete it). */
  recorded: boolean;
  disabled?: boolean;
  onRecorded: (file: File) => void;
  onRemove: () => void;
};

/**
 * « Je cherche un prestataire »: a short voice message (20 s max) instead of the
 * presentation video, as in the 2.0.8 demo. Only the sound is recorded; it is sent to
 * the AI to pre-fill the form and is never stored on the profile.
 */
export function VoiceNeedRecorder({
  recorded,
  disabled = false,
  onRecorded,
  onRemove,
}: VoiceNeedRecorderProps) {
  const { t } = useI18n();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const release = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.stop();
      }
      release();
    };
  }, []);

  const stop = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  };

  const start = async () => {
    setError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError(t('onboarding.identity.voiceMicDenied'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickAudioType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        release();
        setRecording(false);
        const type = (recorder.mimeType || mimeType || 'audio/webm').split(';')[0].trim();
        const blob = new Blob(chunks, { type });
        if (!blob.size) return;
        const name = type.includes('mp4') ? 'need-audio.m4a' : 'need-audio.webm';
        onRecorded(new File([blob], name, { type }));
      };
      recorder.start();
      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setSeconds((value) => {
          const next = value + 1;
          if (next >= VOICE_NEED_MAX_SECONDS) stop();
          return Math.min(next, VOICE_NEED_MAX_SECONDS);
        });
      }, 1000);
    } catch {
      release();
      setRecording(false);
      setError(t('onboarding.identity.voiceMicDenied'));
    }
  };

  if (recorded && !recording) {
    return (
      <div
        className="flex w-full items-center gap-3 rounded-xl px-4 py-3"
        style={{ border: '2px solid #61BCA6', background: '#E8F7F3' }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: '#61BCA6' }}
        >
          <Mic size={16} color="white" />
        </div>
        <p
          className="min-w-0 flex-1 truncate"
          style={{ fontSize: '13px', fontWeight: 600, color: '#2A9177' }}
        >
          {t('onboarding.identity.voiceAdded')}
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="shrink-0"
          aria-label={t('onboarding.identity.voiceRemove')}
        >
          <X size={16} color="#AAA" />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (recording ? stop() : void start())}
        className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 transition-all hover:shadow-sm"
        style={{
          border: recording ? '2px solid #E74C3C' : '2px dashed #D0D0D0',
          background: 'white',
        }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: recording ? '#E74C3C' : 'linear-gradient(135deg, #61BCA6, #2F76BB)',
          }}
        >
          {recording ? <Square size={16} color="white" /> : <Mic size={18} color="white" />}
        </div>
        <div className="flex-1 text-start">
          <p
            style={{ fontSize: '13px', fontWeight: 700, color: recording ? '#E74C3C' : '#2F76BB' }}
          >
            {recording
              ? t('onboarding.identity.voiceRecording', {
                  seconds: VOICE_NEED_MAX_SECONDS - seconds,
                })
              : t('onboarding.identity.voiceRecordBtn')}
          </p>
          {!recording && (
            <p style={{ fontSize: '11px', color: '#AAA', marginTop: '1px' }}>
              {t('onboarding.identity.voiceRecordHint')}
            </p>
          )}
        </div>
        <Mic size={16} color={recording ? '#E74C3C' : '#61BCA6'} />
      </button>
      {error && <p style={{ fontSize: '12px', color: '#E74C3C', marginTop: '6px' }}>{error}</p>}
    </>
  );
}
