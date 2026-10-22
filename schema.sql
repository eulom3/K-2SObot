CREATE TABLE members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(32) NOT NULL UNIQUE,
  pass_hash VARCHAR(255) NOT NULL,
  koc_id INT NOT NULL,
  role ENUM('member','officer') DEFAULT 'member',
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  verify_code VARCHAR(8) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE shouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE war_targets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  koc_id INT NOT NULL,
  target_name VARCHAR(64) DEFAULT '',
  reason VARCHAR(255) DEFAULT '',
  status ENUM('active','cleared') DEFAULT 'active',
  added_by VARCHAR(32) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tracker_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  koc_id INT NOT NULL,
  metric VARCHAR(32) NOT NULL,
  value VARCHAR(64) NOT NULL,
  captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_koc (koc_id)
);

CREATE TABLE intel_names (
  koc_id INT PRIMARY KEY,
  name VARCHAR(64) DEFAULT '',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE steal_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gold BIGINT NOT NULL,
  when_txt VARCHAR(64) DEFAULT '',
  at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_steal (gold, when_txt)
);
