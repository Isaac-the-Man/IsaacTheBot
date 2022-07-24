import os
import discord
from dotenv import load_dotenv
import datetime
from datetime import timedelta
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import sys


# load env var
load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')

# load all CTSI Addresses
ctsi_addresses = []
counter = 1
while True:
    if os.getenv(f'CTSI_ADDR_{counter}') is not None:
        ctsi_addresses.append(os.getenv(f'CTSI_ADDR_{counter}'))
        counter += 1
    else:
        break

# utils
def parse_int(string):
    try:
        int(string)
    except Exception as e:
        return -1
    else:
        return int(string)

def get_pools_profit(addrs, toi, db):
    '''
    query all profits from all the pools
    '''
    now = datetime.datetime.now()
    output = ''
    for addr in addrs:
        output += f'Pool Address {addr}\n'
        # for each pool, query toi data
        boi = []    # balance of interest
        for t in toi:
            # query last record before specific toi date
            query = db.poolsnapshots.find_one({
                'pool_addr': addr,
                'time' :{
                    '$lt': now - timedelta(days=t),
                }
            }, sort=[('time', -1)])
            # read balance from query
            if query is not None:
                boi.append(query.get('balance', 0))
            else:
                boi.append(0)
        # stats calculation and output
        cur_b = db.poolsnapshots.find({'pool_addr': addr}).sort([('time',-1)]).limit(1).get('balance', 0)# get current balance (last record)
        output += f'\t- As of {now} you have {cur_b} CTSI\n'
        for t, b in zip(toi, boi):
            output += f'\t- For the past {t} day(s), you\'ve earned {cur_b - b:.2f} CTSI\n'

    return output

# start mongoDB client
print('Connecting to database...')
client = MongoClient(port=27017)
try:
    client.cartesi_pool.command('ping')
except ConnectionFailure:
    print('Failed to connect to database, terminating...')
    sys.exit(1)
db = client.cartesi_pool

# start discord client
print('Connecting to discord...')
client = discord.Client()

@client.event
async def on_ready():
    print(f'{client.user} has connected to discord!')

@client.event
async def on_message(msg):

    # prevent bot and replying to itself
    if msg.author == client.user:
        return
    if msg.author.bot:
        return

    # global hooks
    if msg.content.strip() == '!help':
        await msg.channel.send('''
```
=====IsaacTheBot=====

COMMANDS:
    - !pool [TIME_OF_INETEREST*]: display profit in the past few days.
        - GRAPH: generates a graph of the past 256 entries.
        - TIME_OF_INTEREST: custom days to calculate profit, defaults to [1, 3, 7]. Can specify up to 5 dates.

```
            ''')
        return

    if msg.content[:5] == '!pool':
        # parse arguments
        args = msg.content[5:].strip().split(' ')
        days = []
        is_graph = False
        for arg in args:
            if arg == '':
                continue
            val = parse_int(arg)
            if val <= 0:
                await msg.reply('bad arguments')
                return
            else:
                days.append(val)
        if len(days) > 5:
            await msg.reply('calm down')
        elif len(days) > 0:
            await msg.reply(get_pools_profit(ctsi_addresses, sorted(days), db))
        else:
            await msg.reply(get_pools_profit(ctsi_addresses, [1, 3, 7], db))
        return

    if 'thank' in msg.content.lower():
        await msg.reply('You\'re welcome')
        return

client.run(TOKEN)
