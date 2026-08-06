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
};

/** Web Speech API mic for onboarding identity fields (Matchy Inscription1 parity). */
export function FieldMicButton({ onResult, lang = 'fr-FR', disabled }: FieldMicButtonProps) {
  const [listening, setListening] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const toggle = () => {
    if (disabled) return;
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setUnsupported(true);
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) onResult(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setUnsupported(false);
    } catch {
      setUnsupported(true);
      setListening(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={
        unsupported
          ? 'Reconnaissance vocale non supportée sur ce navigateur'
          : listening
            ? 'Arrêter'
            : 'Dicter'
      }
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-40"
      style={{
        background: listening ? '#FEE2E2' : unsupported ? '#F5F5F5' : '#E8F7F3',
        border: `1.5px solid ${listening ? '#E74C3C' : unsupported ? '#DDD' : '#61BCA6'}`,
      }}
      aria-label={listening ? 'Arrêter la dictée' : 'Dicter'}
    >
      {listening ? <MicOff size={16} color="#E74C3C" /> : <Mic size={16} color="#2A8F76" />}
    </button>
  );
}
