# StudAI Database Schema Documentation

## Overview
This document outlines the normalized database schema for StudAI, a comprehensive study management platform with gamification features.

---

## 🎯 Core Modules

### 1. User Management Module

#### **users** (User.js)
Primary table for user accounts and authentication.

| Column | Type | Description |
|--------|------|-------------|
| user_id | INTEGER (PK) | Auto-incrementing primary key |
| email | STRING (UNIQUE) | User email address |
| username | STRING (UNIQUE) | Unique username |
| password | STRING | Hashed password |
| birthday | DATE | User's date of birth |
| profile_picture | STRING | Path to profile picture |
| role | STRING | User role (default: 'Student') |
| status | STRING | Account status (default: 'pending') |
| points | INTEGER | Total accumulated points |
| study_streak | INTEGER | Current consecutive study days |
| last_activity_date | DATE | Last date user was active |
| longest_streak | INTEGER | Record longest streak |
| createdAt | TIMESTAMP | Account creation timestamp |
- Has one `PetCompanion`

---

#### **user_daily_stats** (UserDailyStat.js)
Tracks daily user activity metrics. Resets daily via cron job.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Auto-incrementing primary key |
| user_id | INTEGER (FK) | References users.user_id |
| notes_created_today | INTEGER | Notes created today (default: 0) |
| quizzes_completed_today | INTEGER | Quizzes completed today (default: 0) |
| planner_updates_today | INTEGER | Planner tasks updated today (default: 0) |
| points_earned_today | INTEGER | Points earned today (default: 0) |
| exp_earned_today | INTEGER | Experience points earned today (default: 0) |
| last_reset_date | DATE | Last daily reset date |
| createdAt | TIMESTAMP | Record creation |
**Relationships:**

**Note:** This removes redundancy from the User table where daily counters were previously stored.

---

### 2. Notes Module

#### **note** (Note.js)
User-created study notes with optional file attachments.

| Column | Type | Description |
|--------|------|-------------|
| note_id | INTEGER (PK) | Auto-incrementing primary key |
| user_id | INTEGER (FK) | References users.user_id |
| file_id | INTEGER (FK, nullable) | Optional file attachment |
| category_id | INTEGER (FK, nullable) | Note category |
| title | STRING(255) | Note title |
| content | TEXT | Note content (rich text) |
| is_pinned | BOOLEAN | Pin status (default: false) |
| createdAt | TIMESTAMP | Creation timestamp |

**Relationships:**
- Belongs to `User`
- Belongs to `NoteCategory` (optional)
- Belongs to `File` (optional)
- Has many `SharedNote`

---

#### **note_category** (NoteCategory.js)
Categorization system for notes.

| Column | Type | Description |
|--------|------|-------------|
| category_id | INTEGER (PK) | Auto-incrementing primary key |
| category_name | STRING(255) | Category name |

**Relationships:**
- Has many `Note`

---

#### **shared_note** (SharedNote.js)
Tracks note sharing via unique codes.

| Column | Type | Description |
|--------|------|-------------|
| shared_id | INTEGER (PK) | Auto-incrementing primary key |
| user_id | INTEGER (FK) | User who shared the note |
| note_id | INTEGER (FK) | Shared note reference |
| share_code | STRING(6, UNIQUE) | Unique 6-character share code |
| isActive | BOOLEAN | Share link active status |
| createdAt | TIMESTAMP | Share creation time |

**Relationships:**
- Belongs to `User`
- Belongs to `Note`

---

#### **chat_history** (ChatMessage.js)
Stores every chatbot prompt/response to keep contextual history per note.

| Column | Type | Description |
|--------|------|-------------|
| chat_id | INTEGER (PK) | Auto-incrementing primary key |
| user_id | INTEGER (FK) | References users.user_id |
| note_id | INTEGER (FK) | References note.note_id |
| message | TEXT | User prompt content |
| response | TEXT | AI assistant answer |
| timestamp | TIMESTAMP | When the exchange was recorded |

