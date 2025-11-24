// const { Sequelize } = require('sequelize'); // Import Sequelize
import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

// Determine if we're in production (Cloud Run/App Engine) or local development
const isProduction = process.env.NODE_ENV === 'production';
const useSocketPath = process.env.DB_SOCKET_PATH && isProduction;

const sequelizeConfig = {
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  dialect: 'mysql',
  logging: false, // Set to console.log to see SQL queries
  timezone: '+08:00', // Your local timezone (Philippines UTC+8)
  dialectOptions: {
    dateStrings: true,
    typeCast: true,
    timezone: '+08:00' // Also set in dialectOptions
  },
  pool: {
    max: 20,
    min: 2,
    acquire: 60000,
    idle: 10000
  }
};

// Use Unix socket for production (Cloud Run/App Engine)
if (useSocketPath) {
  sequelizeConfig.host = `/cloudsql/${process.env.DB_SOCKET_PATH}`;
  sequelizeConfig.dialectOptions = {
    ...sequelizeConfig.dialectOptions,
    socketPath: `/cloudsql/${process.env.DB_SOCKET_PATH}`,
    timezone: '+08:00' // Keep timezone
  };
} else {
  // Use TCP connection for local development (with Cloud SQL Proxy or public IP)
  sequelizeConfig.host = process.env.DB_HOST;
  sequelizeConfig.port = process.env.DB_PORT || 3306;

  // Enable SSL for production TCP connections
  if (isProduction) {
    sequelizeConfig.dialectOptions = {
      ...sequelizeConfig.dialectOptions,
      ssl: {
        require: true,
        rejectUnauthorized: false
      },
      timezone: '+08:00' // Keep timezone
    };
  }
}

const sequelize = new Sequelize(sequelizeConfig);

// // Create a new Sequelize instance
// const sequelize = new Sequelize(
//   process.env.DB_NAME,  // Database name
//   process.env.DB_USER,  // Database user
//   process.env.DB_PASS,  // Database password
//   {
//     host: process.env.DB_HOST,  // Database host (localhost)
//     dialect: 'mysql',  // Dialect (MySQL)
//   }
// );

// Test connection to ensure it's set up correctly
sequelize.authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
  })
  .catch((err) => {
    console.error('Unable to connect to the database:', err);
  });

export default sequelize;




