/**
 * OpenRouter Service for web simulator
 * Matches OpenRouterClient.kt specification:
 * - Model: google/gemini-flash-1.5
 * - Headers: Authorization: Bearer {API_KEY}, HTTP-Referer, X-Title
 * - Vision: {"type":"image_url","image_url":{"url":"data:image/jpeg;base64,{base64}"}}
 * - System prompt: "You are Slime, a cute floating buddy, playful, cheeky, helpful. Max 2 sentences. Keep it cute and short."
 */

export const STORAGE_KEY_API = 'openrouter_api_key';

export function getStoredApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_API) || '';
  } catch {
    return '';
  }
}

export function saveStoredApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_API, key.trim());
  } catch (e) {
    console.error(e);
  }
}

export async function chatWithOpenRouter(
  userText: string,
  imageBase64?: string | null,
  providedKey?: string
): Promise<string> {
  const apiKey = providedKey !== undefined ? providedKey.trim() : getStoredApiKey();

  // If no key configured, provide a charming intelligent mock response simulating Slime
  if (!apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (imageBase64) {
      const visionResponses = [
        "Ooh! I see bright icons and colorful widgets across your screen! Look at those cool apps! *squishy wiggles*",
        "Bloop! I spot interesting text and buttons here! Don't let me distract you from winning! *happy bounce*",
        "Squish! Looks like you're browsing something neat! Keep going, I'm watching your back! ✨"
      ];
      return visionResponses[Math.floor(Math.random() * visionResponses.length)];
    }

    if (userText.toLowerCase() === 'hi') {
      return "Squish squish! Hello human friend! I'm Slime, your bouncy floating companion! 🟢✨";
    }

    if (userText.includes('stats')) {
      return "I'm feeling delightfully bouncy right now! Don't forget to keep my hunger meter nice and full! *nuzzle*";
    }

    return "Bloop! I'm chilling right here above your screen. Feed me snacks or double-tap so I can analyze what you're doing!";
  }

  try {
    const messages: any[] = [
      {
        role: 'system',
        content: 'You are Slime, a cute floating buddy, playful, cheeky, helpful. Max 2 sentences. Keep it cute and short.'
      }
    ];

    if (!imageBase64) {
      messages.push({
        role: 'user',
        content: userText
      });
    } else {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userText },
          {
            type: 'image_url',
            image_url: {
              url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
            }
          }
        ]
      });
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Floating Buddy AI'
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        messages,
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      try {
        const parsed = JSON.parse(errText);
        const msg = parsed?.error?.message || res.statusText;
        return `Bloop error (${res.status}): ${msg}`;
      } catch {
        return `Bloop error: HTTP ${res.status} ${res.statusText}`;
      }
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    return content || "Squish? I heard you, but my slime brain was empty!";
  } catch (err: any) {
    return `Slime hiccup: ${err?.message || 'Connection error'}`;
  }
}
