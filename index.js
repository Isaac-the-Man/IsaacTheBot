require('dotenv').config()
const { Client, Intents } = require('discord.js')
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
			balance: parseInt(arr[1])
		}
	})
	cartesiData = data
}

// read cartesi's profit report
function readCartesiProfitStats() {
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
	let index = 0
	cartesiData.reverse().forEach((e) => {
		if (profits.length <= profits) {
			return
		}
		let time = moment(e.timestamp)
		if (time.isBefore(t24) || time.isBefore(t72) || time.isBefore(tWeek)) {
			profits[index] = lastBalance - e.balance
			index++
		}
	})
	return profits
}

// Bot hooks
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] })

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`)
});

client.on('messageCreate', async (msg) => {
	// prevent bot
	if (msg.author.bot) {
		return false
	}
	// message hooks
	if (msg.content === '!pool now') {
		await readCartesiPoolCSV()
		const last = cartesiData.at(-1)
		const now = moment(last.timestamp)
		msg.reply(`As of ${now.format('llll')}, you have ${last.balance} ctsi in the pool.`)
	} else if (msg.content === '!pool stats') {
		await readCartesiPoolCSV()
		const profits = readCartesiProfitStats()
		msg.reply(`You've earned ${profits[0]} in the past 24hrs, ${profits[1]} in the past 72hrs, and ${profits[2]} in the past week.`)
	}	
})

client.login(process.env.CLIENT_TOKEN)