**Relationships:**
- Belongs to `User`
- Belongs to `Note`

---

#### **file** (File.js)
File uploads for notes and other content.

| Column | Type | Description |
|--------|------|-------------|
| file_id | INTEGER (PK) | Auto-incrementing primary key |
| user_id | INTEGER (FK) | Uploader reference |
| filename | STRING | Original filename |
| file_path | STRING | Storage path |
| upload_date | TIMESTAMP | Upload timestamp |

**Relationships:**
- Belongs to `User`
- Has many `Note`

---

### 3. Quiz Module

#### **quizzes** (Quiz.js)
Quiz definitions created by users.

| Column | Type | Description |
|--------|------|-------------|
| quiz_id | INTEGER (PK) | Auto-incrementing primary key |
| created_by | INTEGER (FK) | References users.user_id |
| title | STRING(255) | Quiz title |
| description | TEXT | Quiz description |
| is_public | BOOLEAN | Public visibility (default: true) |
| share_code | STRING(6, UNIQUE) | Unique share code |
| original_quiz_id | INTEGER (FK, nullable) | Self-reference for copied quizzes |
| shared_by_username | STRING(255) | Username of original creator |
| timer_per_question | INTEGER | Time limit per question in seconds (default: 30) |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Computed Properties** (not stored):
- `total_questions` - COUNT from questions table
- `total_attempts` - COUNT from quiz_attempts table
- `average_score` - AVG from quiz_attempts table

**Relationships:**
- Belongs to `User` (creator)
- Has many `Question`
- Has many `QuizAttempt`
- Has many `QuizBattle`
- Self-references (original quiz tracking)

**Note:** Removed redundant aggregate fields that can be computed dynamically.

---

#### **questions** (Question.js)
Individual quiz questions with various types.

| Column | Type | Description |
|--------|------|-------------|
| question_id | INTEGER (PK) | Auto-incrementing primary key |
| quiz_id | INTEGER (FK) | References quizzes.quiz_id |
| type | ENUM | 'Multiple Choice', 'Fill in the blanks', 'True/False', 'Matching' |
| question | TEXT | Question text |
| question_order | INTEGER | Display order |
| choices | JSON | Multiple choice options |
| correct_answer | STRING(255) | Correct answer (for MC/T-F) |
| answer | TEXT | Fill-in-the-blank answer |
| matching_pairs | JSON | Matching question pairs |
| points | INTEGER | Points value (default: 1) |
| difficulty | ENUM | Question difficulty: 'easy', 'medium', 'hard' (default: 'medium') |
| created_at | TIMESTAMP | Creation timestamp |

**Relationships:**
- Belongs to `Quiz`

---

#### **quiz_attempts** (QuizAttempt.js)
Records of completed quiz attempts by users.

| Column | Type | Description |
|--------|------|-------------|
| attempt_id | INTEGER (PK) | Auto-incrementing primary key |
| quiz_id | INTEGER (FK) | References quizzes.quiz_id |
| user_id | INTEGER (FK) | References users.user_id |
| score | INTEGER | Questions answered correctly |
| total_questions | INTEGER | Total questions in attempt |
| percentage | DECIMAL(5,2) | Score percentage |
| time_spent | STRING(50) | Time taken to complete |
| answers | JSON | User's answers |
| points_earned | INTEGER | Points awarded |
| exp_earned | INTEGER | Experience points awarded |
| completed_at | TIMESTAMP | Completion timestamp |

**Relationships:**
- Belongs to `Quiz`
- Belongs to `User`

---

### 4. Quiz Battle Module (Multiplayer)

#### **quiz_battles** (QuizBattle.js)
Real-time multiplayer quiz competitions.

