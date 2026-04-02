/**
 * Simple JSON-based Database for Group Settings
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

const DB_PATH = path.join(__dirname, 'database');
const GROUPS_DB = path.join(DB_PATH, 'groups.json');
const USERS_DB = path.join(DB_PATH, 'users.json');
const WARNINGS_DB = path.join(DB_PATH, 'warnings.json');
const MODS_DB = path.join(DB_PATH, 'mods.json');
const WHITELIST_DB = path.join(DB_PATH, 'whitelist.json');

// Initialize database directory
if (!fs.existsSync(DB_PATH)) {
  fs.mkdirSync(DB_PATH, { recursive: true });
}

// Initialize database files
const initDB = (filePath, defaultData = {}) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
};

initDB(GROUPS_DB, {});
initDB(USERS_DB, {});
initDB(WARNINGS_DB, {});
initDB(MODS_DB, { moderators: [] });
initDB(WHITELIST_DB, { users: [], groups: [] });

// Read database
const readDB = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading database: ${error.message}`);
    return {};
  }
};

// Write database
const writeDB = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing database: ${error.message}`);
    return false;
  }
};

// Group Settings
const getGroupSettings = (groupId) => {
  const groups = readDB(GROUPS_DB);
  if (!groups[groupId]) {
    groups[groupId] = { ...config.defaultGroupSettings };
    writeDB(GROUPS_DB, groups);
  }
  return groups[groupId];
};

const updateGroupSettings = (groupId, settings) => {
  const groups = readDB(GROUPS_DB);
  groups[groupId] = { ...groups[groupId], ...settings };
  return writeDB(GROUPS_DB, groups);
};

// User Data
const getUser = (userId) => {
  const users = readDB(USERS_DB);
  if (!users[userId]) {
    users[userId] = {
      registered: Date.now(),
      premium: false,
      banned: false
    };
    writeDB(USERS_DB, users);
  }
  return users[userId];
};

const updateUser = (userId, data) => {
  const users = readDB(USERS_DB);
  users[userId] = { ...users[userId], ...data };
  return writeDB(USERS_DB, users);
};

// Warnings System
const getWarnings = (groupId, userId) => {
  const warnings = readDB(WARNINGS_DB);
  const key = `${groupId}_${userId}`;
  return warnings[key] || { count: 0, warnings: [] };
};

const addWarning = (groupId, userId, reason) => {
  const warnings = readDB(WARNINGS_DB);
  const key = `${groupId}_${userId}`;
  
  if (!warnings[key]) {
    warnings[key] = { count: 0, warnings: [] };
  }
  
  warnings[key].count++;
  warnings[key].warnings.push({
    reason,
    date: Date.now()
  });
  
  writeDB(WARNINGS_DB, warnings);
  return warnings[key];
};

const removeWarning = (groupId, userId) => {
  const warnings = readDB(WARNINGS_DB);
  const key = `${groupId}_${userId}`;
  
  if (warnings[key] && warnings[key].count > 0) {
    warnings[key].count--;
    warnings[key].warnings.pop();
    writeDB(WARNINGS_DB, warnings);
    return true;
  }
  return false;
};

const clearWarnings = (groupId, userId) => {
  const warnings = readDB(WARNINGS_DB);
  const key = `${groupId}_${userId}`;
  delete warnings[key];
  return writeDB(WARNINGS_DB, warnings);
};

// Moderators System
const getModerators = () => {
  const mods = readDB(MODS_DB);
  return mods.moderators || [];
};

const addModerator = (userId) => {
  const mods = readDB(MODS_DB);
  if (!mods.moderators) mods.moderators = [];
  if (!mods.moderators.includes(userId)) {
    mods.moderators.push(userId);
    return writeDB(MODS_DB, mods);
  }
  return false;
};

const removeModerator = (userId) => {
  const mods = readDB(MODS_DB);
  if (mods.moderators) {
    mods.moderators = mods.moderators.filter(id => id !== userId);
    return writeDB(MODS_DB, mods);
  }
  return false;
};

const isModerator = (userId) => {
  const mods = getModerators();
  return mods.includes(userId);
};

// ─── Whitelist System ───────────────────────────────────────────────────────

// USER whitelist (global — whitelisted users bypass antilink/antispam etc.)
const getWhitelistedUsers = () => {
  const wl = readDB(WHITELIST_DB);
  return wl.users || [];
};

const addWhitelistUser = (userId) => {
  const wl = readDB(WHITELIST_DB);
  if (!wl.users) wl.users = [];
  const num = userId.split('@')[0];
  if (!wl.users.includes(num)) {
    wl.users.push(num);
    return writeDB(WHITELIST_DB, wl);
  }
  return false; // already exists
};

const removeWhitelistUser = (userId) => {
  const wl = readDB(WHITELIST_DB);
  if (!wl.users) return false;
  const num = userId.split('@')[0];
  const before = wl.users.length;
  wl.users = wl.users.filter(u => u !== num);
  if (wl.users.length < before) {
    return writeDB(WHITELIST_DB, wl);
  }
  return false; // not found
};

const isWhitelisted = (userId) => {
  const num = userId.split('@')[0].split(':')[0];
  return getWhitelistedUsers().includes(num);
};

// GROUP whitelist (only these groups can use the bot when groupWhitelistMode is on)
const getWhitelistedGroups = () => {
  const wl = readDB(WHITELIST_DB);
  return wl.groups || [];
};

const addWhitelistGroup = (groupId) => {
  const wl = readDB(WHITELIST_DB);
  if (!wl.groups) wl.groups = [];
  if (!wl.groups.includes(groupId)) {
    wl.groups.push(groupId);
    return writeDB(WHITELIST_DB, wl);
  }
  return false;
};

const removeWhitelistGroup = (groupId) => {
  const wl = readDB(WHITELIST_DB);
  if (!wl.groups) return false;
  const before = wl.groups.length;
  wl.groups = wl.groups.filter(g => g !== groupId);
  if (wl.groups.length < before) {
    return writeDB(WHITELIST_DB, wl);
  }
  return false;
};

const isGroupWhitelisted = (groupId) => {
  return getWhitelistedGroups().includes(groupId);
};

module.exports = {
  getGroupSettings,
  updateGroupSettings,
  getUser,
  updateUser,
  getWarnings,
  addWarning,
  removeWarning,
  clearWarnings,
  getModerators,
  addModerator,
  removeModerator,
  isModerator,
  // Whitelist
  getWhitelistedUsers,
  addWhitelistUser,
  removeWhitelistUser,
  isWhitelisted,
  getWhitelistedGroups,
  addWhitelistGroup,
  removeWhitelistGroup,
  isGroupWhitelisted
};
