
import { useEffect } from 'react';

export const AccessibilityManager = () => {
  useEffect(() => {
    // Set focus management
    document.body.setAttribute('tabindex', '-1');
    
    // Add keyboard event listeners for accessibility
    const handleKeyDown = (event: KeyboardEvent) => {
      // Space or Enter to activate Sora
      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        const wakeButton = document.querySelector('[aria-label*="Wake Sora"]') as HTMLButtonElement;
        if (wakeButton && !wakeButton.disabled) {
          wakeButton.click();
        }
      }
      
      // Escape to stop any ongoing speech
      if (event.code === 'Escape') {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Announce app ready state
    setTimeout(() => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(
          'Sora is ready. Say "Hey Sora" or press space to activate your AI assistant.'
        );
        utterance.rate = 0.9;
        utterance.volume = 1;
        window.speechSynthesis.speak(utterance);
      }
    }, 2000);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Screen reader announcements
  useEffect(() => {
    // Add live region for dynamic announcements
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'live-announcements';
    document.body.appendChild(liveRegion);

    return () => {
      const existingRegion = document.getElementById('live-announcements');
      if (existingRegion) {
        existingRegion.remove();
      }
    };
  }, []);

  return (
    <>
      {/* Skip links for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50"
      >
        Skip to main content
      </a>
      
      {/* Screen reader instructions */}
      <div className="sr-only">
        <h1>Sora - AI Assistant for the Visually Impaired</h1>
        <p>
          This application uses your device's camera to help you navigate and identify objects in your environment.
          You can activate Sora by saying "Hey Sora" or by pressing the space bar or Enter key.
          The wake button is located at the bottom center of the screen.
        </p>
        <p>
          Instructions: Point your camera at objects or areas you want to explore. 
          Sora will provide audio descriptions, navigation guidance, and identify currency or text when activated.
        </p>
      </div>
    </>
  );
};
