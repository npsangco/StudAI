-- Migration: Create jitsi_sessions table
-- This table stores Jitsi Meet study sessions

CREATE TABLE IF NOT EXISTS jitsi_sessions (
    session_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    user_id INTEGER NOT NULL,
    room_id VARCHAR(100) NOT NULL UNIQUE,
    topic VARCHAR(255) NOT NULL,
    duration INTEGER DEFAULT 60,
    start_time DATETIME NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    session_password VARCHAR(255),
    is_published BOOLEAN DEFAULT FALSE,
    published_at DATETIME,
    status ENUM('scheduled', 'active', 'completed', 'cancelled') DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_room_id (room_id),
    INDEX idx_status (status),
    INDEX idx_is_published (is_published)
);
