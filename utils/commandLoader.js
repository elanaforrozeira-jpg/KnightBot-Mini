/**
 * Command Loader
 * Supports both single-command exports (module.exports = {...})
 * and multi-command array exports (module.exports = [{...}, {...}])
 */

const fs   = require('fs');
const path = require('path');

const loadCommands = () => {
  const commands    = new Map();
  const commandsPath = path.join(__dirname, '..', 'commands');

  if (!fs.existsSync(commandsPath)) {
    console.log('Commands directory not found');
    return commands;
  }

  const register = (command, file) => {
    if (!command || typeof command !== 'object') return;
    if (!command.name) {
      console.warn(`[CommandLoader] Skipping unnamed command in ${file}`);
      return;
    }
    commands.set(command.name.toLowerCase(), command);
    if (Array.isArray(command.aliases)) {
      command.aliases.forEach(alias => {
        commands.set(alias.toLowerCase(), command);
      });
    }
  };

  const categories = fs.readdirSync(commandsPath);

  categories.forEach(category => {
    const categoryPath = path.join(commandsPath, category);
    if (!fs.statSync(categoryPath).isDirectory()) return;

    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));

    files.forEach(file => {
      const filePath = path.join(categoryPath, file);
      try {
        // Clear require cache so hot-reload works in dev
        delete require.cache[require.resolve(filePath)];
        const exported = require(filePath);

        if (Array.isArray(exported)) {
          // Array of command objects (e.g. addadmin.js, funny.js)
          exported.forEach(cmd => register(cmd, file));
        } else if (exported && typeof exported === 'object' && exported.name) {
          // Single command object
          register(exported, file);
        } else {
          console.warn(`[CommandLoader] ${file} does not export a command object or array.`);
        }
      } catch (error) {
        console.error(`[CommandLoader] Error loading ${file}:`, error.message);
      }
    });
  });

  console.log(`[CommandLoader] Loaded ${commands.size} commands/aliases.`);
  return commands;
};

module.exports = { loadCommands };
