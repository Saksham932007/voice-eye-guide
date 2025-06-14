
import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera } from '../components/Camera';
import { VoiceController } from '../components/VoiceController';
import { AccessibilityManager } from '../components/AccessibilityManager';
import { analyzeImageWithGemini } from '../api/analyze-image';
import { toast } from 'sonner';

const Index = () => {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [currentDescription, setCurrentDescription] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize camera on component mount
  useEffect(() => {
    initializeCamera();
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      toast.error('Camera access is required for Sora to function');
      speak('Camera access denied. Please enable camera permissions to use Sora.');
    }
  };

  const speak = useCallback((text: string, options?: { rate?: number; pitch?: number; volume?: number }) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options?.rate || 0.9;
      utterance.pitch = options?.pitch || 1;
      utterance.volume = options?.volume || 1;
      
      // Try to use a high-quality voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.includes('en') && (voice.name.includes('Google') || voice.name.includes('Microsoft'))
      ) || voices.find(voice => voice.lang.includes('en')) || voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  const activateSora = useCallback(async () => {
    if (isProcessing) return;
    
    setIsActive(true);
    setIsProcessing(true);
    speak('Sora activated. Analyzing your environment...');
    
    try {
      // Capture current frame for analysis
      const imageData = captureFrame();
      if (!imageData) {
        throw new Error('Failed to capture image');
      }
      
      // Analyze with Gemini API
      const result = await analyzeImageWithGemini(imageData);
      setCurrentDescription(result.description);
      speak(result.description);
      
      // Update live region for screen readers
      const liveRegion = document.getElementById('live-announcements');
      if (liveRegion) {
        liveRegion.textContent = `Sora says: ${result.description}`;
      }
      
    } catch (error) {
      console.error('Analysis failed:', error);
      const errorMessage = 'Sorry, I encountered an error while analyzing the environment. Please try again.';
      speak(errorMessage);
      toast.error('Analysis failed');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setIsActive(false), 1000);
    }
  }, [speak, isProcessing, captureFrame]);

  const handleWakeWord = useCallback((transcript: string) => {
    const lowerTranscript = transcript.toLowerCase();
    if (lowerTranscript.includes('hey sora') || lowerTranscript.includes('wake sora')) {
      activateSora();
    }
  }, [activateSora]);

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden" id="main-content">
      {/* Screen reader announcements */}
      <div id="live-announcements" className="sr-only" aria-live="polite" aria-atomic="true">
        {currentDescription && `Sora says: ${currentDescription}`}
      </div>
      
      {/* Main camera view */}
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          aria-label="Live camera feed for navigation assistance"
        />
        
        {/* Hidden canvas for image capture */}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Status overlay */}
        {isActive && (
          <div className="absolute inset-0 bg-blue-900 bg-opacity-50 flex items-center justify-center animate-pulse">
            <div className="text-center bg-black bg-opacity-70 p-8 rounded-lg">
              <div className="text-6xl mb-4" aria-hidden="true">👁️</div>
              <p className="text-2xl font-bold">Sora is analyzing...</p>
              <div className="mt-4">
                <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Voice status indicator */}
        {isListening && (
          <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full animate-pulse">
            <span className="text-sm font-bold">🎤 Listening for "Hey Sora"</span>
          </div>
        )}
        
        {/* Wake Sora button */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <button
            onClick={activateSora}
            disabled={isProcessing}
            className={`
              px-12 py-6 text-2xl font-bold rounded-full transition-all duration-200
              ${isProcessing 
                ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-2xl hover:shadow-blue-500/25'
              }
              text-white border-4 border-white
              focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-black
            `}
            aria-label={isProcessing ? 'Sora is processing your request' : 'Wake Sora - Activate AI assistant to analyze your environment'}
            role="button"
          >
            {isProcessing ? (
              <span className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </span>
            ) : (
              'Wake Sora'
            )}
          </button>
        </div>
        
        {/* Help text */}
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 text-center">
          <p className="text-lg bg-black bg-opacity-70 px-6 py-3 rounded-lg">
            Say "Hey Sora" or tap the button
          </p>
          <p className="text-sm mt-2 bg-black bg-opacity-50 px-4 py-2 rounded">
            Press Space or Enter as shortcuts
          </p>
        </div>
        
        {/* Current description display for sighted users */}
        {currentDescription && (
          <div className="absolute top-4 left-4 max-w-md bg-black bg-opacity-80 text-white p-4 rounded-lg">
            <h3 className="font-bold mb-2">Latest Analysis:</h3>
            <p className="text-sm">{currentDescription}</p>
          </div>
        )}
      </div>
      
      {/* Voice Controller */}
      <VoiceController
        onWakeWord={handleWakeWord}
        isListening={isListening}
        setIsListening={setIsListening}
        speak={speak}
      />
      
      {/* Accessibility Manager */}
      <AccessibilityManager />
    </div>
  );
};

export default Index;
