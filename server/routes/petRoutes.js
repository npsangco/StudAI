// petRoutes.js - Updated with Pet Buddy v2.1 Configuration
import express from "express";
import sequelize from "../db.js";
import PetCompanion from "../models/PetCompanion.js";
import PetItem from "../models/PetItem.js";
import UserPetItem from "../models/UserPetItem.js";
import User from "../models/User.js";
import UserDailyStat from "../models/UserDailyStat.js";
import rateLimit from "express-rate-limit";
import NodeCache from "node-cache";

const router = express.Router();

// ============================================
// CONFIGURATION (Pet Buddy v2.1)
// ============================================

const CONFIG = {
  stats: {
    hunger: { decay: 10, interval: 180, max: 100 },      // 3 hours
    happiness: { decay: 10, interval: 180, max: 100 },   // 3 hours
    cleanliness: { decay: 5, interval: 240, max: 100 },  // 4 hours
    energy: { replenish: 5, interval: 300, max: 100 }    // 5 minutes
  },
  exp: {
    perItem: 4,  // EXP per item used
    maxLevel: 50 // Max level changed from 100
  },
  shop: {
    energy: { cost: 40, effect: 35 } // Reduced from 70
  }
};

// ============================================
// MIDDLEWARE & CACHING
// ============================================

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
};

const cache = new NodeCache({ 
  stdTTL: 300,
  checkperiod: 60 
});

const actionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: "Too many actions, please try again later." }
});

const purchaseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // Reduced from 100
  message: { error: "Too many purchases, please slow down." }
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many requests, please try again later." }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateDecay(lastActionTime, currentTime, statType) {
  if (!lastActionTime) return 0;
  
  const config = CONFIG.stats[statType];
  const minutesElapsed = (currentTime - new Date(lastActionTime)) / (1000 * 60);
  const decayPeriods = Math.floor(minutesElapsed / config.interval);
  
  return decayPeriods * config.decay;
}

async function applyStatDecay(pet) {
  const now = new Date();

  const hungerDecay = calculateDecay(pet.last_fed, now, 'hunger');
  const happinessDecay = calculateDecay(pet.last_played, now, 'happiness');
  const cleanlinessDecay = calculateDecay(pet.last_cleaned, now, 'cleanliness');

  // Energy replenishment
  let energyReplenish = 0;
  if (pet.last_updated) {
    const secondsElapsed = (now - new Date(pet.last_updated)) / 1000;
    const replenishPeriods = Math.floor(secondsElapsed / CONFIG.stats.energy.interval);
    energyReplenish = replenishPeriods * CONFIG.stats.energy.replenish;
  }

  const updatedStats = {
    hunger_level: Math.max(0, Math.min(100, pet.hunger_level - hungerDecay)),
    happiness_level: Math.max(0, Math.min(100, pet.happiness_level - happinessDecay)),
    cleanliness_level: Math.max(0, Math.min(100, pet.cleanliness_level - cleanlinessDecay)),
    energy_level: Math.max(0, Math.min(100, pet.energy_level + energyReplenish)),
    last_updated: now,
  };

  await pet.update(updatedStats);
  return pet;
}

function getExpNeeded(level) {
  // Formula: 100 × 1.08^(level-1)
  return Math.floor(100 * Math.pow(1.08, level - 1));
}

async function getEquippedItems(userId, effectType) {
  return await UserPetItem.findAll({
    where: { 
      user_id: userId, 
      is_equipped: true 
    },
    include: [{
      model: PetItem,
      where: { effect_type: effectType },
      required: true
    }],
    order: [[PetItem, 'effect_value', 'DESC']]
  });
}

