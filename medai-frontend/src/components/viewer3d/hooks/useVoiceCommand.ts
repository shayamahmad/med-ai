/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ORGANS } from '../data/organs';
import { AnatomySystem } from '../types/anatomy.types';

interface VoiceCommandHandlers {
  onShowOrgan: (organId: string) => void;
  onExplainOrgan: (organId: string) => void;
  onAskDisease: (query: string) => void;
  onSwitchSystem: (system: AnatomySystem) => void;
  onToggleExploded: () => void;
  onReset: () => void;
}

function findOrganByPhrase(phrase: string): string | null {
  const lower = phrase.toLowerCase();
  for (const organ of ORGANS) {
    if (lower.includes(organ.label.toLowerCase()) || lower.includes(organ.id.replace(/_/g, ' '))) {
      return organ.id;
    }
    const short = organ.label.split('—')[0].split('(')[0].trim().toLowerCase();
    if (short.length > 3 && lower.includes(short)) return organ.id;
  }
  const aliases: Record<string, string> = {
    heart: 'realistic_human_heart',
    lung: 'left_lung',
    brain: 'brain_left_hemisphere',
    liver: 'liver',
    kidney: 'kidney',
    stomach: 'realistic_human_stomach',
    uterus: 'uterus',
  };
  for (const [key, id] of Object.entries(aliases)) {
    if (lower.includes(key)) return id;
  }
  return null;
}

function findSystemByPhrase(phrase: string): AnatomySystem | null {
  const systems: AnatomySystem[] = [
    'Cardiovascular', 'Respiratory', 'Nervous', 'Digestive',
    'Urinary', 'Muscular', 'Reproductive', 'Cardiorespiratory',
  ];
  for (const sys of systems) {
    if (phrase.includes(sys.toLowerCase())) return sys;
  }
  return null;
}

export function useVoiceCommand(handlers: VoiceCommandHandlers) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onresult = (event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => {
      const text = event.results[0][0].transcript.toLowerCase();
      setTranscript(text);
      parseAndExecuteCommand(text, handlersRef.current);
      setListening(false);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
  }, []);

  const parseAndExecuteCommand = useCallback((text: string, h: VoiceCommandHandlers) => {
    if (text.includes('reset')) {
      h.onReset();
      return;
    }
    if (text.includes('exploded view') || text.includes('explode')) {
      h.onToggleExploded();
      return;
    }
    const system = findSystemByPhrase(text);
    if (text.includes('switch to') && system) {
      h.onSwitchSystem(system);
      return;
    }
    if (text.includes('symptoms of') || text.includes('what are the symptoms')) {
      h.onAskDisease(text);
      return;
    }
    if (text.includes('explain')) {
      const organId = findOrganByPhrase(text);
      if (organId) {
        h.onExplainOrgan(organId);
        return;
      }
    }
    if (text.includes('show me') || text.includes('show the') || text.includes('go to')) {
      const organId = findOrganByPhrase(text);
      if (organId) {
        h.onShowOrgan(organId);
        return;
      }
    }
    const organId = findOrganByPhrase(text);
    if (organId) h.onShowOrgan(organId);
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || listening) return;
    try {
      recognitionRef.current.start();
      setListening(true);
      setTranscript('');
    } catch {
      setListening(false);
    }
  }, [listening]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }, []);

  return { listening, transcript, supported, startListening, stopListening, speak };
}
