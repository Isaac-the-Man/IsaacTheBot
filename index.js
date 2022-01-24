require('dotenv').config()
const { Client, Intents } = require('discord.js')
const fs = require('fs')
const fsPromises = fs.promises
const moment = require('moment')
const axios = require('axios')


// CONSTANTS (from ENV)
const CRYPTO_CSV_PATH = process.env.CRYPTO_CSV_PATH
const HELP_MSG = `
ISAAC THE BOT
commands:
- !help: list of commands.
- !roast @USER: roast the target with randomly generated insults.
- !pool now: print out current balance.
- !pool stats: print out profits in the past few days.
`;

// global vars
let cartesiData = []

// reload CTSI scraping data from the database CSV file
async function readCartesiPoolCSV() {
	const raw = await fsPromises.readFile(CRYPTO_CSV_PATH, 'utf8')
	const lines = raw.split('\n')
	lines.pop() // remove empty last line
	const data = lines.map(row => {
		let arr = row.split(',')
		return {
			timestamp: arr[0],
			balance: parseInt(arr[1])
		}
	})
	cartesiData = data
}

// read cartesi's profit report
function readCartesiProfitStats() {
	// reversed
	const reversed = [...cartesiData].reverse()
	// last balance
	const lastBalance = cartesiData.at(-1).balance
	// filter 1,3,7 days
	const now = moment()
	const t24 = now.clone()
	t24.subtract(1, 'days')
	const t72 = now.clone()
	t72.subtract(3, 'days')
	const tWeek = now.clone()
	tWeek.subtract(1, 'weeks')
	let profits = [0, 0, 0]	// 1,3,7 days
	let switches = [t24, t72, tWeek]
	let index = 0
	reversed.forEach((e) => {
		if (index >= profits.length) {
			return
		}
		let time = moment(e.timestamp)
		if (time.isBefore(switches[index])) {
			profits[index] = lastBalance - e.balance
			index++
		}
	})
	return profits
}

// get roast
async function getRandomRoast() {
	try {
		const res = await axios.get('https://evilinsult.com/generate_insult.php?lang=en&type=json')
		return res.data.insult
	} catch(e) {
		console.log(e)
	}
}

// Bot hooks
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] })

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`)
})

client.on('messageCreate', async (msg) => {
	// prevent bot
	if (msg.author.bot) {
		return false
	}
	// personal hooks
	// command hooks
	if (msg.content.trim() === '!help') {
		msg.reply(HELP_MSG)
	} else if (msg.content === '!pool now') {	// current balance in pool
		await readCartesiPoolCSV()
		const last = cartesiData.at(-1)
		const now = moment(last.timestamp)
		msg.reply(`As of ${now.format('llll')}, you have ${last.balance} CTSI in the pool.`)
	} else if (msg.content === '!pool stats') {	// basic stats for CTSI pool
		await readCartesiPoolCSV()
		const profits = readCartesiProfitStats()
		msg.reply(`You've earned ${profits[0]} in the past 24hrs, ${profits[1]} in the past 72hrs, and ${profits[2]} in the past week.`)
	} else if (msg.content.slice(0,6).trim() === '!roast') {	// roast someone
		const targets = msg.mentions.members.toJSON()
		if (targets.length <= 0) {
			msg.reply("You didn't specify a target (you stupid).")
		} else {
			if (msg.mentions.has(msg.guild.members.cache.get('537305396348583948')) || msg.mentions.has(msg.guild.members.cache.get('916028349233639434'))) {
				// Can't raost me or the bot
				msg.reply(':pinched_fingers:')
				return
			}
			const roast = await getRandomRoast()
			if (roast) {
				msg.channel.send(`${msg.mentions.members.toJSON()} ${roast}`)
			} else {
				msg.reply("Ah shit something's wrong...")
			}
		}
	} else if (msg.content.includes('thank')) {	// you're welcome when anyone says thanks
		msg.reply("You're welcome")
	}
})

client.login(process.env.CLIENT_TOKEN)
