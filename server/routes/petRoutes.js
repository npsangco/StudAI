// petRoutes.js (Optimized with Caching & Performance & Authentication)
import express from "express";
import sequelize from "../db.js";
import PetCompanion from "../models/PetCompanion.js";
import PetItem from "../models/PetItem.js";
import UserPetItem from "../models/UserPetItem.js";
import User from "../models/User.js";
import rateLimit from "express-rate-limit";
import NodeCache from "node-cache";

const router = express.Router();

// Authentication Middleware
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
};

// Performance Optimizations using nodecache
const cache = new NodeCache({ 
  stdTTL: 300, // 5 minutes cache
  checkperiod: 60 
});

// rate limiter
const actionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 requests per minute
  message: { error: "Too many actions, please try again later." },
  skipSuccessfulRequests: false,
});

const purchaseLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 5 purchases per minute
  message: { error: "Too many purchases, please slow down." }
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 general requests per minute
  message: { error: "Too many requests, please try again later." }
});

// Helper configurations for actions
const DECAY_RATES = { hunger: 10, happiness: 10, cleanliness: 5 };
const DECAY_INTERVALS = { hunger: 1, happiness: 1, cleanliness: 1 };
const ENERGY_REPLENISH = { amount: 10, interval: 10 };

// Cache key generators
const getPetCacheKey = (userId) => `pet:${userId}`;
const getInventoryCacheKey = (userId) => `inventory:${userId}`;
const getShopCacheKey = () => 'shop:items';
const getUserCacheKey = (userId) => `user:${userId}`;

function calculateDecay(lastActionTime, currentTime, decayRate, decayInterval) {
  if (!lastActionTime) return 0;
  const minutesElapsed = (currentTime - new Date(lastActionTime)) / (1000 * 60);
  const decayPeriods = Math.floor(minutesElapsed / decayInterval);
  return decayPeriods * decayRate;
}

