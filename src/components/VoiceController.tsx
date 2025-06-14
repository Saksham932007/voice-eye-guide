
import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

// Extend the Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
  
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  }
  
  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
  }
  
  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
  }
  
  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }
  
  interface SpeechRecognitionResult {
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
    isFinal: boolean;
  }
  
  interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
  }
  
  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
  };
  
  var webkitSpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
  };
}

interface VoiceControllerProps {
  onWakeWord: (transcript: string) => void;
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
  speak: (text: string, options?: { rate?: number; pitch?: number; volume?: number }) => void;
}

export const VoiceController = ({ 
  onWakeWord, 
  isListening, 
  setIsListening, 
  speak 
}: VoiceControllerProps) => {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognitionClass) {
      setIsSupported(true);
      const recognition = new SpeechRecognitionClass();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
        console.log('Voice recognition started');
      };
      
      recognition.onend = () => {
        setIsListening(false);
        console.log('Voice recognition ended');
        // Restart recognition automatically
        if (recognitionRef.current) {
          setTimeout(() => {
            try {
              recognitionRef.current?.start();
            } catch (error) {
              console.error('Failed to restart recognition:', error);
            }
          }, 1000);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Voice activation disabled.');
          speak('Microphone access denied. You can still use the wake button.');
        }
      };
      
      recognition.onresult = (event) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript.trim();
          console.log('Voice transcript:', transcript);
          onWakeWord(transcript);
        }
      };
      
      recognitionRef.current = recognition;
      
      // Start listening immediately
      try {
        recognition.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
      }
    } else {
      setIsSupported(false);
      speak('Voice recognition not supported on this device. Use the wake button instead.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onWakeWord, setIsListening, speak]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
      }
    }
  }, [isListening]);

  if (!isSupported) {
    return (
      <div className="absolute top-4 left-4 bg-yellow-600 text-white px-3 py-2 rounded text-sm">
        Voice control not supported
      </div>
    );
  }

  return (
    <div className="absolute top-4 left-4">
      <button
        onClick={toggleListening}
        className={`
          px-4 py-2 rounded-full text-white font-bold text-sm
          ${isListening ? 'bg-red-600 animate-pulse' : 'bg-gray-600'}
          focus:outline-none focus:ring-2 focus:ring-white
        `}
        aria-label={isListening ? 'Stop voice listening' : 'Start voice listening'}
      >
        {isListening ? '🎤 Listening' : '🎤 Voice Off'}
      </button>
    </div>
  );
};
