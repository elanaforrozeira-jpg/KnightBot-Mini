/**
 * Task Manager Command - Group task/todo list
 * .task add <task>      — add a task
 * .task done <id>       — mark task as done
 * .task remove <id>     — remove a task
 * .task list            — list all tasks
 * .task clear           — clear all tasks (admin only)
 */

const database = require('../../database');

const getTasks = (groupId) => {
  const s = database.getGroupSettings(groupId);
  return s.tasks || [];
};

const saveTasks = (groupId, tasks) =>
  database.updateGroupSettings(groupId, { tasks });

let taskCounter = 100;

module.exports = {
  name: 'task',
  aliases: ['todo', 'tasks'],
  category: 'general',
  description: 'Group task/todo list manager',
  usage: '.task add <task> | .task done <id> | .task remove <id> | .task list | .task clear',
  groupOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const from   = extra.from;
      const sender = msg.key.participant || msg.key.remoteJid;
      const sub    = (args[0] || '').toLowerCase();

      if (sub === 'list' || !sub) {
        const tasks = getTasks(from);
        if (!tasks.length) return extra.reply('📋 No tasks yet. Add one with `.task add <task>`');
        const list = tasks.map(t =>
          `${t.done ? '✅' : '⬜'} *#${t.id}* ${t.text}\n   👤 ${t.addedBy.split('@')[0]} • ${new Date(t.createdAt).toLocaleDateString()}`
        ).join('\n\n');
        return extra.reply(`📋 *Group Tasks* (${tasks.length}):\n\n${list}`);
      }

      if (sub === 'add') {
        const text = args.slice(1).join(' ');
        if (!text) return extra.reply('❌ Usage: `.task add <task description>`');
        const tasks = getTasks(from);
        const id = ++taskCounter;
        tasks.push({ id, text, done: false, addedBy: sender, createdAt: Date.now() });
        saveTasks(from, tasks);
        return extra.reply(`✅ Task *#${id}* added!\n📝 ${text}`);
      }

      if (sub === 'done') {
        const id = parseInt(args[1]);
        if (!id) return extra.reply('❌ Usage: `.task done <id>`');
        const tasks = getTasks(from);
        const task  = tasks.find(t => t.id === id);
        if (!task) return extra.reply(`❌ Task *#${id}* not found.`);
        task.done = true;
        saveTasks(from, tasks);
        return extra.reply(`✅ Task *#${id}* marked as done!\n📝 ${task.text}`);
      }

      if (sub === 'remove') {
        const id = parseInt(args[1]);
        if (!id) return extra.reply('❌ Usage: `.task remove <id>`');
        const tasks   = getTasks(from);
        const filtered = tasks.filter(t => t.id !== id);
        if (filtered.length === tasks.length) return extra.reply(`❌ Task *#${id}* not found.`);
        saveTasks(from, filtered);
        return extra.reply(`🗑️ Task *#${id}* removed.`);
      }

      if (sub === 'clear') {
        if (!extra.isAdmin && !extra.isOwner && !extra.isMod)
          return extra.reply('❌ Only admins can clear all tasks.');
        saveTasks(from, []);
        return extra.reply('🗑️ All tasks cleared.');
      }

      return extra.reply(
        '📋 *Task Commands:*\n' +
        '• `.task add <task>` — add a task\n' +
        '• `.task list` — view all tasks\n' +
        '• `.task done <id>` — mark as done\n' +
        '• `.task remove <id>` — remove task\n' +
        '• `.task clear` — clear all (admin)'
      );
    } catch (error) {
      await extra.reply(`❌ Error: ${error.message}`);
    }
  }
};