async function applyStatDecay(pet) {
  const now = new Date();

  const hungerDecay = calculateDecay(pet.last_fed, now, DECAY_RATES.hunger, DECAY_INTERVALS.hunger);
  const happinessDecay = calculateDecay(pet.last_played, now, DECAY_RATES.happiness, DECAY_INTERVALS.happiness);
  const cleanlinessDecay = calculateDecay(pet.last_cleaned, now, DECAY_RATES.cleanliness, DECAY_INTERVALS.cleanliness);

  let energyReplenish = 0;
  if (pet.last_updated) {
    const secondsElapsed = (now - new Date(pet.last_updated)) / 1000;
    const replenishPeriods = Math.floor(secondsElapsed / ENERGY_REPLENISH.interval);
    energyReplenish = replenishPeriods * ENERGY_REPLENISH.amount;
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
  return Math.floor(100 * Math.pow(1.1, level - 1));
}

// Helper function to get equipped items for a specific effect type
async function getEquippedItems(userId, effectType) {
  const equippedItems = await UserPetItem.findAll({
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

  return equippedItems;
}

// Helper function to select best items to use
function selectItemsToUse(equippedItems, currentLevel, maxLevel = 100) {
  const itemsToUse = [];
  let remainingNeeded = maxLevel - currentLevel;

  // Sort items by effect value (highest first)
  const sortedItems = [...equippedItems].sort((a, b) => 
    b.PetItem.effect_value - a.PetItem.effect_value
  );

  for (const item of sortedItems) {
    if (remainingNeeded <= 0) break;

    const effectValue = item.PetItem.effect_value;
    
    // If remaining needed is less than the highest effect, find a better fit
    if (remainingNeeded < effectValue) {
      // Look for an item with effect value closer to remainingNeeded
      const betterFit = sortedItems.find(i => 
        i.PetItem.effect_value <= remainingNeeded && 
        !itemsToUse.includes(i)
      );
      
      if (betterFit) {
        itemsToUse.push(betterFit);
        remainingNeeded -= betterFit.PetItem.effect_value;
      } else {
        // Use the highest anyway if no better fit
        itemsToUse.push(item);
        remainingNeeded -= effectValue;
      }
    } else {
      // Use the highest effect item
      itemsToUse.push(item);
      remainingNeeded -= effectValue;
    }
  }

  return itemsToUse;
}

// Auto-equip first item of each category
async function autoEquipFirstItems(userId) {
  try {
    // Group items in the invv by categories
    const inventoryItems = await UserPetItem.findAll({
      where: { user_id: userId },
      include: [PetItem],
      order: [[PetItem, 'effect_type', 'ASC']]
    });

    // Group by effect type and equip the first item of each type
    const itemsByType = {};
    inventoryItems.forEach(item => {
      const effectType = item.PetItem.effect_type;
      if (!itemsByType[effectType]) {
        itemsByType[effectType] = [];
      }
      itemsByType[effectType].push(item);
    });

    // Equip first item of each type that isn't already equipped
    const equipPromises = [];
    Object.values(itemsByType).forEach(items => {
      const firstItem = items[0];
      if (firstItem && !firstItem.is_equipped) {
        equipPromises.push(
          firstItem.update({ is_equipped: true })
        );
      }
    });

    await Promise.all(equipPromises);
    return true;
  } catch (error) {
    console.error("Auto-equip error:", error);
    return false;
  }
}

// Clear user-related cache
function clearUserCache(userId) {
  cache.del(getPetCacheKey(userId));
  cache.del(getInventoryCacheKey(userId));
  cache.del(getUserCacheKey(userId));
}

// Get user's pet with caching
router.get("/", generalLimiter, requireAuth, async (req, res) => {
  const userId = req.session.userId;

  try {
    const cacheKey = getPetCacheKey(userId);
    const cachedPet = cache.get(cacheKey);
    
    if (cachedPet) {
      return res.json(cachedPet);
    }

    let pet = await PetCompanion.findOne({ where: { user_id: userId } });
    
    if (!pet) {
      const response = { choosePet: true };
      cache.set(cacheKey, response, 60); // Cache for 1 minute
      return res.json(response);
    }

    pet = await applyStatDecay(pet);
    
    // Cache the pet data for 30 seconds
    cache.set(cacheKey, pet, 30);
    res.json(pet);
  } catch (err) {
    console.error("Get pet error:", err);
    res.status(500).json({ error: "Failed to fetch pet." });
  }
});

// Pet adoption
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

    // Clear cache for this user
    clearUserCache(userId);
    
    res.json(newPet);
  } catch (err) {
    console.error("Create pet error:", err);
    res.status(500).json({ error: "Failed to adopt pet." });
  }
});

// Update pet name
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

    // Clear cache for this user
    clearUserCache(userId);
    
    res.json(pet);
  } catch (err) {
    console.error("Update pet name error:", err);
    res.status(500).json({ error: "Failed to update pet name." });
  }
});

