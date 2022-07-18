import os
import discord
from dotenv import load_dotenv
import numpy as np
from matplotlib import pyplot as plt
import datetime

# load env var
load_dotenv()
TOKEN = os.getenv('DISCORD_TOKEN')
CTSI_FILENAME = os.getenv('CTSI_DIR')

# utils
def parse_int(string):
    try:
        int(string)
    except Exception as e:
        return -1
    else:
        return int(string)
def get_profit(toi, is_graph=False):
    timestamps = []
    balances = []
    # read data from file
    with open(CTSI_FILENAME, 'r', encoding='utf-8') as f:
        isFirst = True
        for row in f:
            # skip first row
            if isFirst:
                isFirst = False
                continue
            # read all rows
            date, value = row.split(',')
            bl = float(value)
            dt = datetime.datetime.fromisoformat(date[:-1])
            timestamps.append(dt)
            balances.append(bl)
    # compute profit in past week
    now = datetime.datetime.now()
    # toi = [1, 3, 7] # time of interest (day)
    toi_idx = 0
    profits = [] # [1, 3, 7]
    cur_balance = balances[-1]
    for time, bal in zip(reversed(timestamps), reversed(balances)):
        if toi_idx >= len(toi):
            break
        td = now - time
        if td.total_seconds() / 86400 >= toi[toi_idx]:
            profits.append(cur_balance - bal)
            toi_idx += 1
    # graph output
    if is_graph:
        # graph the last 256 entries
        plt.plot(timestamps[-256:], balances[-256:])
        plt.title('CTSI Earnings')
        plt.xlabel('CTSI')
        plt.ylabel('Date')
        plt.savefig('profit.png')

    # output profit
    return f'As of {now} you have {cur_balance:.2f} CTSI.\n' + '\n'.join([f'For the past {toi[idx]} day(s), you\'ve earned {profit:.2f} CTSI.' for idx, profit in enumerate(profits)])

client = discord.Client()

@client.event
async def on_ready():
    print(f'{client.user} has connected to Discord!')

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
    - !pool [GRAPH] [TIME_OF_INETEREST*]: display profit in the past few days.
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
            if arg == 'graph':
                is_graph = True
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
            await msg.reply(get_profit(list(sorted(days)), is_graph=is_graph), file=discord.File('profit.png') if is_graph else None)
        else:
            await msg.reply(get_profit([1, 3, 7], is_graph=is_graph), file=discord.File('profit.png') if is_graph else None)
        return

    if 'thank' in msg.content.lower():
        await msg.reply('You\'re welcome')
        return

client.run(TOKEN)
