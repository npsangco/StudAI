// test-connection.js
import sequelize from './db.js';
import User from './models/User.js';

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connection successful!');
    
    const userCount = await User.count();
    console.log(`Total users in database: ${userCount}`);
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
}

testConnection();