| Column | Type | Description |
|--------|------|-------------|
| battle_id | INTEGER (PK) | Auto-incrementing primary key |
| quiz_id | INTEGER (FK) | Quiz used for battle |
| host_id | INTEGER (FK) | Battle host user |
| game_pin | STRING(6, UNIQUE) | Unique 6-digit game PIN |
| status | ENUM | 'waiting', 'in_progress', 'completed' |
| max_players | INTEGER | Maximum allowed players (default: 8) |
| winner_id | INTEGER (FK, nullable) | Winning player |
| started_at | TIMESTAMP | Battle start time |
| completed_at | TIMESTAMP | Battle completion time |
| created_at | TIMESTAMP | Creation timestamp |

**Computed Properties** (not stored):
- `current_players` - COUNT from battle_participants table

**Relationships:**
- Belongs to `Quiz`
- Belongs to `User` (host)
- Belongs to `User` (winner)
- Has many `BattleParticipant`

**Note:** Removed redundant `current_players` field that can be computed from participant count.

---

#### **battle_participants** (BattleParticipant.js)
Players participating in quiz battles.

| Column | Type | Description |
|--------|------|-------------|
| participant_id | INTEGER (PK) | Auto-incrementing primary key |
| battle_id | INTEGER (FK) | References quiz_battles.battle_id |
| user_id | INTEGER (FK) | References users.user_id |
| player_name | STRING(255) | Display name |
| player_initial | STRING(5) | Player initial (default: 'U') |
| score | INTEGER | Battle score (default: 0) |
| is_ready | BOOLEAN | Ready status (default: false) |
| is_winner | BOOLEAN | Winner flag (default: false) |
| points_earned | INTEGER | Points earned in battle |
| exp_earned | INTEGER | Experience earned in battle |
| joined_at | TIMESTAMP | Join timestamp |

**Relationships:**
- Belongs to `QuizBattle`
- Belongs to `User`

---

### 5. Study Planner Module

#### **study_planner** (Plan.js)
Task and study planning system.

| Column | Type | Description |
|--------|------|-------------|
| planner_id | INTEGER (PK) | Auto-incrementing primary key |
| user_id | INTEGER (FK) | References users.user_id |
| title | STRING | Task title |
| description | TEXT | Task description |
| due_date | DATE | Due date (nullable) |
| completed | BOOLEAN | Completion status (default: false) |
| createdAt | TIMESTAMP | Creation timestamp |

**Relationships:**
- Belongs to `User`

---

### 6. Study Sessions Module (Zoom Integration)

#### **sessions** (Session.js)
Virtual study sessions with Zoom integration.

| Column | Type | Description |
|--------|------|-------------|
| session_id | INTEGER (PK) | Auto-incrementing primary key |
| user_id | INTEGER (FK) | Session host |
| title | STRING | Session title |
| zoom_meeting_id | STRING | Zoom meeting ID |
| zoom_join_url | TEXT | Join URL for participants |
| zoom_start_url | TEXT | Start URL for host |
| zoom_password | STRING | Zoom meeting password |
| duration | INTEGER | Planned duration (minutes, default: 60) |
| scheduled_start | TIMESTAMP | Scheduled start time |
| scheduled_end | TIMESTAMP | Scheduled end time |
| actual_start | TIMESTAMP | Actual start (from Zoom webhook) |
| actual_end | TIMESTAMP | Actual end (from Zoom webhook) |
| status | STRING | 'scheduled', 'active', 'completed', etc. |
| is_private | BOOLEAN | Privacy setting (default: false) |
| session_password | STRING | StudAI session password |
| host_name | STRING | Host display name |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update |

**Instance Methods:**
- `isExpired()` - Check if session passed scheduled end
- `isActive()` - Check if session is currently running
- `getActualDuration()` - Calculate actual duration in minutes

**Relationships:**
- Belongs to `User` (host)
- Has many `SessionParticipant`

---

#### **session_participants** (SessionParticipant.js)
Tracks participants in study sessions (internal and external).

