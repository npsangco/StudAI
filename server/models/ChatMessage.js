import { DataTypes } from 'sequelize';
import sequelize from '../db.js';
import { encryptField, decryptField } from '../utils/fieldEncryption.js';

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
    allowNull: false,
    get() {
      const raw = this.getDataValue('message');
      if (!raw) return raw;
      return decryptField(raw);
    },
    set(val) {
      this.setDataValue('message', encryptField(val));
    }
  },
  response: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    get() {
      const raw = this.getDataValue('response');
      if (!raw) return raw;
      return decryptField(raw);
    },
    set(val) {
      this.setDataValue('response', encryptField(val));
    }
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
