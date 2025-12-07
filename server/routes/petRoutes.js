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

// Pet decay: stats go from 100→0 in 36 hours, energy replenishes 0→100 in 24 hours
const CONFIG = {
  stats: {
    hunger: { decay: 10, interval: 216, max: 100 },        // ~2.78/hour → 0 in 36h
    happiness: { decay: 10, interval: 216, max: 100 },     // ~2.78/hour → 0 in 36h
    cleanliness: { decay: 10, interval: 216, max: 100 },   // ~2.78/hour → 0 in 36h
    energy: { replenish: 10, interval: 144, max: 100 }      // ~4.17/hour → 100 in 24h
  },
  exp: {
    perItem: 4,
    maxLevel: 50,
    depletionRate: 10,
    depletionInterval: 60
  },
  shop: {
    energy: { cost: 40, effect: 35 }
  }
};

// Checks if user is logged in via session or parent middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  
  if (req.user && req.user.userId) {
    return next();
  }
  
  return res.status(401).json({ 
    error: 'Authentication required. Please log in.',
    authRequired: true 
  });
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
  max: 30,
  message: { error: "Too many purchase requests, please slow down." }
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many requests, please try again later." }
});

// Calculates how much a stat should decay based on time passed
function calculateDecay(lastActionTime, currentTime, statType) {
  if (!lastActionTime) return 0;
  
  const config = CONFIG.stats[statType];
  const lastTime = new Date(lastActionTime);
  const now = new Date(currentTime);
  const minutesElapsed = (now - lastTime) / (1000 * 60);
  
  if (minutesElapsed < 0) {
    console.warn(`[Pet Decay] Negative time for ${statType}: ${minutesElapsed.toFixed(1)} min (lastTime: ${lastTime.toISOString()}, now: ${now.toISOString()})`);
    return 0;
  }
  
  const totalDecay = (minutesElapsed / config.interval) * config.decay;
  
  if (totalDecay > 0) {
    console.log(`[Pet Decay] ${statType}: ${minutesElapsed.toFixed(1)} min elapsed (${(minutesElapsed / 60).toFixed(1)} hrs), decay: -${totalDecay.toFixed(2)} points`);
  }
  
  return totalDecay;
}

// Updates pet stats based on time passed - handles decay and energy regeneration
async function applyStatDecay(pet) {
  const now = new Date();

  const hungerDecay = calculateDecay(pet.last_fed, now, 'hunger');
  const happinessDecay = calculateDecay(pet.last_played, now, 'happiness');
  const cleanlinessDecay = calculateDecay(pet.last_cleaned, now, 'cleanliness');

  let energyReplenish = 0;
  if (pet.last_updated) {
    const lastUpdated = new Date(pet.last_updated);
    const minutesElapsed = (now - lastUpdated) / (1000 * 60);
    
    if (minutesElapsed < 0) {
      console.warn(`[Pet Energy] User ${pet.user_id}: Negative time elapsed: ${minutesElapsed.toFixed(1)} minutes`);
      energyReplenish = 0;
    } else {
      energyReplenish = (minutesElapsed / CONFIG.stats.energy.interval) * CONFIG.stats.energy.replenish;
    }
  }

  const updatedStats = {
    hunger_level: Math.max(0, Math.min(100, pet.hunger_level - hungerDecay)),
    happiness_level: Math.max(0, Math.min(100, pet.happiness_level - happinessDecay)),
    cleanliness_level: Math.max(0, Math.min(100, pet.cleanliness_level - cleanlinessDecay)),
    energy_level: Math.max(0, Math.min(100, pet.energy_level + energyReplenish))
  };
  
  // Only update timestamps if there was meaningful decay or regeneration (>0.01 to account for rounding)
  const hasSignificantChange = hungerDecay > 0.01 || happinessDecay > 0.01 || cleanlinessDecay > 0.01 || energyReplenish > 0.01;
  
  if (hasSignificantChange) {
    // Update last_updated for energy regeneration tracking
    updatedStats.last_updated = now;
    
    // Update action timestamps so next calculation starts from NOW, not the original time
    // This prevents decay from being recalculated on every page refresh
    if (hungerDecay > 0.01) {
      updatedStats.last_fed = now;
    }
    if (happinessDecay > 0.01) {
      updatedStats.last_played = now;
    }
    if (cleanlinessDecay > 0.01) {
      updatedStats.last_cleaned = now;
    }
  }
  
  // When a stat hits zero, ensure timestamp is set to prevent negative decay
  if (updatedStats.hunger_level === 0 && pet.hunger_level > 0) {
    updatedStats.last_fed = now;
  }
  if (updatedStats.happiness_level === 0 && pet.happiness_level > 0) {
    updatedStats.last_played = now;
  }
  if (updatedStats.cleanliness_level === 0 && pet.cleanliness_level > 0) {
    updatedStats.last_cleaned = now;
  }

  // Pet loses XP when neglected (all stats at zero)
  if (updatedStats.hunger_level === 0 && 
      updatedStats.happiness_level === 0 && 
      updatedStats.cleanliness_level === 0) {
    
    if (pet.last_updated) {
      const minutesElapsed = (now - new Date(pet.last_updated)) / (1000 * 60);
      const depletionPeriods = Math.floor(minutesElapsed / CONFIG.exp.depletionInterval);
      const expLoss = depletionPeriods * CONFIG.exp.depletionRate;
      
      if (expLoss > 0) {
        const newExp = Math.max(0, pet.experience_points - expLoss);
        updatedStats.experience_points = newExp;
        
        // Recalculate level based on new EXP
        let newLevel = 1;
        let expSum = 0;
        while (newLevel < CONFIG.exp.maxLevel) {
          const expNeeded = getExpNeeded(newLevel);
          if (expSum + expNeeded > newExp) break;
          expSum += expNeeded;
          newLevel++;
        }
        updatedStats.level = newLevel;
      }
    }
  }

  // Only update if there are actual changes to avoid unnecessary DB writes
  const hasChanges = Object.keys(updatedStats).some(key => {
    if (updatedStats[key] instanceof Date) {
      return updatedStats[key].getTime() !== new Date(pet[key]).getTime();
    }
    return updatedStats[key] !== pet[key];
  });

  if (hasChanges) {
    await pet.update(updatedStats);
    await pet.reload(); // Reload the pet to get updated values
  }
  
  return pet;
}

