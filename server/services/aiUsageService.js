import { Op } from 'sequelize';
import sequelize from '../db.js';
import AIUsageStat from '../models/AIUsageStat.js';

const DEFAULT_SUMMARY_LIMIT = Number(process.env.AI_SUMMARY_DAILY_LIMIT || process.env.AI_SUMMARY_LIMIT) || 2;
const DEFAULT_QUIZ_LIMIT = Number(process.env.AI_QUIZ_DAILY_LIMIT || process.env.AI_QUIZ_LIMIT) || 1;
const DEFAULT_CHATBOT_LIMIT = Number(process.env.AI_CHATBOT_TOKEN_LIMIT || process.env.CHATBOT_TOKEN_LIMIT) || 5000;
const QUIZ_COOLDOWN_DAYS = Number(process.env.AI_QUIZ_COOLDOWN_DAYS) || 2;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

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

const normalizeDateOnly = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00Z`);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const addDaysToDateString = (dateString, days) => {
  const date = normalizeDateOnly(dateString);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
};

async function getLastQuizUsage(userId, { transaction } = {}) {
  return AIUsageStat.findOne({
    where: {
      user_id: userId,
      quizzes_used: {
        [Op.gt]: 0
      }
    },
    order: [['date', 'DESC']],
    transaction
  });
}

async function getQuizCooldownInfo(userId, { transaction } = {}) {
  const lastUsage = await getLastQuizUsage(userId, { transaction });
  const today = todayString();
  const todayDate = normalizeDateOnly(today);

  if (!lastUsage) {
    return {
      inCooldown: false,
      lastUsedOn: null,
      nextAvailableOn: today,
      daysUntilAvailable: 0
    };
  }

  const lastUsageDate = normalizeDateOnly(lastUsage.date);
  const diffDays = Math.floor(Math.max(0, (todayDate - lastUsageDate) / DAY_IN_MS));

  if (diffDays >= QUIZ_COOLDOWN_DAYS) {
    return {
      inCooldown: false,
      lastUsedOn: lastUsage.date,
      nextAvailableOn: today,
      daysUntilAvailable: 0
    };
  }

  const nextAvailableOn = addDaysToDateString(lastUsage.date, QUIZ_COOLDOWN_DAYS);
  return {
    inCooldown: true,
    lastUsedOn: lastUsage.date,
    nextAvailableOn,
    daysUntilAvailable: Math.max(QUIZ_COOLDOWN_DAYS - diffDays, 0)
  };
}

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
  const snapshot = formatUsageResponse(usage);
  const quizCooldown = await getQuizCooldownInfo(userId);
  snapshot.cooldowns = {
    ...(snapshot.cooldowns || {}),
    quiz: quizCooldown
  };
  if (quizCooldown.inCooldown) {
    snapshot.remaining.quiz = 0;
  }
  return snapshot;
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
  const quizCooldown = await getQuizCooldownInfo(userId);
  if (quizCooldown.inCooldown) {
    return {
      allowed: false,
      remaining: 0,
      reason: 'cooldown',
      nextAvailableOn: quizCooldown.nextAvailableOn,
      cooldown: quizCooldown
    };
  }

  const usage = await getUsageRecord(userId);
  const remaining = Math.max(DAILY_AI_LIMITS.quiz - usage.quizzes_used, 0);
  return {
    allowed: remaining > 0,
    remaining,
    reason: remaining > 0 ? 'available' : 'limit',
    nextAvailableOn: quizCooldown.nextAvailableOn,
    cooldown: quizCooldown
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
    const quizCooldown = await getQuizCooldownInfo(userId, { transaction });
    if (quizCooldown.inCooldown) {
      return {
        allowed: false,
        remaining: 0,
        reason: 'cooldown',
        nextAvailableOn: quizCooldown.nextAvailableOn,
        cooldown: quizCooldown
      };
    }

    const usage = await getUsageRecord(userId, { transaction, lockRow: true });
    if (usage.quizzes_used >= DAILY_AI_LIMITS.quiz) {
      return {
        allowed: false,
        remaining: 0,
        reason: 'limit',
        nextAvailableOn: quizCooldown.nextAvailableOn,
        cooldown: quizCooldown
      };
    }

    await usage.update({
      quizzes_used: usage.quizzes_used + 1
    }, { transaction });

    const quizzesUsedAfter = usage.quizzes_used + 1;
    const remaining = Math.max(DAILY_AI_LIMITS.quiz - quizzesUsedAfter, 0);
    const updatedCooldown = await getQuizCooldownInfo(userId, { transaction });
    return {
      allowed: true,
      remaining,
      reason: 'available',
      nextAvailableOn: updatedCooldown.nextAvailableOn,
      cooldown: updatedCooldown
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

  // Allow request even if requestedTokens > remaining
  // We'll use whatever tokens are available up to the limit
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
