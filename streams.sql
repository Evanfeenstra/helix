
CREATE TABLE streams (
  id TEXT PRIMARY KEY,
  device_id INT,
  first_root TEXT,
  last_root TEXT,
  next_root TEXT,
  seed TEXT,
  side_key TEXT,
  start int,
  locked BOOLEAN,
  last_locked timestamptz
);