function selectItemsToUse(equippedItems, currentLevel, maxLevel = 100) {
  const itemsToUse = [];
  let remainingNeeded = maxLevel - currentLevel;
  const usedIndices = new Set();

  const sortedItems = [...equippedItems].sort((a, b) => 
    a.PetItem.effect_value - b.PetItem.effect_value
  );

  for (let i = 0; i < sortedItems.length && remainingNeeded > 0; i++) {
    if (usedIndices.has(i)) continue;
    
    const item = sortedItems[i];
    const effectValue = item.PetItem.effect_value;
    
    if (effectValue > remainingNeeded) {
      let bestIdx = i;
      let bestWaste = effectValue - remainingNeeded;
      
      for (let j = i + 1; j < sortedItems.length; j++) {
        if (usedIndices.has(j)) continue;
        const altEffect = sortedItems[j].PetItem.effect_value;
        
        if (altEffect <= remainingNeeded) {
          bestIdx = j;
          bestWaste = 0;
          break;
        }
        
        const waste = altEffect - remainingNeeded;
        if (waste < bestWaste) {
          bestIdx = j;
          bestWaste = waste;
        }
      }
      
      itemsToUse.push(sortedItems[bestIdx]);
      usedIndices.add(bestIdx);
      remainingNeeded -= sortedItems[bestIdx].PetItem.effect_value;
    } else {
      itemsToUse.push(item);
      usedIndices.add(i);
      remainingNeeded -= effectValue;
    }
  }

  return itemsToUse;
}

async function autoEquipFirstItems(userId, transaction = null) {
  const inventoryItems = await UserPetItem.findAll({
    where: { user_id: userId },
    include: [PetItem],
    order: [[PetItem, 'effect_type', 'ASC']],
    transaction
  });

  const itemsByType = {};
  inventoryItems.forEach(item => {
    const effectType = item.PetItem.effect_type;
    if (!itemsByType[effectType]) {
      itemsByType[effectType] = [];
    }
    itemsByType[effectType].push(item);
  });

  const equipPromises = [];
  Object.values(itemsByType).forEach(items => {
    const firstItem = items[0];
    if (firstItem && !firstItem.is_equipped) {
      equipPromises.push(
        firstItem.update({ is_equipped: true }, { transaction })
      );
    }
  });

  await Promise.all(equipPromises);
  return true;
}

function clearUserCache(userId) {
  cache.del(`pet:${userId}`);
  cache.del(`inventory:${userId}`);
  cache.del(`user:${userId}`);
}

// ============================================
// DAILY STATS & ACHIEVEMENT TRACKING
// ============================================

async function logDailyStats(userId, activityType, points, exp) {
  const today = new Date().toISOString().split('T')[0];
  
  let dailyStat = await UserDailyStat.findOne({
    where: { user_id: userId, last_reset_date: today }
  });
  
  if (!dailyStat) {
    dailyStat = await UserDailyStat.create({
      user_id: userId,
      stat_date: today,
      notes_created: 0,
      quizzes_completed: 0,
      tasks_added: 0,
      points_earned: 0,
      exp_earned: 0,
      streak_active: false
    });
  }
  
  const updates = {
    points_earned: dailyStat.points_earned + points,
    exp_earned: dailyStat.exp_earned + exp
  };
  
  switch(activityType) {
    case 'pet_action':
      // Track pet actions
      break;
    case 'quiz':
      updates.quizzes_completed = dailyStat.quizzes_completed + 1;
      break;
  }
  
  await dailyStat.update(updates);
  return dailyStat;
}

async function checkPetAchievements(userId) {
  // Import achievement checker if available
  // This should be implemented in a separate achievementService.js
  try {
    const { checkAndUnlockAchievements } = await import('../services/achievementService.js');
    return await checkAndUnlockAchievements(userId);
  } catch (err) {
    console.log('Achievement service not available:', err.message);
    return [];
  }
}

// ============================================
// PET ROUTES
// ============================================

