// models/SessionParticipant.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const SessionParticipant = sequelize.define('SessionParticipant', {
  participant_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  session_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sessions',
      key: 'session_id'
    },
    onDelete: 'CASCADE'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    },
    onDelete: 'SET NULL',
    comment: 'Reference to StudAI user if they are registered, null for external participants'
  },
  zoom_participant_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Zoom participant ID from webhook events'
  },
  participant_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Name of the participant as shown in Zoom'
  },
  participant_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Email of participant if available'
  },
  join_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When participant joined the meeting'
  },
  leave_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When participant left the meeting'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in minutes the participant was in the meeting'
  },
  status: {
    type: DataTypes.ENUM('joined', 'left', 'in_meeting'),
    defaultValue: 'in_meeting',
    comment: 'Current status of the participant'
  }
}, {
  tableName: 'session_participants',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['session_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['zoom_participant_id']
    }
  ]
});

// Instance method to calculate duration
SessionParticipant.prototype.calculateDuration = function() {
  if (this.join_time && this.leave_time) {
    const durationMs = new Date(this.leave_time) - new Date(this.join_time);
    this.duration = Math.round(durationMs / 60000); // Convert to minutes
  }
};

export default SessionParticipant;
