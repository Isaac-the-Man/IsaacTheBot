require('dotenv').config()
const { Client, Intents } = require('discord.js');
const fs = require('fs')
const fsPromises = fs.promises
const moment = require('moment')


// CONSTANTS (from ENV)
const CRYPTO_CSV_PATH = process.env.CRYPTO_CSV_PATH

// global vars
let cartesiData = []

async function readCartesiPoolCSV() {
	const raw = await fsPromises.readFile(CRYPTO_CSV_PATH, 'utf8')
	const lines = raw.split('\n')
	lines.pop() // remove empty last line
	const data = lines.map(row => {
		let arr = row.split(',')
		return {
			timestamp: arr[0],
			balance: arr[1]
		}
	})
	cartesiData = data
}

// Bot hooks
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (msg) => {
	// prevent bot
	if (msg.author.bot) {
		return false
	}
	// message hooks
	if (msg.content === '!crypto now') {
		await readCartesiPoolCSV()
		const last = cartesiData.at(-1)
		const now = moment(last.timestamp)
		msg.reply(`As of ${now.format('llll')}, you have ${last.balance} ctsi in the pool.`)
	}	
});

client.login(process.env.CLIENT_TOKEN);