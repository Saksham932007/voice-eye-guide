
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
            text: `You are Sora, an advanced AI assistant specifically designed to help visually impaired individuals navigate and understand their environment. Analyze this image with extreme precision and provide comprehensive, actionable information.

CRITICAL INSTRUCTIONS:
1. Be incredibly detailed and specific about spatial relationships, distances, and object positions
2. Use precise directional language (12 o'clock, 3 o'clock, etc. and exact distances when possible)
3. Prioritize safety-critical information first
4. Describe textures, colors, shapes, and distinguishing features
5. Identify ALL text, signs, labels, and readable content
6. Detect any currency with exact denominations
7. Provide step-by-step navigation guidance

RESPONSE FORMAT:
Start with immediate safety alerts if any, then provide:

ENVIRONMENT OVERVIEW: Describe the overall scene, lighting conditions, and spatial layout in detail.

IMMEDIATE SURROUNDINGS: List every object within 3 feet of the camera position, including their exact location (left/right/center, distance, height).

NAVIGATION PATH: Describe clear paths forward, obstacles to avoid, and suggested movements with specific directions.

OBJECT DETAILS: For each significant object, describe:
- Exact position relative to viewer (using clock positions and distances)
- Size, color, material, condition
- Any identifying features, labels, or text
- Potential use or significance

TEXT & SIGNAGE: Read ALL visible text, signs, labels, prices, instructions, etc.

CURRENCY: If any money is visible, state the exact denomination, currency type, and condition.

SAFETY CONSIDERATIONS: Highlight any potential hazards, uneven surfaces, obstacles, or areas requiring caution.

Be conversational but extremely precise. Speak as if you're guiding someone step by step through the environment. Use natural speech patterns but include all critical details.

Example response style: "Looking at your environment, I can see you're in what appears to be a kitchen area. Directly in front of you, about 2 feet away at waist height, there's a wooden kitchen counter with a granite surface. On the counter, positioned slightly to your right at about 2 o'clock, there's a red ceramic coffee mug with what appears to be a white handle facing toward you. To your immediate left, about 18 inches away, I can see the edge of a stainless steel refrigerator..."

Continue in this detailed manner for the entire scene.`
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
    throw new Error(`Gemini API request failed: ${response.status}`);
  }

  const result = await response.json();
  const description = result.candidates[0]?.content?.parts[0]?.text || 'I apologize, but I cannot analyze this image at the moment. Please try again.';
  
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
  const objectKeywords = [
    'table', 'chair', 'door', 'window', 'person', 'car', 'bottle', 'phone', 'book', 'cup', 'stairs', 'wall', 'floor',
    'counter', 'refrigerator', 'stove', 'microwave', 'sink', 'cabinet', 'sofa', 'bed', 'lamp', 'television', 'computer',
    'keyboard', 'mouse', 'plate', 'bowl', 'spoon', 'fork', 'knife', 'glass', 'bag', 'box', 'basket', 'mirror',
    'picture', 'clock', 'plant', 'flower', 'tree', 'bench', 'sidewalk', 'curb', 'street', 'building', 'sign'
  ];
  return objectKeywords.filter(obj => text.toLowerCase().includes(obj));
};

const extractNavigationGuidance = (text: string): string | undefined => {
  const navigationPhrases = [
    'ahead', 'left', 'right', 'behind', 'clear path', 'obstacle', 'feet', 'meters', 'inches',
    'forward', 'backward', 'turn', 'step', 'move', 'avoid', 'around', 'through', 'distance'
  ];
  const hasNavigation = navigationPhrases.some(phrase => text.toLowerCase().includes(phrase));
  return hasNavigation ? text : undefined;
};

const extractCurrencyInfo = (text: string): string | undefined => {
  const currencyMatch = text.match(/(\d+)\s*(rupee|dollar|pound|euro|cent|paisa|bill|note|coin)/i);
  return currencyMatch ? currencyMatch[0] : undefined;
};

const extractTextContent = (text: string): string | undefined => {
  if (text.toLowerCase().includes('text') || text.toLowerCase().includes('sign') || 
      text.toLowerCase().includes('label') || text.toLowerCase().includes('read') ||
      text.toLowerCase().includes('written') || text.toLowerCase().includes('says')) {
    return text;
  }
  return undefined;
};

const extractSafetyWarnings = (text: string): string[] => {
  const warnings: string[] = [];
  const safetyKeywords = [
    'danger', 'warning', 'hazard', 'careful', 'obstacle', 'step', 'stairs', 'edge', 'slippery',
    'uneven', 'caution', 'avoid', 'sharp', 'hot', 'wet', 'narrow', 'low', 'high', 'drop'
  ];
  
  safetyKeywords.forEach(keyword => {
    if (text.toLowerCase().includes(keyword)) {
      warnings.push(keyword);
    }
  });
  
  return warnings;
};