| Column | Type | Description |
|--------|------|-------------|
| participant_id | INTEGER (PK) | Auto-incrementing primary key |
| session_id | INTEGER (FK) | References sessions.session_id |
| user_id | INTEGER (FK, nullable) | StudAI user (null for external) |
| zoom_participant_id | STRING(255) | Zoom participant ID |
| participant_name | STRING(255) | Participant display name |
| participant_email | STRING(255) | Participant email |
| join_time | TIMESTAMP | When participant joined |
| leave_time | TIMESTAMP | When participant left |
| duration | INTEGER | Time spent in session (minutes) |
| status | ENUM | 'joined', 'left', 'in_meeting' |
| created_at | TIMESTAMP | Record creation |
| updated_at | TIMESTAMP | Last update |

**Instance Methods:**
- `calculateDuration()` - Calculate duration between join and leave times

**Relationships:**
- Belongs to `Session`
- Belongs to `User` (optional - nullable for external participants)

---

### 7. Achievements Module

#### **achievements** (Achievement.js)
Gamification achievements available to unlock.

| Column | Type | Description |
|--------|------|-------------|
| achievement_id | INTEGER (PK) | Auto-incrementing primary key |
| title | STRING(255) | Achievement title |
| description | TEXT | Achievement description |
| color | STRING(7) | Display color (hex, default: '#3B82F6') |
| requirement_type | ENUM | Type of requirement |
| requirement_value | INTEGER | Value threshold to unlock |
| points_reward | INTEGER | Points awarded (default: 0) |
| is_hidden | BOOLEAN | Hidden until unlocked (default: false) |
| created_at | TIMESTAMP | Creation timestamp |

**Requirement Types:**
- `points` - Total points accumulated
- `streak` - Study streak days
- `notes_created` - Total notes created
- `quizzes_completed` - Total quizzes completed
- `battles_won` - Quiz battles won
- `files_uploaded` - Files uploaded
- `sessions_hosted` - Study sessions hosted
- `pet_level` - Pet companion level
- `times_fed` - Pet fed count
- `times_played` - Pet played with count
- `times_cleaned` - Pet cleaned count
- `pet_adopted` - Pet adoption

**Relationships:**
- Has many `UserAchievement`

---

#### **user_achievements** (UserAchievement.js)
Tracks user achievement unlocks.

| Column | Type | Description |
|--------|------|-------------|
| user_achievement_id | INTEGER (PK) | Auto-incrementing primary key |
| user_id | INTEGER (FK) | References users.user_id |
| achievement_id | INTEGER (FK) | References achievements.achievement_id |
| unlocked_at | TIMESTAMP | Unlock timestamp |
| is_equipped | BOOLEAN | Display on profile (default: false) |
| createdAt | TIMESTAMP | Record creation |
| updatedAt | TIMESTAMP | Last update |

**Relationships:**
- Belongs to `User`
- Belongs to `Achievement`

---

### 8. Pet Companion Module (Gamification)

#### **pet_companion** (PetCompanion.js)
Virtual pet companions for gamification.

| Column | Type | Description |
|--------|------|-------------|
| pet_id | INTEGER (PK) | Auto-incrementing primary key |
| user_id | INTEGER (FK) | References users.user_id |
| pet_name | STRING | Pet's name |
| pet_type | STRING | Pet species/type |
| happiness_level | INTEGER | Happiness stat (default: 50) |
| hunger_level | INTEGER | Hunger stat (default: 50) |
| cleanliness_level | INTEGER | Cleanliness stat (default: 50) |
| energy_level | INTEGER | Energy stat (default: 50) |
| experience_points | INTEGER | Total XP (default: 0) |
| level | INTEGER | Pet level (default: 1) |
| last_fed | TIMESTAMP | Last feeding time |
| last_played | TIMESTAMP | Last play time |
| last_cleaned | TIMESTAMP | Last cleaning time |
| last_updated | TIMESTAMP | Last stat update |

**Relationships:**
- Belongs to `User` (1:1)

---

#### **pet_items** (PetItem.js)
Available items for pet care in shop.

