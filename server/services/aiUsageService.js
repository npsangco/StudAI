import sequelize from '../db.js';
import AIUsageStat from '../models/AIUsageStat.js';

const DEFAULT_SUMMARY_LIMIT = Number(process.env.AI_SUMMARY_DAILY_LIMIT || process.env.AI_SUMMARY_LIMIT) || 2;
const DEFAULT_QUIZ_LIMIT = Number(process.env.AI_QUIZ_DAILY_LIMIT || process.env.AI_QUIZ_LIMIT) || 2;
const DEFAULT_CHATBOT_LIMIT = Number(process.env.AI_CHATBOT_TOKEN_LIMIT || process.env.CHATBOT_TOKEN_LIMIT) || 5000;

export const DAILY_AI_LIMITS = {
  summary: DEFAULT_SUMMARY_LIMIT,
  quiz: DEFAULT_QUIZ_LIMIT,
  chatbotTokens: DEFAULT_CHATBOT_LIMIT
};

const defaultUsagePayload = (userId, date) => ({
  user_id: userId,
  date,
  summaries_used: 0,
  quizzes_used: 0,
  chatbot_tokens_used: 0,
  chatbot_requests: 0
});

const todayString = () => new Date().toISOString().split('T')[0];

async function getUsageRecord(userId, { transaction, lockRow = false } = {}) {
  const date = todayString();

  const where = { user_id: userId, date };
  let usage;

  const options = { where, transaction };
  if (lockRow && transaction) {
    options.lock = transaction.LOCK.UPDATE;
  }

  usage = await AIUsageStat.findOne(options);

  if (!usage) {
    try {
      usage = await AIUsageStat.create(defaultUsagePayload(userId, date), { transaction });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        usage = await AIUsageStat.findOne(options);
      } else {
        throw error;
      }
    }
  }

  if (lockRow && transaction) {
    await usage.reload({ transaction, lock: transaction.LOCK.UPDATE });
  }

  return usage;
}

export async function getUsageSnapshot(userId) {
  if (!userId) return null;
  const usage = await getUsageRecord(userId);
  return formatUsageResponse(usage);
}

export async function ensureSummaryAvailable(userId) {
  const usage = await getUsageRecord(userId);
  const remaining = Math.max(DAILY_AI_LIMITS.summary - usage.summaries_used, 0);
  return {
    allowed: remaining > 0,
    remaining
  };
}

export async function ensureQuizAvailable(userId) {
  const usage = await getUsageRecord(userId);
  const remaining = Math.max(DAILY_AI_LIMITS.quiz - usage.quizzes_used, 0);
  return {
    allowed: remaining > 0,
    remaining
  };
}

export async function recordSummaryUsage(userId) {
  return sequelize.transaction(async (transaction) => {
    const usage = await getUsageRecord(userId, { transaction, lockRow: true });
    if (usage.summaries_used >= DAILY_AI_LIMITS.summary) {
      return {
        allowed: false,
        remaining: 0
      };
    }

    await usage.update({
      summaries_used: usage.summaries_used + 1
    }, { transaction });

    const remaining = Math.max(DAILY_AI_LIMITS.summary - (usage.summaries_used + 1), 0);
    return {
      allowed: true,
      remaining
    };
  });
}

export async function recordQuizUsage(userId) {
  return sequelize.transaction(async (transaction) => {
    const usage = await getUsageRecord(userId, { transaction, lockRow: true });
    if (usage.quizzes_used >= DAILY_AI_LIMITS.quiz) {
      return {
        allowed: false,
        remaining: 0
      };
    }

    await usage.update({
      quizzes_used: usage.quizzes_used + 1
    }, { transaction });

    const remaining = Math.max(DAILY_AI_LIMITS.quiz - (usage.quizzes_used + 1), 0);
    return {
      allowed: true,
      remaining
    };
  });
}

export function estimateTokensFromMessages(messages = []) {
  if (!Array.isArray(messages)) {
    return 0;
  }

  const totalChars = messages.reduce((total, message) => {
    if (!message || typeof message !== 'object') return total;
    let content = '';
    if (typeof message.content === 'string') {
      content = message.content;
    } else if (Array.isArray(message.content)) {
      content = message.content.map((chunk) => chunk?.text || '').join(' ');
    } else if (typeof message.content === 'object' && message.content) {
      content = JSON.stringify(message.content);
    }
    return total + content.length;
  }, 0);

  return Math.ceil(totalChars / 4);
}

export async function ensureChatbotTokensAvailable(userId, requestedTokens = 0) {
  const usage = await getUsageRecord(userId);
  const remaining = Math.max(DAILY_AI_LIMITS.chatbotTokens - usage.chatbot_tokens_used, 0);
  if (remaining <= 0) {
    return { allowed: false, remaining: 0 };
  }

  if (requestedTokens > 0 && requestedTokens > remaining) {
    return { allowed: false, remaining };
  }

  return { allowed: true, remaining };
}

export async function recordChatbotUsage(userId, tokensUsed = 0) {
  return sequelize.transaction(async (transaction) => {
    const usage = await getUsageRecord(userId, { transaction, lockRow: true });
    const remainingBefore = Math.max(DAILY_AI_LIMITS.chatbotTokens - usage.chatbot_tokens_used, 0);

    if (remainingBefore <= 0) {
      return {
        allowed: false,
        consumed: 0,
        remaining: 0
      };
    }

    const tokensToApply = Math.min(tokensUsed, remainingBefore);
    await usage.update({
      chatbot_tokens_used: usage.chatbot_tokens_used + tokensToApply,
      chatbot_requests: usage.chatbot_requests + 1
    }, { transaction });

    const remaining = Math.max(DAILY_AI_LIMITS.chatbotTokens - (usage.chatbot_tokens_used + tokensToApply), 0);
    return {
      allowed: tokensToApply > 0,
      consumed: tokensToApply,
      remaining
    };
  });
}

export function formatUsageResponse(usage) {
  if (!usage) return null;
  return {
    date: usage.date,
    limits: DAILY_AI_LIMITS,
    usage: {
      summary: usage.summaries_used,
      quiz: usage.quizzes_used,
      chatbotTokens: usage.chatbot_tokens_used,
      chatbotRequests: usage.chatbot_requests
    },
    remaining: {
      summary: Math.max(DAILY_AI_LIMITS.summary - usage.summaries_used, 0),
      quiz: Math.max(DAILY_AI_LIMITS.quiz - usage.quizzes_used, 0),
      chatbotTokens: Math.max(DAILY_AI_LIMITS.chatbotTokens - usage.chatbot_tokens_used, 0)
    }
  };
}
