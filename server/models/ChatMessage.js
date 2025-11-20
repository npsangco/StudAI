import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const ChatMessage = sequelize.define('ChatMessage', {
  chat_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  note_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  response: {
    type: DataTypes.TEXT('long'),
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'chatbot',
  timestamps: false
});

export default ChatMessage;
