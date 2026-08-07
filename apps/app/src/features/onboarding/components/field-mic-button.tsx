'use client';

import { Mic, MicOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type FieldMicButtonProps = {
  onResult: (text: string) => void;
  lang?: string;
  disabled?: boolean;
  /** Matchy Inscription1: smaller mic for textarea corner. */
  small?: boolean;
};

/** Web Speech API mic — Matchy Inscription1 MicButton visual parity. */
export function FieldMicButton({
  onResult,
  lang = 'fr-FR',
  disabled,
  small = false,
}: FieldMicButtonProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setSupported(Boolean(getSpeechRecognition()));
    return () => {
      mountedRef.current = false;
      const recognition = recognitionRef.current;
      if (!recognition) return;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort?.() ?? recognition.stop();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    };
  }, []);

  const toggle = () => {
    if (disabled) return;
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setSupported(false);
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.abort?.() ?? recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
      setListening(false);
      return;
    }

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      if (!mountedRef.current) return;
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setError(null);
        onResult(transcript);
      }
    };
    recognition.onerror = (event) => {
      if (!mountedRef.current) return;
      const code = event.error ?? 'error';
      if (code !== 'aborted' && code !== 'no-speech') setError(code);
      setListening(false);
    };
    recognition.onend = () => {
      if (mountedRef.current) setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setError(null);
    } catch {
      setSupported(false);
      setListening(false);
      recognitionRef.current = null;
    }
  };

  if (!supported) return null;

  const size = small ? 34 : 40;
  const iconSize = small ? 14 : 16;

  return (
    <div className="relative flex flex-col items-center">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle();
        }}
        disabled={disabled}
        aria-pressed={listening}
        title={listening ? 'Arrêter' : error ? `Erreur micro : ${error}` : 'Dicter'}
        className="flex shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-40"
        style={{
          width: size,
          height: size,
          background:
            error && !listening
              ? 'linear-gradient(135deg, #F39C12, #E67E22)'
              : listening
                ? 'linear-gradient(135deg, #E74C3C, #C0392B)'
                : 'linear-gradient(135deg, #61BCA6, #2F76BB)',
          boxShadow: listening ? '0 0 0 4px rgba(231,76,60,0.2)' : 'none',
        }}
        aria-label={listening ? 'Arrêter la dictée' : 'Dicter'}
      >
        {listening ? (
          <MicOff size={iconSize} color="white" />
        ) : (
          <Mic size={iconSize} color="white" />
        )}
      </button>
      {error && !listening && (
        <span
          className="absolute top-full z-10 mt-1 max-w-40 text-center whitespace-nowrap"
          style={{ fontSize: '10px', color: '#E67E22', fontWeight: 600 }}
        >
          Erreur micro
        </span>
      )}
    </div>
  );
}