| Column | Type | Description |
|--------|------|-------------|
| item_id | INTEGER (PK) | Auto-incrementing primary key |
| item_name | STRING | Item display name |
| item_type | STRING | Item category |
| item_description | STRING | Item description |
| cost | INTEGER | Purchase cost in points |
| effect_type | STRING | Stat affected |
| effect_value | INTEGER | Stat change amount |

**Relationships:**
- Has many `UserPetItem`

---

#### **user_pet_items** (UserPetItem.js)
User pet item inventory (junction table).

| Column | Type | Description |
|--------|------|-------------|
| inventory_id | INTEGER (PK) | Auto-incrementing primary key |
| user_id | INTEGER (FK) | References users.user_id |
| item_id | INTEGER (FK) | References pet_items.item_id |
| quantity | INTEGER | Item quantity (default: 1) |
| is_equipped | BOOLEAN | Equipped status (default: false) |

**Relationships:**
- Belongs to `User`
- Belongs to `PetItem`

---

## 🔗 Relationship Summary

### One-to-One Relationships
- User ↔ UserDailyStat
- User ↔ PetCompanion

### One-to-Many Relationships
- User → Notes, Quizzes, QuizAttempts, Files, Plans, Sessions
- Quiz → Questions, QuizAttempts, QuizBattles
- QuizBattle → BattleParticipants
- Session → SessionParticipants
- NoteCategory → Notes
- Note → SharedNotes

### Many-to-Many Relationships (with junction tables)
- User ↔ Achievement (via UserAchievement)
- User ↔ PetItem (via UserPetItem)
- User ↔ QuizBattle (via BattleParticipant)

---

## 🎯 Key Improvements Made

### Redundancy Elimination

1. **Removed from User table:**
   - `daily_notes_count` → Now in `UserDailyStat`
   - `daily_quizzes_count` → Now in `UserDailyStat`
   - `daily_tasks_count` → Now in `UserDailyStat`
   - `daily_reset_date` → Now in `UserDailyStat`

2. **Removed from Quiz table:**
   - `total_questions` → Computed via COUNT(questions)
   - `total_attempts` → Computed via COUNT(quiz_attempts)
   - `average_score` → Computed via AVG(quiz_attempts.percentage)

3. **Removed from QuizBattle table:**
   - `current_players` → Computed via COUNT(battle_participants)

### Normalization Benefits
- ✅ Single source of truth for all data
- ✅ Reduced data duplication
- ✅ Easier to maintain consistency
- ✅ Better query performance for aggregations
- ✅ Cleaner data model with proper relationships

---

## 📊 Usage Examples

### Computing Quiz Statistics
```javascript
// Get total questions
const totalQuestions = await Question.count({ where: { quiz_id: quizId } });

// Get total attempts
const totalAttempts = await QuizAttempt.count({ where: { quiz_id: quizId } });

// Get average score
const avgScore = await QuizAttempt.findOne({
  where: { quiz_id: quizId },
  attributes: [[sequelize.fn('AVG', sequelize.col('percentage')), 'average']]
});
```

### Computing Battle Participants
```javascript
// Get current players in battle
const currentPlayers = await BattleParticipant.count({ 
  where: { battle_id: battleId } 
});
```

### Getting User's Daily Stats
```javascript
// Access through relationship
const user = await User.findByPk(userId, {
  include: [{ model: UserDailyStat, as: 'dailyStats' }]
});

const notesCreatedToday = user.dailyStats.notes_created_today;
```

---

## 🔄 Migration Notes

If updating from previous schema:
1. Create `UserDailyStat` records for existing users
2. Migrate daily counters from User table
3. Remove redundant columns from User, Quiz, and QuizBattle tables
4. Update application code to use computed values instead of stored aggregates
5. Update associations.js with all proper relationships

---

## 📝 Maintenance

- Daily stats reset via cron job (`dailyResetCron.js`)
- Pet stat decay calculated on access based on last_updated timestamps
- Session status updated via Zoom webhooks
- Achievement progress checked on relevant actions

---

*Generated: November 15, 2025*
*Version: 2.0 (Normalized Schema)*
