CREATE TABLE clients (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(50),
  company VARCHAR(150),
  notes TEXT,
  document VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_clients_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);
