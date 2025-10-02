// const { Sequelize } = require('sequelize'); // Import Sequelize
import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();


// Create a new Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME,  // Database name
  process.env.DB_USER,  // Database user
  process.env.DB_PASS,  // Database password
  {
    host: process.env.DB_HOST,  // Database host (localhost)
    dialect: 'mysql',  // Dialect (MySQL)
  }
);

// Test connection to ensure it's set up correctly
sequelize.authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
  })
  .catch((err) => {
    console.error('Unable to connect to the database:', err);
  });

export default sequelize;




