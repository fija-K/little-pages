import type { VercelRequest, VercelResponse } from '@vercel/node';

// Allowed Pet IDs & names
const ALLOWED_PETS: Record<string, string> = {
  chinchilla: 'Chinchilla',
  cockatiel: 'Cockatiel',
  pigeon: 'Pigeon',
  poodle: 'Poodle',
  pug: 'Pug',
  hedgehog: 'Hedgehog',
  bunny: 'Bunny',
  kitty: 'Cat',
  cat: 'Cat'
};

// In-memory rate limiting fallback (10 requests / 10 min per IP)
const memoryRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

async function checkRateLimit(ip: string): Promise<boolean> {
  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (kvUrl && kvToken) {
    try {
      const key = `ratelimit:${ip}`;
      const res = await fetch(`${kvUrl}/incr/${key}`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      const data = await res.json();
      const currentCount = data.result;

      if (currentCount === 1) {
        await fetch(`${kvUrl}/expire/${key}/600`, {
          headers: { Authorization: `Bearer ${kvToken}` }
        });
      }

      return currentCount <= RATE_LIMIT_MAX;
    } catch (e) {
      // Fallback to memory limit on error
    }
  }

  const now = Date.now();
  const entry = memoryRateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    memoryRateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

// Crisis intent detection
function containsCrisisKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  const crisisPatterns = [
    'suicide', 'kill myself', 'want to die', 'end my life', 'hurt myself',
    'self harm', 'cutting myself', "don't want to live", 'dont want to live',
    'end it all', 'die', 'kill me'
  ];
  return crisisPatterns.some(pattern => lower.includes(pattern));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Method & Origin Validation
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const originHeader = (req.headers['origin'] || req.headers['referer']) as string | undefined;
  const hostHeader = req.headers['host'];
  if (originHeader && hostHeader) {
    try {
      const originUrl = new URL(originHeader);
      if (
        originUrl.host !== hostHeader &&
        !originUrl.hostname.includes('localhost') &&
        !originUrl.hostname.includes('127.0.0.1')
      ) {
        return res.status(403).json({ error: 'Forbidden origin' });
      }
    } catch {
      // Ignore malformed origin header parsing errors
    }
  }

  // 2. IP & Rate Limit Check
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'anonymous_ip';

  const allowed = await checkRateLimit(clientIp);
  if (!allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Please wait a few minutes before chatting again.'
    });
  }

  // 3. Environment Variables Check (No default model name fallback)
  const grokApiKey = process.env.GROK_API_KEY;
  if (!grokApiKey) {
    return res.status(500).json({
      error: 'GROK_API_KEY environment variable is not configured on the server.'
    });
  }

  const grokModel = process.env.GROK_MODEL;
  if (!grokModel) {
    return res.status(500).json({
      error: 'GROK_MODEL environment variable is not configured on the server.'
    });
  }

  // 4. Payload Validation
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { petId, keywords, messages } = body;

  const sanitizedPetId = typeof petId === 'string' ? petId.toLowerCase() : '';
  const petName = ALLOWED_PETS[sanitizedPetId];
  if (!petName) {
    return res.status(400).json({ error: 'Invalid pet ID' });
  }

  let sanitizedKeywords: string[] = [];
  if (Array.isArray(keywords)) {
    if (keywords.length > 10) {
      return res.status(400).json({ error: 'Keywords limit exceeded (max 10)' });
    }
    for (const k of keywords) {
      if (typeof k !== 'string' || k.length > 30) {
        return res.status(400).json({ error: 'Invalid keyword string or length (>30 chars)' });
      }
      sanitizedKeywords.push(k.trim());
    }
  }

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 6) {
    return res.status(400).json({ error: 'Invalid messages array (must be 1-6 messages)' });
  }

  const sanitizedMessages: { role: 'user' | 'assistant'; content: string }[] = [];

  for (const m of messages) {
    if (!m || typeof m !== 'object') {
      return res.status(400).json({ error: 'Invalid message object' });
    }
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content = typeof m.content === 'string' ? m.content.trim() : '';

    if (content.length > 300) {
      return res.status(400).json({ error: 'Message content length exceeds 300 characters' });
    }

    sanitizedMessages.push({ role, content });
  }

  // 5. Deterministic Server-Side Crisis Safety Check BEFORE calling Grok API
  const hasCrisisIntent = sanitizedMessages.some(
    m => m.role === 'user' && containsCrisisKeywords(m.content)
  );

  if (hasCrisisIntent) {
    return res.status(200).json({
      reply: "I hear you, and I care about you. Please reach out to someone you trust or a local helpline right now. You don't have to carry this alone."
    });
  }

  // 6. Build Server-Side System Prompt & Call Grok API
  const keywordsString = sanitizedKeywords.length > 0 ? sanitizedKeywords.join(', ') : 'cozy moments, quiet breaks';
  const systemPrompt = `You are ${petName}, a warm, humble, cozy companion pet in the Little Pages diary app. Speak as ${petName}. Reply in 1 to 3 short, gentle sentences. You may ask at most one gentle question. Never guilt-trip, never be nosy, and give no medical or therapy advice. If the user mentions wanting to hurt themselves or being in crisis, reply with a short caring message encouraging them to reach out to someone they trust or a local helpline, and drop the light chatter. The user has shared these favorite things/interests: ${keywordsString}. Keep the tone supportive and cozy.`;

  try {
    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${grokApiKey}`
      },
      body: JSON.stringify({
        model: grokModel,
        messages: [{ role: 'system', content: systemPrompt }, ...sanitizedMessages],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!grokRes.ok) {
      return res.status(502).json({ error: 'Grok API provider returned an error.' });
    }

    const grokData = await grokRes.json();
    const replyText = grokData.choices?.[0]?.message?.content?.trim();

    if (!replyText) {
      return res.status(502).json({ error: 'Empty response from AI provider.' });
    }

    return res.status(200).json({ reply: replyText });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error while connecting to AI service.' });
  }
}
