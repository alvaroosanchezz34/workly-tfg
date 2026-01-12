CREATE TABLE services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  default_rate DECIMAL(10,2),
  unit VARCHAR(50),

  CONSTRAINT fk_services_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);
