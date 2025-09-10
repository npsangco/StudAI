const session = require("express-session");
const connectSessionSequelize = require("connect-session-sequelize")(session.Store);
const sequelize = require("./db");  

const sessionStore = new connectSessionSequelize({
  db: sequelize,
  // Custom table name instead of Sessions
  tableName: 'user_sessions',
  // Clean up expired sessions automatically
  checkExpirationInterval: 15 * 60 * 1000, // 15 minutes
  expiration: 24 * 60 * 60 * 1000, // 24 hours
  // Don't store empty sessions
  disableTouch: false,
  // Custom column names
  modelName: 'UserSession',
  // Define custom attributes for cleaner data storage
  extendDefaultFields: function(defaults, session) {
    return {
      user_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true,
      },
      user_email: {
        type: sequelize.Sequelize.STRING,
        allowNull: true,
      },
      user_role: {
        type: sequelize.Sequelize.STRING,
        allowNull: true,
      },
      expires_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: defaults.expires.defaultValue
      },
      session_data: {
        type: sequelize.Sequelize.TEXT,
        allowNull: false,
        defaultValue: defaults.data.defaultValue
      }
    };
  }
});

// Sync the session table with custom settings
sessionStore.sync({
  // Don't force drop/recreate if table exists
  force: false,
  // Create table if it doesn't exist
  alter: false
});

module.exports = sessionStore;