// Calculate EXP needed for level (formula: 100 * 1.08^(level-1))
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

// Picks which items to use to reach max stat efficiently (minimizes waste)
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

// Equips the first item of each type when user has nothing equipped
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

// Tracks daily activity for achievements and stats
async function logDailyStats(userId, activityType, points, exp) {
  const today = new Date().toISOString().split('T')[0];
  
  const [dailyStat, created] = await UserDailyStat.findOrCreate({
    where: { 
      user_id: userId, 
      last_reset_date: today 
    },
    defaults: {
      user_id: userId,
      last_reset_date: today,
      notes_created_today: 0,
      quizzes_completed_today: 0,
      planner_updates_today: 0,
      points_earned_today: 0,
      exp_earned_today: 0,
      streak_active: false
    }
  });
  
  const updates = {
    points_earned_today: dailyStat.points_earned_today + points,
    exp_earned_today: dailyStat.exp_earned_today + exp
  };
  
  switch(activityType) {
    case 'pet_action':
      // Track pet actions
      break;
    case 'quiz':
      updates.quizzes_completed_today = dailyStat.quizzes_completed_today + 1;
      break;
  }
  
  await dailyStat.update(updates);
  await dailyStat.reload();
  return dailyStat;
}

async function checkPetAchievements(userId) {
  try {
    const { checkAndUnlockAchievements } = await import('../services/achievementServices.js');
    return await checkAndUnlockAchievements(userId);
  } catch (err) {
    console.log('Achievement service not available:', err.message);
    return [];
  }
}

router.get("/", generalLimiter, requireAuth, async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    console.log('[Pet API] 401 Unauthorized - No session.userId');
    return res.status(401).json({ error: 'Not logged in' });
  }
  try {
    let pet = await PetCompanion.findOne({ where: { user_id: userId } });
    
    if (!pet) {
      return res.json({ choosePet: true });
    }

    pet = await applyStatDecay(pet);
    
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

    if (actionType === 'play' && pet.energy_level < 10) {
      return res.status(400).json({ 
        error: "Your pet doesn't have enough energy to play! Energy recharges over time." 
      });
    }

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
      totalExpGain += CONFIG.exp.perItem;
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

      await transaction.commit();
      clearUserCache(userId);

      // Check achievements after transaction commit (Dedicated Caretaker, Pet Trainer, etc.)
      if (levelsGained > 0) {
        checkPetAchievements(userId).catch(err => {
          console.error('Error checking achievements:', err);
        });
      }

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

      await autoEquipFirstItems(userId, transaction);

      await transaction.commit();
      clearUserCache(userId);

      checkPetAchievements(userId).catch(err => {
        console.error('Error checking achievements:', err);
      });

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