router.get("/", generalLimiter, requireAuth, async (req, res) => {
  const userId = req.session.userId;

  try {
    const cacheKey = `pet:${userId}`;
    const cachedPet = cache.get(cacheKey);
    
    if (cachedPet) {
      return res.json(cachedPet);
    }

    let pet = await PetCompanion.findOne({ where: { user_id: userId } });
    
    if (!pet) {
      const response = { choosePet: true };
      cache.set(cacheKey, response, 60);
      return res.json(response);
    }

    pet = await applyStatDecay(pet);
    
    cache.set(cacheKey, pet, 30);
    res.json(pet);
  } catch (err) {
    console.error("Get pet error:", err);
    res.status(500).json({ error: "Failed to fetch pet." });
  }
});

router.post("/", generalLimiter, requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const { petType, petName } = req.body;

  try {
    const existingPet = await PetCompanion.findOne({ where: { user_id: userId } });
    if (existingPet) {
      return res.status(400).json({ error: "User already has a pet." });
    }

    const defaultStats = {
      Dog: {
        happiness_level: 60,
        hunger_level: 50,
        cleanliness_level: 40,
        energy_level: 70,
      },
      Cat: {
        happiness_level: 70,
        hunger_level: 45,
        cleanliness_level: 60,
        energy_level: 65,
      },
    };

    const finalPetName = petName && petName.trim() ? petName.trim() : 
      (petType === "Dog" ? "Doggo" : "Kitty");

    if (finalPetName.length === 0) {
      return res.status(400).json({ error: "Pet name cannot be empty." });
    }

    if (finalPetName.length > 20) {
      return res.status(400).json({ error: "Pet name cannot exceed 20 characters." });
    }

    const now = new Date();
    const newPet = await PetCompanion.create({
      user_id: userId,
      pet_type: petType,
      pet_name: finalPetName,
      ...defaultStats[petType],
      experience_points: 0,
      level: 1,
      last_fed: now,
      last_played: now,
      last_cleaned: now,
      last_updated: now,
    });

    // Check achievement: Pet Parent
    await checkPetAchievements(userId);
    
    clearUserCache(userId);
    res.json(newPet);
  } catch (err) {
    console.error("Create pet error:", err);
    res.status(500).json({ error: "Failed to adopt pet." });
  }
});

router.put("/name", generalLimiter, requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const { petName } = req.body;

  try {
    const pet = await PetCompanion.findOne({ where: { user_id: userId } });
    if (!pet) {
      return res.status(404).json({ error: "Pet not found." });
    }

    if (!petName || petName.trim().length === 0) {
      return res.status(400).json({ error: "Pet name cannot be empty." });
    }

    if (petName.length > 20) {
      return res.status(400).json({ error: "Pet name cannot exceed 20 characters." });
    }

    await pet.update({
      pet_name: petName.trim(),
      last_updated: new Date(),
    });

    clearUserCache(userId);
    res.json(pet);
  } catch (err) {
    console.error("Update pet name error:", err);
    res.status(500).json({ error: "Failed to update pet name." });
  }
});

