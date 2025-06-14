
// This would be implemented as a serverless function in production
// For now, this is a reference implementation

export interface ImageAnalysisRequest {
  imageData: string;
}

export interface ImageAnalysisResponse {
  description: string;
  objects: string[];
  navigationGuidance?: string;
  currencyDetection?: string;
  textContent?: string;
  safetyWarnings?: string[];
}

export const analyzeImageWithGemini = async (imageData: string): Promise<ImageAnalysisResponse> => {
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
            text: `You are an AI assistant helping a visually impaired person navigate their environment. Analyze this image and provide:

1. IMMEDIATE SAFETY: Any immediate safety concerns or obstacles
2. NAVIGATION: Clear directional guidance (left, right, straight, distance estimates)
3. OBJECT IDENTIFICATION: Key objects and their locations relative to the user
4. CURRENCY DETECTION: If any money/currency is visible, identify denomination and type
5. TEXT READING: Any readable text, signs, or labels
6. GENERAL DESCRIPTION: Overall scene description

Respond in clear, natural speech that prioritizes safety and actionable information. Use specific directional language (2 feet ahead, on your left, etc.). Keep it concise but informative.

Example good response: "There's a table directly in front of you, about 3 feet away. Clear path to your right. I can see a water bottle on the table's left side. No immediate safety concerns."

Format as a single, flowing response suitable for text-to-speech.`
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
        maxOutputTokens: 512,
        temperature: 0.3,
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API request failed: ${response.status}`);
  }

  const result = await response.json();
  const description = result.candidates[0]?.content?.parts[0]?.text || 'Unable to analyze the image.';
  
  return {
    description,
    objects: extractObjects(description),
    navigationGuidance: extractNavigationGuidance(description),
    currencyDetection: extractCurrencyInfo(description),
    textContent: extractTextContent(description),
    safetyWarnings: extractSafetyWarnings(description)
  };
};

const extractObjects = (text: string): string[] => {
  const objectKeywords = ['table', 'chair', 'door', 'window', 'person', 'car', 'bottle', 'phone', 'book', 'cup', 'stairs', 'wall', 'floor'];
  return objectKeywords.filter(obj => text.toLowerCase().includes(obj));
};

const extractNavigationGuidance = (text: string): string | undefined => {
  const navigationPhrases = ['ahead', 'left', 'right', 'behind', 'clear path', 'obstacle', 'feet', 'meters'];
  const hasNavigation = navigationPhrases.some(phrase => text.toLowerCase().includes(phrase));
  return hasNavigation ? text : undefined;
};

const extractCurrencyInfo = (text: string): string | undefined => {
  const currencyMatch = text.match(/(\d+)\s*(rupee|dollar|pound|euro|cent|paisa)/i);
  return currencyMatch ? currencyMatch[0] : undefined;
};

const extractTextContent = (text: string): string | undefined => {
  if (text.toLowerCase().includes('text') || text.toLowerCase().includes('sign') || text.toLowerCase().includes('label') || text.toLowerCase().includes('read')) {
    return text;
  }
  return undefined;
};

const extractSafetyWarnings = (text: string): string[] => {
  const warnings: string[] = [];
  const safetyKeywords = ['danger', 'warning', 'hazard', 'careful', 'obstacle', 'step', 'stairs', 'edge'];
  
  safetyKeywords.forEach(keyword => {
    if (text.toLowerCase().includes(keyword)) {
      warnings.push(keyword);
    }
  });
  
  return warnings;
};
