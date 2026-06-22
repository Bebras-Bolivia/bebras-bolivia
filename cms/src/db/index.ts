import { Database } from "bun:sqlite";
import { config } from "../config.js";

let db: Database;

export function getDb(): Database {
  if (!db) {
    db = new Database(config.dbPath, { create: true });
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT    NOT NULL UNIQUE,
      name       TEXT    NOT NULL,
      password   TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT    NOT NULL DEFAULT '',
      author      TEXT    NOT NULL,
      dir_name    TEXT    NOT NULL UNIQUE,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS publish_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER REFERENCES snapshots(id),
      status      TEXT    NOT NULL DEFAULT 'pending',
      output      TEXT    NOT NULL DEFAULT '',
      started_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS scheduled_publishes (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      run_at         TEXT    NOT NULL,
      author         TEXT    NOT NULL,
      status         TEXT    NOT NULL DEFAULT 'scheduled',
      output         TEXT    NOT NULL DEFAULT '',
      publish_log_id INTEGER REFERENCES publish_log(id),
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// Convenience types matching the DB rows
export interface UserRow {
  id: number;
  email: string;
  name: string;
  password: string;
  created_at: string;
  updated_at: string;
}

export interface SnapshotRow {
  id: number;
  description: string;
  author: string;
  dir_name: string;
  created_at: string;
}

export interface PublishLogRow {
  id: number;
  snapshot_id: number | null;
  status: string;
  output: string;
  started_at: string;
  finished_at: string | null;
}

export interface ScheduledPublishRow {
  id: number;
  run_at: string;
  author: string;
  status: string;
  output: string;
  publish_log_id: number | null;
  created_at: string;
  updated_at: string;
}