router.post("/action", actionLimiter, requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const { actionType } = req.body;

  try {
    let pet = await PetCompanion.findOne({ where: { user_id: userId } });
    if (!pet) {
      return res.status(404).json({ error: "Pet not found." });
    }

    pet = await applyStatDecay(pet);

    const now = new Date();
    const updates = { last_updated: now };
    let totalExpGain = 0;
    let itemsUsed = [];

    const actionEffectMap = {
      feed: { effectType: 'hunger', statKey: 'hunger_level', timestampKey: 'last_fed' },
      play: { effectType: 'happiness', statKey: 'happiness_level', timestampKey: 'last_played' },
      clean: { effectType: 'cleanliness', statKey: 'cleanliness_level', timestampKey: 'last_cleaned' }
    };

    if (!actionEffectMap[actionType]) {
      return res.status(400).json({ error: "Invalid action type." });
    }

    const { effectType, statKey, timestampKey } = actionEffectMap[actionType];

    const equippedItems = await getEquippedItems(userId, effectType);

    if (equippedItems.length === 0) {
      return res.status(400).json({ 
        error: `No ${effectType} items equipped! Please equip items from your inventory first.` 
      });
    }

    const itemsToUse = selectItemsToUse(equippedItems, pet[statKey]);

    if (itemsToUse.length === 0) {
      return res.status(400).json({ 
        error: `Your ${statKey.replace('_level', '')} is already at maximum!` 
      });
    }

    let totalEffect = 0;
    for (const item of itemsToUse) {
      totalEffect += item.PetItem.effect_value;
      totalExpGain += CONFIG.exp.perItem; // 4 EXP per item
      itemsUsed.push({
        name: item.PetItem.item_name,
        effect: item.PetItem.effect_value
      });
    }

    updates[statKey] = Math.min(100, pet[statKey] + totalEffect);
    updates[timestampKey] = now;

    if (actionType === 'play') {
      updates.energy_level = Math.max(0, pet.energy_level - 10);
    }

    // Level up calculation with MAX LEVEL 50
    let newExp = pet.experience_points + totalExpGain;
    let newLevel = pet.level;
    let expNeeded = getExpNeeded(newLevel);
    let levelsGained = 0;

    while (newExp >= expNeeded && newLevel < CONFIG.exp.maxLevel) {
      newExp -= expNeeded;
      newLevel++;
      levelsGained++;
      expNeeded = getExpNeeded(newLevel);
    }

    updates.experience_points = newExp;
    updates.level = newLevel;

    // Track pet action count
    const actionCountKey = `times_${actionType === 'feed' ? 'fed' : actionType === 'play' ? 'played' : 'cleaned'}`;
    if (pet[actionCountKey] !== undefined) {
      updates[actionCountKey] = pet[actionCountKey] + 1;
    }

    const transaction = await sequelize.transaction();

    try {
      await pet.update(updates, { transaction });

      for (const item of itemsToUse) {
        if (item.quantity > 1) {
          await UserPetItem.update(
            { quantity: item.quantity - 1 },
            { where: { inventory_id: item.inventory_id }, transaction }
          );
        } else {
          await UserPetItem.destroy({ 
            where: { inventory_id: item.inventory_id },
            transaction 
          });
        }
      }

      // Log daily stats
      await logDailyStats(userId, 'pet_action', 0, totalExpGain);

      // Check achievements (Dedicated Caretaker, Pet Trainer, etc.)
      if (levelsGained > 0) {
        await checkPetAchievements(userId);
      }

      await transaction.commit();
      clearUserCache(userId);

      const updatedPet = await PetCompanion.findOne({ where: { user_id: userId } });
      
      res.json({
        ...updatedPet.toJSON(),
        itemsUsed,
        totalEffect,
        expGained: totalExpGain,
        levelsGained,
        message: levelsGained > 0 
          ? `Level up! Now level ${newLevel}! Used ${itemsUsed.length} item(s) for +${totalEffect} ${effectType}!`
          : `Used ${itemsUsed.length} item(s) for +${totalEffect} ${effectType}!`
      });

    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch (err) {
    console.error("Pet action error:", err);
    res.status(500).json({ error: "Failed to perform action." });
  }
});

// ============================================
// INVENTORY ROUTES
// ============================================

router.post("/inventory/equip", generalLimiter, requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const { inventoryId, isEquipped } = req.body;

  try {
    const inventoryItem = await UserPetItem.findOne({
      where: { inventory_id: inventoryId, user_id: userId },
      include: [PetItem]
    });

    if (!inventoryItem) {
      return res.status(404).json({ error: "Item not found in inventory." });
    }

    await inventoryItem.update({ is_equipped: !isEquipped });
    cache.del(`inventory:${userId}`);

    res.json({ 
      message: isEquipped ? "Item unequipped" : "Item equipped",
      isEquipped: !isEquipped 
    });

  } catch (err) {
    console.error("Equip item error:", err);
    res.status(500).json({ error: "Failed to update item equipment status." });
  }
});

