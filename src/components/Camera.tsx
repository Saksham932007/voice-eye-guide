
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface CameraProps {
  onFrameCapture?: (imageData: string) => void;
  isActive?: boolean;
}

export const Camera = ({ onFrameCapture, isActive = false }: CameraProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    initializeCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initializeCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rear camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setStream(mediaStream);
      setHasPermission(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Camera initialization failed:', error);
      setHasPermission(false);
      toast.error('Camera access denied. Please enable camera permissions.');
    }
  };

  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  useEffect(() => {
    if (isActive && onFrameCapture) {
      const imageData = captureFrame();
      if (imageData) {
        onFrameCapture(imageData);
      }
    }
  }, [isActive, onFrameCapture]);

  if (!hasPermission) {
    return (
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Camera Access Required</h2>
          <p className="text-lg mb-4">Sora needs camera access to help you navigate and identify objects.</p>
          <button
            onClick={initializeCamera}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg text-white font-bold"
          >
            Enable Camera
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        aria-label="Live camera feed for navigation assistance"
      />
      <canvas ref={canvasRef} className="hidden" />
    </>
  );
};
