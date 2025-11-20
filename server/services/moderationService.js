const MODERATION_ENDPOINT = 'https://api.openai.com/v1/moderations';
const DEFAULT_MODERATION_MODEL = process.env.OPENAI_MODERATION_MODEL || 'omni-moderation-latest';
const DEFAULT_MAX_CHARS = Number(process.env.OPENAI_MODERATION_MAX_CHARS || 6000);

export class ModerationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ModerationError';
    this.statusCode = 422;
    this.details = details;
  }
}

const sanitizeContent = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
};

const trimToMax = (text, maxChars) => {
  if (!text) {
    return '';
  }

  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}...`;
};

const normalizeInput = (rawInput, maxChars) => {
  if (Array.isArray(rawInput)) {
    return rawInput
      .map((entry) => sanitizeContent(entry))
      .filter((entry) => entry.length > 0)
      .map((entry) => trimToMax(entry, maxChars));
  }

  const single = sanitizeContent(rawInput);
  return single ? [trimToMax(single, maxChars)] : [];
};

export const ensureContentIsSafe = async (rawInput, options = {}) => {
  const inputs = normalizeInput(rawInput, options.maxChars || DEFAULT_MAX_CHARS);

  if (!inputs.length) {
    return { skipped: true };
  }

  const openAiApiKey = process.env.OPENAI_API_KEY;
  if (!openAiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch(MODERATION_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openAiApiKey}`
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODERATION_MODEL,
      input: inputs
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[Moderation] API error:', response.status, errorData);
    throw new Error(`Moderation API error: ${response.status}`);
  }

  const payload = await response.json();
  const flaggedResult = payload?.results?.find((result) => result.flagged);

  if (flaggedResult) {
    const contextLabel = options.feature || 'ai';
    console.warn(`[Moderation] Blocked content for feature: ${contextLabel}`);
    throw new ModerationError(
      options.blockMessage || 'Content violates our safety policies. Please adjust and try again.',
      {
        feature: contextLabel,
        userId: options.userId || null,
        categories: flaggedResult.categories,
        categoryScores: flaggedResult.category_scores
      }
    );
  }

  return {
    flagged: false,
    model: payload?.model || DEFAULT_MODERATION_MODEL,
    results: payload?.results || []
  };
};