router.post("/inventory/auto-equip", generalLimiter, requireAuth, async (req, res) => {
  const userId = req.session.userId;

  try {
    await autoEquipFirstItems(userId);
    cache.del(`inventory:${userId}`);
    
    res.json({ message: "Auto-equipped first items of each category" });
  } catch (err) {
    console.error("Auto-equip error:", err);
    res.status(500).json({ error: "Failed to auto-equip items" });
  }
});

router.get("/inventory", generalLimiter, requireAuth, async (req, res) => {
  const userId = req.session.userId;

  try {
    const cacheKey = `inventory:${userId}`;
    const cachedInventory = cache.get(cacheKey);
    
    if (cachedInventory) {
      return res.json({ inventory: cachedInventory });
    }

    const inventory = await UserPetItem.findAll({
      where: { user_id: userId },
      include: [{
        model: PetItem,
        attributes: ['item_name', 'item_type', 'item_description', 'effect_type', 'effect_value']
      }]
    });

    const formattedInventory = inventory.map(invItem => ({
      inventory_id: invItem.inventory_id,
      user_id: invItem.user_id,
      item_id: invItem.item_id,
      quantity: invItem.quantity,
      is_equipped: invItem.is_equipped,
      item_name: invItem.PetItem?.item_name,
      item_type: invItem.PetItem?.item_type,
      item_description: invItem.PetItem?.item_description,
      effect_type: invItem.PetItem?.effect_type,
      effect_value: invItem.PetItem?.effect_value
    }));

    cache.set(cacheKey, formattedInventory, 60);
    res.json({ inventory: formattedInventory });
  } catch (err) {
    console.error("Get inventory error:", err);
    res.status(500).json({ error: "Failed to fetch inventory." });
  }
});

// ============================================
// SHOP ROUTES
// ============================================

router.get("/shop/items", generalLimiter, async (req, res) => {
  try {
    const cacheKey = 'shop:items';
    const cachedItems = cache.get(cacheKey);
    
    if (cachedItems) {
      return res.json({ items: cachedItems });
    }

    const items = await PetItem.findAll({ raw: true });
    cache.set(cacheKey, items, 600);
    
    res.json({ items });
  } catch (err) {
    console.error("Get shop items error:", err);
    res.status(500).json({ error: "Failed to fetch shop items." });
  }
});

router.post("/shop/purchase", purchaseLimiter, requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const { itemId, quantity = 1 } = req.body;

  try {
    const user = await User.findByPk(userId);
    const item = await PetItem.findByPk(itemId);

    if (!user || !item) {
      return res.status(404).json({ error: "User or item not found." });
    }

    const totalCost = item.cost * quantity;

    if (user.points < totalCost) {
      return res.status(400).json({ 
        error: `Not enough points! Need ${totalCost}, have ${user.points}` 
      });
    }

    const transaction = await sequelize.transaction();

    try {
      await User.update(
        { points: user.points - totalCost },
        { where: { user_id: userId }, transaction }
      );

      const existingInventory = await UserPetItem.findOne({
        where: { user_id: userId, item_id: itemId },
        transaction
      });

      if (existingInventory) {
        await UserPetItem.update(
          { quantity: existingInventory.quantity + quantity },
          { where: { inventory_id: existingInventory.inventory_id }, transaction }
        );
      } else {
        await UserPetItem.create({
          user_id: userId,
          item_id: itemId,
          quantity: quantity,
        }, { transaction });
      }

      // Auto-equip if first purchase
      await autoEquipFirstItems(userId, transaction);

      // Check Shopping Spree achievement
      await checkPetAchievements(userId);

      await transaction.commit();
      clearUserCache(userId);

      const updatedUser = await User.findByPk(userId);
      res.json({ 
        message: `Purchase successful! Bought ${quantity}x ${item.item_name}`,
        updatedPoints: updatedUser.points,
        itemsPurchased: quantity,
        totalCost
      });

    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch (err) {
    console.error("Purchase error:", err);
    res.status(500).json({ error: "Failed to purchase item." });
  }
});

export default router;