// Pet actions
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

    // Map action types to effect types
    const actionEffectMap = {
      feed: { effectType: 'hunger', statKey: 'hunger_level', timestampKey: 'last_fed' },
      play: { effectType: 'happiness', statKey: 'happiness_level', timestampKey: 'last_played' },
      clean: { effectType: 'cleanliness', statKey: 'cleanliness_level', timestampKey: 'last_cleaned' }
    };

    if (!actionEffectMap[actionType]) {
      return res.status(400).json({ error: "Invalid action type." });
    }

    const { effectType, statKey, timestampKey } = actionEffectMap[actionType];

    // Get equipped items for this action
    const equippedItems = await getEquippedItems(userId, effectType);

    if (equippedItems.length === 0) {
      return res.status(400).json({ 
        error: `No ${effectType} items equipped! Please equip items from your inventory first.` 
      });
    }

    // Select best items to use
    const itemsToUse = selectItemsToUse(equippedItems, pet[statKey]);

    if (itemsToUse.length === 0) {
      return res.status(400).json({ 
        error: `Your ${statKey.replace('_level', '')} is already at maximum!` 
      });
    }

    // Calculate total effect
    let totalEffect = 0;
    for (const item of itemsToUse) {
      totalEffect += item.PetItem.effect_value;
      totalExpGain += 3; // Exp per item used
      itemsUsed.push({
        name: item.PetItem.item_name,
        effect: item.PetItem.effect_value
      });
    }

    // Apply stat changes
    updates[statKey] = Math.min(100, pet[statKey] + totalEffect);
    updates[timestampKey] = now;

    // Special handling for play action (reduces energy)
    if (actionType === 'play') {
      updates.energy_level = Math.max(0, pet.energy_level - 10);
    }

    // Calculate experience and level up
    let newExp = pet.experience_points + totalExpGain;
    let newLevel = pet.level;
    let expNeeded = getExpNeeded(newLevel);

    while (newExp >= expNeeded) {
      newExp -= expNeeded;
      newLevel++;
      expNeeded = getExpNeeded(newLevel);
    }

    updates.experience_points = newExp;
    updates.level = newLevel;

    // Start transaction to update pet and remove items
    const transaction = await sequelize.transaction();

    try {
      // Update pet stats
      await pet.update(updates, { transaction });

      // Remove used items from inventory
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

      await transaction.commit();

      // Clear cache for this user
      clearUserCache(userId);

      // Return updated pet with info about items used
      const updatedPet = await PetCompanion.findOne({ where: { user_id: userId } });
      
      // Return pet data at root level for backward compatibility
      res.json({
        ...updatedPet.toJSON(),
        itemsUsed,
        totalEffect,
        message: `Used ${itemsUsed.length} item(s) for +${totalEffect} ${effectType}!`
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

// Equip/Unequip item endpoint
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

    // Toggle equipped status
    await inventoryItem.update({ is_equipped: !isEquipped });

    // Clear inventory cache
    cache.del(getInventoryCacheKey(userId));

    res.json({ 
      message: isEquipped ? "Item unequipped" : "Item equipped",
      isEquipped: !isEquipped 
    });

  } catch (err) {
    console.error("Equip item error:", err);
    res.status(500).json({ error: "Failed to update item equipment status." });
  }
});

// Auto-equip first items endpoint
router.post("/inventory/auto-equip", generalLimiter, requireAuth, async (req, res) => {
  const userId = req.session.userId;

  try {
    await autoEquipFirstItems(userId);
    
    // Clear inventory cache
    cache.del(getInventoryCacheKey(userId));
    
    res.json({ message: "Auto-equipped first items of each category" });
  } catch (err) {
    console.error("Auto-equip error:", err);
    res.status(500).json({ error: "Failed to auto-equip items" });
  }
});

// ----------------- SHOP & INVENTORY ROUTES -----------------

// get shop items
router.get("/shop/items", generalLimiter, async (req, res) => {
  try {
    const cacheKey = getShopCacheKey();
    const cachedItems = cache.get(cacheKey);
    
    if (cachedItems) {
      return res.json({ items: cachedItems });
    }

    console.log("🛍️ Fetching shop items from database...");
    const items = await PetItem.findAll({ raw: true });
    
    // Cache shop items for 10 minutes (they rarely change)
    cache.set(cacheKey, items, 600);
    
    res.json({ items });
  } catch (err) {
    console.error("Get shop items error:", err);
    res.status(500).json({ error: "Failed to fetch shop items." });
  }
});

