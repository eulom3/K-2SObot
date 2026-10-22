// ============================================================
// THE JEDI FACTION — bot <-> domain bridge (discord.js v14)
// Drop into your existing bot. Needs: npm i discord.js
// Env: JF_SITE=https://yourdomain.com  JF_TOKEN=<BOT_TOKEN from config.php>
// ============================================================
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const JF_SITE = process.env.JF_SITE;
const JF_TOKEN = process.env.JF_TOKEN;
const jf = async (payload) => {
  const r = await fetch(JF_SITE + '/bot_api.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Bot-Token': JF_TOKEN },
    body: JSON.stringify(payload)
  });
  return r.json();
};

module.exports = (client) => {
  // ---- Slash commands ----
  client.commands.push(
    new SlashCommandBuilder().setName('targets').setDescription('Show active war targets'),
    new SlashCommandBuilder().setName('tiv').setDescription('TIV leaderboard')
      .addIntegerOption(o => o.setName('limit').setDescription('How many (default 10)')),
    new SlashCommandBuilder().setName('pending').setDescription('Applicants awaiting approval'),
    new SlashCommandBuilder().setName('whois').setDescription('Latest known stats for a KoC ID')
      .addIntegerOption(o => o.setName('koc_id').setRequired(true))
  );

  client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;
    const embed = new EmbedBuilder().setColor(0x8b1212)
      .setAuthor({ name: 'The Jedi Faction', iconURL: 'https://yourdomain.com/emblem.svg' });

    if (i.commandName === 'targets') {
      const d = await jf({ action: 'get_targets' });
      embed.setTitle('⚔ Active War Targets')
        .setDescription(d.targets.length
          ? d.targets.map(t => `**${t.target_name || 'ID ' + t.koc_id}** (ID ${t.koc_id}) — ${t.reason || 'no reason'} · by ${t.added_by}`).join('\n')
          : 'No active targets. The galaxy is quiet.');
    }
    if (i.commandName === 'tiv') {
      const d = await jf({ action: 'get_tiv_top', limit: i.options.getInteger('limit') || 10 });
      embed.setTitle('🛰 TIV Leaderboard')
        .setDescription(d.tiv.length
          ? d.tiv.map((t, n) => `${n + 1}. **${t.name || 'ID ' + t.koc_id}** — ${Number(t.value).toLocaleString()} TIV`).join('\n')
          : 'No TIV data yet — sync JFWarScout first.');
    }
    if (i.commandName === 'pending') {
      const d = await jf({ action: 'get_pending' });
      embed.setTitle('⏳ Pending Applicants')
        .setDescription(d.pending.length
          ? d.pending.map(p => `**${p.username}** — KoC ID ${p.koc_id}, code \`${p.verify_code}\``).join('\n')
          : 'None waiting. The Force is calm.');
    }
    if (i.commandName === 'whois') {
      const kid = i.options.getInteger('koc_id');
      const d = await jf({ action: 'get_player', koc_id: kid });
      embed.setTitle(`📋 Player ${kid}`)
        .setURL(`https://www.kingsofchaos.com/stats.php?id=${kid}`)
        .setDescription(d.stats.length
          ? d.stats.map(s => `**${s.metric}**: ${Number(s.value).toLocaleString()} *(seen ${s.captured_at})*`).join('\n')
          : 'No intel on this player yet.');
    }
    await i.reply({ embeds: [embed] });
  });

  // ---- Optional: hourly ping when applicants are waiting ----
  setInterval(async () => {
    const d = await jf({ action: 'get_pending' });
    if (d.pending?.length) {
      const ch = await client.channels.fetch(process.env.JF_OFFICER_CHANNEL_ID).catch(() => null);
      ch?.send(`⚠ **${d.pending.length} applicant(s)** waiting for approval on the domain: ${d.pending.map(p => p.username).join(', ')}`);
    }
  }, 3600_000);
};
