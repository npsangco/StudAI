import express from "express";
import PetCompanion from "../models/PetCompanion.js";

const router = express.Router();

// decay config
const DECAY_RATES = {
  hunger: 10,      // lost per x
  happiness: 10,     // lost per x
  cleanliness: 5, // lost per x
};

const DECAY_INTERVALS = {
  hunger: 1,       // x minutes
  happiness: 1,    // x minutes
  cleanliness: 1, // x minutes
};

const ENERGY_REPLENISH = {
  amount: 10,       // points gained
  interval: 10,     // x seconds
};

// decay calculation
function calculateDecay(lastActionTime, currentTime, decayRate, decayInterval) {
  if (!lastActionTime) return 0;
  
  const minutesElapsed = (currentTime - new Date(lastActionTime)) / (1000 * 60);
  const decayPeriods = Math.floor(minutesElapsed / decayInterval);
  return decayPeriods * decayRate;
}

async function applyStatDecay(pet) {
  const now = new Date();
  
  const hungerDecay = calculateDecay(
    pet.last_fed, 
    now, 
    DECAY_RATES.hunger, 
    DECAY_INTERVALS.hunger
  );
  
  const happinessDecay = calculateDecay(
    pet.last_played, 
    now, 
    DECAY_RATES.happiness, 
    DECAY_INTERVALS.happiness
  );
  
  const cleanlinessDecay = calculateDecay(
    pet.last_cleaned, 
    now, 
    DECAY_RATES.cleanliness, 
    DECAY_INTERVALS.cleanliness
  );

  // replenishment calculation
  let energyReplenish = 0;
  if (pet.last_updated) {
    const secondsElapsed = (now - new Date(pet.last_updated)) / 1000;
    const replenishPeriods = Math.floor(secondsElapsed / ENERGY_REPLENISH.interval);
    energyReplenish = replenishPeriods * ENERGY_REPLENISH.amount;
  }

  // decay and replenishment application
  const updatedStats = {
    hunger_level: Math.max(0, Math.min(100, pet.hunger_level - hungerDecay)),
    happiness_level: Math.max(0, Math.min(100, pet.happiness_level - happinessDecay)),
    cleanliness_level: Math.max(0, Math.min(100, pet.cleanliness_level - cleanlinessDecay)),
    energy_level: Math.max(0, Math.min(100, pet.energy_level + energyReplenish)),
    last_updated: now,
  };

  // This ensures last_updated is always current for the next calculation
  await pet.update(updatedStats);
  
  if (hungerDecay > 0 || happinessDecay > 0 || cleanlinessDecay > 0 || energyReplenish > 0) {
    console.log(`🾨 Stats updated: -${hungerDecay.toFixed(1)} hunger, -${happinessDecay.toFixed(1)} happiness, -${cleanlinessDecay.toFixed(1)} cleanliness, +${energyReplenish} energy`);
  }

  return pet;
}

// exp requirement calculation
function getExpNeeded(level) {
  return Math.floor(100 * Math.pow(1.1, level - 1));
}

// get user's pet
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

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

// pet adoption
router.post("/", async (req, res) => {
  const { userId, petType, petName } = req.body;

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

    // default name
    const finalPetName = petName && petName.trim() ? petName.trim() : 
                        (petType === "Dog" ? "Doggo" : "Kitty");

    // pet name validation
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

    res.json(newPet);
  } catch (err) {
    console.error("Create pet error:", err);
    res.status(500).json({ error: "Failed to adopt pet." });
  }
});

// update pet name
router.put("/:petId/name", async (req, res) => {
  const { petId } = req.params;
  const { petName } = req.body;

  try {
    const pet = await PetCompanion.findOne({ where: { pet_id: petId } });
    if (!pet) {
      return res.status(404).json({ error: "Pet not found." });
    }

    // Validate name
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

    res.json(pet);
  } catch (err) {
    console.error("Update pet name error:", err);
    res.status(500).json({ error: "Failed to update pet name." });
  }
});

// pet actions
router.post("/action", async (req, res) => {
  const { userId, actionType } = req.body;

  try {
    let pet = await PetCompanion.findOne({ where: { user_id: userId } });
    if (!pet) {
      return res.status(404).json({ error: "Pet not found." });
    }

    pet = await applyStatDecay(pet);

    const now = new Date();
    
    const actions = {
      feed: { 
        hunger_level: Math.min(100, pet.hunger_level + 20),
        last_fed: now,
        expGain: 5 
      },
      play: { 
        happiness_level: Math.min(100, pet.happiness_level + 15), 
        energy_level: Math.max(0, pet.energy_level - 10),
        last_played: now,
        expGain: 8 
      },
      clean: { 
        cleanliness_level: Math.min(100, pet.cleanliness_level + 25),
        last_cleaned: now,
        expGain: 5 
      },
    };

    if (!actions[actionType]) {
      return res.status(400).json({ error: "Invalid action type." });
    }

    const action = actions[actionType];
    let newExp = pet.experience_points + action.expGain;
    let newLevel = pet.level;

    let expNeeded = getExpNeeded(newLevel);
    while (newExp >= expNeeded) {
      newExp -= expNeeded;
      newLevel++;
      expNeeded = getExpNeeded(newLevel);
    }

    await pet.update({
      ...action,
      experience_points: newExp,
      level: newLevel,
      last_updated: now,
    });

    // return updated pet
    const updatedPet = await PetCompanion.findOne({ where: { user_id: userId } });
    res.json(updatedPet);
  } catch (err) {
    console.error("Pet action error:", err);
    res.status(500).json({ error: "Failed to perform action." });
  }
});

export default router;