# Pet Companion System Documentation

## Overview
The Pet Companion system is a gamification feature that enhances student engagement through virtual pet care mechanics. Players adopt and maintain a pet (Dog or Cat) that grows as they study and complete activities.

---

## Table of Contents
1. [Pet Stats & Decay System](#pet-stats--decay-system)
2. [Energy Regeneration System](#energy-regeneration-system)
3. [Pet Level & Experience System](#pet-level--experience-system)
4. [Points Acquiring System](#points-acquiring-system)
5. [Pet Shop & Inventory](#pet-shop--inventory)
6. [Pet Actions & Items](#pet-actions--items)
7. [Pet Ecosystem Configuration](#pet-ecosystem-configuration)

---

## Pet Stats & Decay System

### Core Stats
Each pet has **4 primary stats** (0-100 scale):
- **Hunger Level** - Increases when fed, decreases over time
- **Happiness Level** - Increases when played with, decreases over time  
- **Cleanliness Level** - Increases when cleaned, decreases over time
- **Energy Level** - Decreases when playing, regenerates over time

### Stat Decay Formula
Stats decay from **100 → 0 in 36 hours** using linear decay:

```javascript
CONFIG = {
  stats: {
    hunger:      { decay: 10, interval: 216, max: 100 },    // ~2.78/hour → 0 in 36h
    happiness:   { decay: 10, interval: 216, max: 100 },    // ~2.78/hour → 0 in 36h
    cleanliness: { decay: 10, interval: 216, max: 100 },    // ~2.78/hour → 0 in 36h
  }
}
```

**Decay Calculation:**
```
minutesElapsed = (currentTime - lastActionTime) / 60000
totalDecay = (minutesElapsed / interval) * decay
newStat = max(0, min(100, currentStat - totalDecay))
```

**Example:** If `hunger_level = 100` and pet is not fed:
- After 3.6 hours: `hunger_level = 90` (10 point loss)
- After 18 hours: `hunger_level = 50` (50 point loss)
- After 36 hours: `hunger_level = 0` (completely hungry)

### Decay Tracking
Each stat has a corresponding timestamp:
- `last_fed` - Tracks hunger decay
- `last_played` - Tracks happiness decay
- `last_cleaned` - Tracks cleanliness decay
- `last_updated` - Tracks overall pet update time

Decay is calculated **on-demand** when:
- Pet data is fetched (`GET /api/pet`)
- Pet action is performed (`POST /api/pet/action`)
- User views pet dashboard

---

## Energy Regeneration System

### Energy Mechanics
Unlike other stats that **decay**, energy **regenerates** over time:

```javascript
energy: { replenish: 10, interval: 144, max: 100 }  // ~4.17/hour → 100 in 24h
```

**Regeneration Formula:**
```
minutesElapsed = (currentTime - last_updated) / 60000
energyReplenish = (minutesElapsed / 144) * 10
newEnergy = min(100, energy_level + energyReplenish)
```

**Energy Recovery Timeline:**
- **0 → 25**: 6 hours
- **0 → 50**: 12 hours  
- **0 → 75**: 18 hours
- **0 → 100**: 24 hours (full recovery)

### Energy Consumption
- **Play Action**: Costs **10 energy** per use
- **Minimum Energy for Play**: 10 energy required
- **Feed/Clean Actions**: No energy cost

---

## Pet Level & Experience System

### Experience Points (EXP)
Pets gain EXP through:
1. **Pet care actions** (feed, play, clean): +4 EXP per item used
2. **Completing quizzes**: Variable EXP based on performance
3. **Creating notes**: +15 EXP per note
4. **Completing planner tasks**: +15 EXP per task

### Level Progression Formula
**EXP Required for Level N:**
```javascript
expNeeded(level) = 100 × 1.08^(level-1)
```

**Level Up Table (Sample):**
```
Level 1 → 2:  100 EXP
Level 2 → 3:  108 EXP
Level 5 → 6:  147 EXP
Level 10 → 11: 216 EXP
Level 20 → 21: 466 EXP
Level 30 → 31: 1006 EXP
Level 40 → 41: 2172 EXP
Level 50: MAX LEVEL
```

**Total EXP to Reach Milestones:**
- Level 10: ~1,549 EXP
- Level 25: ~8,426 EXP
- Level 50 (Max): ~172,371 EXP

### Experience Loss (Neglect Penalty)
When **ALL stats (hunger, happiness, cleanliness) reach 0**:
- Pet loses **10 EXP every 60 minutes**
- Level can decrease if EXP drops below threshold
- Continues until at least one stat is restored

```javascript
CONFIG.exp = {
  depletionRate: 10,
  depletionInterval: 60  // minutes
}
```

**Example Neglect Scenario:**
- Pet at Level 10 (500 EXP accumulated)
- All stats hit 0 for 5 hours → Loses 50 EXP
- New Level might drop to Level 9

---

## Points Acquiring System

### User Points Overview
Points are the primary currency for purchasing pet items and unlocking content. Users earn points through various study activities.

### Points Earning Sources

#### 1. **Quiz Completion**
**Formula (Score-based):**
```javascript
if (percentage >= 100): 50 points
if (percentage >= 80):  40 points
if (percentage >= 60):  30 points
if (percentage >= 40):  20 points
else:                   10 points (participation)
```

**Daily Limit:** 3 quizzes per day
- After 3 quizzes: Still earn EXP but **no points**
- Resets at midnight (based on server timezone)

**Example Earnings:**
- Perfect score (15/15): **50 points** + 30 EXP
- Good score (12/15):   **40 points** + 24 EXP
- Pass (9/15):          **30 points** + 18 EXP

#### 2. **Note Creation**
**Rewards:**
- **50 points** per note created
- **15 EXP** to pet companion

**Daily Limit:** 3 notes per day
- After 3 notes: Still earn EXP but **no points**
- AI-generated summaries count as note creation

#### 3. **Planner Task Completion**
**Rewards:**
- **30 points** per task completed
- **15 EXP** to pet companion
- **10 points** + 10 EXP for creating a task

**Daily Limit:** 3 completed tasks per day
- After 3 tasks: Tasks still mark complete but **no points**

#### 4. **Quiz Battles (Multiplayer)**
**Winner Rewards:**
- **50 points** for winning
- **100 EXP** to pet companion
- **No daily limit** on battle rewards

**Loser Rewards:**
- **0 points** (participation only)

#### 5. **Achievement Unlocks**
Each achievement awards a **one-time points reward** ranging from:
- Small achievements: **50-75 points**
- Medium achievements: **100-200 points**
- Major achievements: **250-500 points**

**Example Achievements:**
- "Pet Adoption": 75 points
- "Pet Caretaker" (20 feeds): 100 points
- "Study Streak" (7 days): 200 points

### Daily Point Caps
```javascript
DAILY_LIMITS = {
  quizzes: 3 completions  (max 50×3 = 150 points)
  notes: 3 creations      (max 50×3 = 150 points)
  tasks: 3 completions    (max 30×3 = 90 points)
  // TOTAL: ~390 points/day from capped activities
  
  battles: UNLIMITED
  achievements: UNLIMITED (one-time only)
}
```

### Daily Stats Tracking
The system tracks daily activity via `UserDailyStat` table:
```javascript
{
  notes_created_today: 0-3,
  quizzes_completed_today: 0-3,
  planner_updates_today: 0-3,
  points_earned_today: total_points,
  exp_earned_today: total_exp,
  last_reset_date: 'YYYY-MM-DD'
}
```

**Reset Behavior:**
- Resets at **midnight (00:00)** server time
- Auto-creates new record on first activity each day
- Old records preserved for statistics

---

## Pet Shop & Inventory

### Shop Items
Items are purchased with **points** and stored in user inventory:

```javascript
PetItem {
  item_id: integer,
  item_name: string,
  item_type: 'food' | 'toy' | 'hygiene',
  cost: integer (points),
  effect_type: 'hunger' | 'happiness' | 'cleanliness',
  effect_value: integer (stat increase)
}
```

**Example Shop Items:**
- **Apple** (food): 20 points, +15 hunger
- **Ball** (toy): 25 points, +20 happiness
- **Soap** (hygiene): 15 points, +10 cleanliness
- **Premium Steak** (food): 50 points, +40 hunger

### Inventory Management
Items are tracked per-user in `UserPetItem`:
```javascript
UserPetItem {
  inventory_id: integer,
  user_id: integer,
  item_id: integer,
  quantity: integer,
  is_equipped: boolean
}
```

**Item Equipping:**
- Users must **equip items** before using them
- Each item type can have multiple equipped simultaneously
- First item of each type **auto-equips** on purchase

### Purchase Flow
1. User selects item from shop (`GET /api/pet/shop/items`)
2. System checks if user has enough points
3. Deducts points: `user.points -= (item.cost × quantity)`
4. Adds to inventory or increases quantity
5. Auto-equips if first item of that type

---

## Pet Actions & Items

### Available Actions

#### 1. **Feed** (Hunger Management)
- **Requires:** Equipped food items (`effect_type: 'hunger'`)
- **Effect:** Increases `hunger_level` by item's `effect_value`
- **EXP Reward:** +4 EXP per item consumed
- **Energy Cost:** None
- **Timestamp Updated:** `last_fed`

#### 2. **Play** (Happiness Management)
- **Requires:** 
  - Equipped toy items (`effect_type: 'happiness'`)
  - Minimum 10 energy
- **Effect:** Increases `happiness_level` by item's `effect_value`
- **EXP Reward:** +4 EXP per item consumed
- **Energy Cost:** -10 energy per play
- **Timestamp Updated:** `last_played`

#### 3. **Clean** (Cleanliness Management)
- **Requires:** Equipped hygiene items (`effect_type: 'cleanliness'`)
- **Effect:** Increases `cleanliness_level` by item's `effect_value`
- **EXP Reward:** +4 EXP per item consumed
- **Energy Cost:** None
- **Timestamp Updated:** `last_cleaned`

### Smart Item Selection Algorithm
The system automatically selects optimal items to minimize waste:

```javascript
function selectItemsToUse(equippedItems, currentLevel, maxLevel = 100) {
  // 1. Calculate need: remainingNeeded = 100 - currentLevel
  // 2. Sort items by effect_value (ascending)
  // 3. Pick items that sum closest to need without much waste
  // 4. Return selected items array
}
```

**Example:**
- Current hunger: 65
- Need: 35 points
- Equipped items: Apple (+15), Steak (+40), Bread (+10)
- **Selected:** Bread (+10) + Apple (+15) = 25 (waste: 10 points unused capacity)
- **Result:** hunger_level = 90 (capped at 100)

### Item Consumption
When action is performed:
- Items are consumed (quantity decremented)
- If `quantity = 1`, item is removed from inventory
- If `quantity > 1`, quantity decreases by 1
- EXP and stat updates occur atomically in transaction

---

## Pet Ecosystem Configuration

### Complete Configuration Object
```javascript
const CONFIG = {
  stats: {
    hunger: { 
      decay: 10,           // Points lost per interval
      interval: 216,       // Minutes per decay cycle
      max: 100            // Maximum stat value
    },
    happiness: { 
      decay: 10, 
      interval: 216, 
      max: 100 
    },
    cleanliness: { 
      decay: 10, 
      interval: 216, 
      max: 100 
    },
    energy: { 
      replenish: 10,      // Points gained per interval
      interval: 144,      // Minutes per regeneration cycle
      max: 100 
    }
  },
  exp: {
    perItem: 4,           // EXP per item used in actions
    maxLevel: 50,         // Maximum pet level
    depletionRate: 10,    // EXP lost per neglect interval
    depletionInterval: 60 // Minutes between neglect penalties
  },
  shop: {
    energy: { 
      cost: 40,           // Points to buy energy boost
      effect: 35          // Energy restored (if implemented)
    }
  }
}
```

### Time Conversion Reference
```
36 hours = 2,160 minutes = decay period for stats (hunger/happiness/cleanliness)
24 hours = 1,440 minutes = full energy regeneration period
216 minutes = 3.6 hours = interval for 10-point stat decay
144 minutes = 2.4 hours = interval for 10-point energy replenish
60 minutes = 1 hour = neglect penalty interval
```

### Pet Types & Starting Stats

#### **Dog**
```javascript
{
  happiness_level: 60,
  hunger_level: 50,
  cleanliness_level: 40,
  energy_level: 70
}
```

#### **Cat**
```javascript
{
  happiness_level: 70,
  hunger_level: 45,
  cleanliness_level: 60,
  energy_level: 65
}
```

**Note:** Both start at **Level 1** with **0 EXP**

---

## Database Schema

### PetCompanion Table
```sql
CREATE TABLE pet_companion (
  pet_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  pet_name VARCHAR(20) NOT NULL,
  pet_type VARCHAR(10) NOT NULL,  -- 'Dog' or 'Cat'
  
  -- Stats (0-100)
  happiness_level INTEGER DEFAULT 50,
  hunger_level INTEGER DEFAULT 50,
  cleanliness_level INTEGER DEFAULT 50,
  energy_level INTEGER DEFAULT 50,
  
  -- Progression
  experience_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  
  -- Decay tracking timestamps
  last_fed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_cleaned TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  all_stats_zero_since TIMESTAMP NULL
);
```

### PetItem Table
```sql
CREATE TABLE pet_items (
  item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_name VARCHAR(255) NOT NULL,
  item_type VARCHAR(50),           -- 'food', 'toy', 'hygiene'
  item_description TEXT,
  cost INTEGER,                    -- Points required to purchase
  effect_type VARCHAR(50),         -- 'hunger', 'happiness', 'cleanliness'
  effect_value INTEGER             -- Stat increase amount
);
```

### UserPetItem Table (Inventory)
```sql
CREATE TABLE user_pet_items (
  inventory_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  is_equipped BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (item_id) REFERENCES pet_items(item_id)
);
```

### UserDailyStat Table (Points & Activity Tracking)
```sql
CREATE TABLE user_daily_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  notes_created_today INTEGER DEFAULT 0,
  quizzes_completed_today INTEGER DEFAULT 0,
  planner_updates_today INTEGER DEFAULT 0,
  points_earned_today INTEGER DEFAULT 0,
  exp_earned_today INTEGER DEFAULT 0,
  last_reset_date DATE NOT NULL,
  streak_active BOOLEAN DEFAULT FALSE
);
```

---

## API Endpoints

### Pet Management
- `GET /api/pet` - Fetch pet data (applies decay)
- `POST /api/pet` - Adopt new pet (Dog/Cat)
- `PUT /api/pet/name` - Rename pet
- `POST /api/pet/action` - Perform action (feed/play/clean)

### Inventory & Shop
- `GET /api/pet/inventory` - Get user's items
- `GET /api/pet/shop/items` - List all shop items
- `POST /api/pet/shop/purchase` - Buy items with points
- `POST /api/pet/inventory/equip` - Equip/unequip item
- `POST /api/pet/inventory/auto-equip` - Auto-equip first items

---

## Key Behaviors & Edge Cases

### 1. **Zero Stats Handling**
- When stat reaches 0, timestamp is updated to prevent negative values
- All stats at 0 → Triggers EXP depletion (neglect penalty)

### 2. **Energy Constraints**
- Play action blocked if energy < 10
- Energy never exceeds 100 (capped)

### 3. **Item Auto-Selection**
- System picks items to minimize waste
- Example: Need 30 points → Uses items totaling ~30 instead of 1 item worth 50

### 4. **Transaction Safety**
- All pet actions use database transactions
- If item consumption fails, stat updates rollback
- Prevents item loss without benefit

### 5. **Cache Invalidation**
- User cache cleared after: adoption, actions, purchases, name changes
- Ensures fresh data on next request

### 6. **Daily Cap Messages**
- Users notified when daily point limits reached
- EXP still awarded even when points capped
- Encourages return next day

---

## Summary

The Pet Companion system creates a **balanced feedback loop**:
1. **Study Activities** → Earn Points + EXP
2. **Points** → Buy Items from Shop
3. **Items + Actions** → Maintain Pet Stats + Earn EXP
4. **Pet Growth** → Visual progression (level/appearance)
5. **Neglect** → Stat decay + EXP loss
6. **Engagement** → Daily activities to maintain pet

**Key Timings:**
- **36-hour decay cycle** for hunger/happiness/cleanliness
- **24-hour regeneration** for energy
- **Daily point caps** reset at midnight
- **60-minute intervals** for neglect penalty

This ecosystem encourages **consistent daily engagement** while providing **flexible care schedules** (36-hour buffer before complete stat loss).
