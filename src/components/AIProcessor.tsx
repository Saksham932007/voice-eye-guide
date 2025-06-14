
import { useState } from 'react';

interface AnalysisResult {
  description: string;
  objects: string[];
  navigationGuidance?: string;
  currencyDetection?: string;
  textContent?: string;
  safetyWarnings?: string[];
}

export const AIProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const analyzeImage = async (imageData: string): Promise<AnalysisResult> => {
    setIsProcessing(true);
    
    try {
      // Remove data URL prefix
      const base64Image = imageData.split(',')[1];
      
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyAYYBn61_8r8tnVYUTqVxKvcy7PYQa5Jow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `Analyze this image for a visually impaired user with extreme detail and precision. Provide:
                1. Comprehensive scene description with spatial relationships
                2. Detailed navigation guidance with specific directions and distances
                3. Complete object identification with exact positions and descriptions
                4. Currency detection with exact denominations if visible
                5. Full text reading of any readable content
                6. Detailed safety warnings for potential hazards
                
                Be extremely specific about locations, distances, colors, textures, and spatial relationships. Use clock positions (12 o'clock, 3 o'clock) and estimated distances. Describe everything as if guiding someone step by step through the environment.`
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }],
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.2,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      const description = result.candidates[0]?.content?.parts[0]?.text || 'I cannot analyze this image at the moment. Please try again.';
      
      // Parse the response to extract structured information
      return {
        description,
        objects: extractObjects(description),
        navigationGuidance: extractNavigationGuidance(description),
        currencyDetection: extractCurrencyInfo(description),
        textContent: extractTextContent(description),
        safetyWarnings: extractSafetyWarnings(description)
      };
      
    } catch (error) {
      console.error('AI analysis failed:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const extractObjects = (text: string): string[] => {
    // Simple extraction logic - in a real app, this would be more sophisticated
    const objectKeywords = ['table', 'chair', 'door', 'window', 'person', 'car', 'bottle', 'phone', 'book', 'cup'];
    return objectKeywords.filter(obj => text.toLowerCase().includes(obj));
  };

  const extractNavigationGuidance = (text: string): string | undefined => {
    if (text.toLowerCase().includes('obstacle') || text.toLowerCase().includes('clear') || text.toLowerCase().includes('path')) {
      return text.split('.')[0]; // Return first sentence which often contains navigation info
    }
    return undefined;
  };

  const extractCurrencyInfo = (text: string): string | undefined => {
    if (text.toLowerCase().includes('rupee') || text.toLowerCase().includes('dollar') || text.toLowerCase().includes('currency')) {
      const currencyMatch = text.match(/(\d+)\s*(rupee|dollar|pound|euro)/i);
      return currencyMatch ? currencyMatch[0] : undefined;
    }
    return undefined;
  };

  const extractTextContent = (text: string): string | undefined => {
    if (text.toLowerCase().includes('text') || text.toLowerCase().includes('sign') || text.toLowerCase().includes('label')) {
      return text;
    }
    return undefined;
  };

  const extractSafetyWarnings = (text: string): string[] => {
    const warnings: string[] = [];
    const safetyKeywords = ['danger', 'warning', 'hazard', 'careful', 'obstacle', 'step', 'stairs'];
    
    safetyKeywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword)) {
        warnings.push(`Caution: ${keyword} detected`);
      }
    });
    
    return warnings;
  };

  return (
    <div className="hidden">
      {/* This component doesn't render anything visible but provides AI processing functionality */}
      {isProcessing && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white">
          Processing...
        </div>
      )}
    </div>
  );
};

// Export the analyze function properly
export const analyzeImageWithAI = (imageData: string) => {
  const processor = new AIProcessor();
  return processor.analyzeImage(imageData);
};
