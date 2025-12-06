import sequelize from '../db.js';

/**
 * Migration: Add is_copy column to questions table
 * This prevents duplicate questions from appearing in the question bank
 * 
 * is_copy = 0 (false): Original question, shows in question bank
 * is_copy = 1 (true): Copied question, hidden from question bank
 */

async function addIsCopyColumn() {
  try {
    console.log('Starting migration: Adding is_copy column to questions table...');
    
    // Add the is_copy column with default value 0
    await sequelize.query(`
      ALTER TABLE questions 
      ADD COLUMN is_copy TINYINT(1) NOT NULL DEFAULT 0 
      COMMENT 'Flag to indicate if question is copied from question bank (0=original, 1=copy)'
    `);
    
    console.log('✓ Successfully added is_copy column to questions table');
    console.log('✓ All existing questions have been marked as original (is_copy = 0)');
    
    // Create index for better query performance
    await sequelize.query(`
      CREATE INDEX idx_is_copy ON questions(is_copy)
    `);
    
    console.log('✓ Created index on is_copy column for optimized queries');
    console.log('\nMigration completed successfully!');
    
  } catch (error) {
    // Check if column already exists
    if (error.original?.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠ Column is_copy already exists in questions table');
      console.log('Migration skipped - no changes needed');
    } else {
      console.error('✗ Migration failed:', error.message);
      throw error;
    }
  } finally {
    await sequelize.close();
  }
}

// Run migration
addIsCopyColumn()
  .then(() => {
    console.log('\nExiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
