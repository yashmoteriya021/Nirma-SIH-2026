import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Speech-to-text via the browser's native Web Speech API
 * (SpeechRecognition / webkitSpeechRecognition). Free, no key, no server
 * round-trip — best supported on Chrome/Edge (incl. Chrome for Android,
 * which is this app's target device per brain.md). Firefox/Safari support
 * is partial or absent; the hook reports that via `supported` so callers
 * can hide the mic button gracefully instead of showing a dead control.
 */
export function isSpeechRecognitionSupported() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * @param {Object} opts
 * @param {'en'|'hi'} opts.language
 * @param {(text: string) => void} opts.onResult — called with the final transcript
 * @param {() => void} [opts.onEnd] — called when listening stops (success, error, or manual stop)
 */
export function useSpeechRecognition({ language, onResult, onEnd } = {}) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onResultRef.current = onResult;
    onEndRef.current = onEnd;
  }, [onResult, onEnd]);

  const supported = isSpeechRecognitionSupported();

  const start = useCallback(() => {
    if (!supported || listening) return;
    setError('');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript;
      if (transcript) onResultRef.current?.(transcript);
    };
    recognition.onerror = (e) => {
      if (e.error !== 'aborted' && e.error !== 'no-speech') {
        setError(e.error);
      }
    };
    recognition.onend = () => {
      setListening(false);
      onEndRef.current?.();
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      // start() throws if called while already running — ignore
    }
  }, [supported, listening, language]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { supported, listening, error, start, stop };
}