// Purchase item with rate limiting 
router.post("/shop/purchase", purchaseLimiter, requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const { itemId } = req.body;

  try {
    const user = await User.findByPk(userId);
    const item = await PetItem.findByPk(itemId);

    if (!user || !item) {
      return res.status(404).json({ error: "User or item not found." });
    }

    if (user.points < item.cost) {
      return res.status(400).json({ error: "Not enough points." });
    }

    const transaction = await sequelize.transaction();

    try {
      await User.update(
        { points: user.points - item.cost },
        { where: { user_id: userId }, transaction }
      );

      const existingInventory = await UserPetItem.findOne({
        where: { user_id: userId, item_id: itemId },
        transaction
      });

      if (existingInventory) {
        await UserPetItem.update(
          { quantity: existingInventory.quantity + 1 },
          { where: { inventory_id: existingInventory.inventory_id }, transaction }
        );
      } else {
        await UserPetItem.create({
          user_id: userId,
          item_id: itemId,
          quantity: 1,
        }, { transaction });
      }

      await transaction.commit();

      // Auto-equip the first item of this type for new users
      try {
        await autoEquipFirstItems(userId);
      } catch (equipError) {
        console.log("Auto-equip not critical, continuing...", equipError);
      }

      // Clear all user-related cache
      clearUserCache(userId);

      const updatedUser = await User.findByPk(userId);
      res.json({ 
        message: "Purchase successful", 
        updatedPoints: updatedUser.points 
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

// Get user inventory with caching
router.get("/inventory", generalLimiter, requireAuth, async (req, res) => {
  const userId = req.session.userId;

  try {
    const cacheKey = getInventoryCacheKey(userId);
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

    // Cache inventory for 1 minute
    cache.set(cacheKey, formattedInventory, 60);
    
    res.json({ inventory: formattedInventory });
  } catch (err) {
    console.error("Get inventory error:", err);
    res.status(500).json({ error: "Failed to fetch inventory." });
  }
});

// Use item from inventory (manual use)
router.post("/inventory/use", actionLimiter, requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const { inventoryId } = req.body;

  try {
    const inventoryItem = await UserPetItem.findOne({
      where: { inventory_id: inventoryId, user_id: userId },
      include: [PetItem]
    });

    if (!inventoryItem) {
      return res.status(404).json({ error: "Item not found in inventory." });
    }

    let pet = await PetCompanion.findOne({ where: { user_id: userId } });
    if (!pet) {
      return res.status(404).json({ error: "Pet not found." });
    }

    pet = await applyStatDecay(pet);

    const item = inventoryItem.PetItem;
    const now = new Date();

    const updates = { last_updated: now };

    switch (item.effect_type) {
      case 'hunger':
        updates.hunger_level = Math.min(100, pet.hunger_level + item.effect_value);
        updates.last_fed = now;
        break;
      case 'happiness':
        updates.happiness_level = Math.min(100, pet.happiness_level + item.effect_value);
        updates.last_played = now;
        break;
      case 'cleanliness':
        updates.cleanliness_level = Math.min(100, pet.cleanliness_level + item.effect_value);
        updates.last_cleaned = now;
        break;
      case 'energy':
        updates.energy_level = Math.min(100, pet.energy_level + item.effect_value);
        break;
      default:
        break;
    }

    let newExp = pet.experience_points + 3;
    let newLevel = pet.level;
    let expNeeded = getExpNeeded(newLevel);

    while (newExp >= expNeeded) {
      newExp -= expNeeded;
      newLevel++;
      expNeeded = getExpNeeded(newLevel);
    }

    updates.experience_points = newExp;
    updates.level = newLevel;

    await pet.update(updates);

    if (inventoryItem.quantity > 1) {
      await UserPetItem.update(
        { quantity: inventoryItem.quantity - 1 },
        { where: { inventory_id: inventoryId } }
      );
    } else {
      await UserPetItem.destroy({ where: { inventory_id: inventoryId } });
    }

    // Clear user cache
    clearUserCache(userId);

    const updatedPet = await PetCompanion.findOne({ where: { user_id: userId } });
    res.json({ updatedPet });

  } catch (err) {
    console.error("Use item error:", err);
    res.status(500).json({ error: "Failed to use item." });
  }
});

export default router;