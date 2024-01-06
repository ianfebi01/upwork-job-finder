import { LowSync } from 'lowdb'
import { JSONFileSync } from 'lowdb/node'
import FeedSub from 'feedsub'
import { Telegraf } from 'telegraf'
import dotenv from 'dotenv'

dotenv.config()

// const loadJSON = (path) =>
//   JSON.parse(readFileSync(new URL(path, import.meta.url)))
// const credentials = loadJSON('./credentials.json')

const defaultData = { feed: [] }

const db = new LowSync(new JSONFileSync('db.json'), defaultData)
db.read()

const update = async (item) => {
  await db.update(({ feed }) => feed.push(item))
}
// const itemInDb = db.get('feed').find({ link: item.link }).value()

const credentials = {
  rss_feed:process.env.RSS_FEED,
  //   rss_feed:
  //     'https://www.upwork.com/ab/feed/jobs/rss?q=backend&sort=recency&paging=0%3B10&api_params=1&securityToken=bd5dca13b12ba4f20caa4b64b2cac696ffd2cb7c2031f8a33acb52f354ba4cce9f6cd755e0700e79dfdfbc6615f38b720c1b36e521d6a7abe43f04adee71c79d&userUid=1501880109122969600&orgUid=1501880109122969601',
  telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN,
  telegram_chat_id: process.env.TELEGRAM_CHAT_ID,
}

const rssFeed = credentials.rss_feed
let reader = new FeedSub(rssFeed, {
  interval: 1, // Check feed every 1 minute.
})

const token = credentials.telegram_bot_token
const bot = new Telegraf(token)

// Register logger middleware.
bot.use((ctx, next) => {
  const start = new Date()
  return next().then(() => {
    const ms = new Date() - start
    console.log('response time %sms', ms)
  })
})

reader.on('item', async (item) => {
  console.log(item)

  const { feed } = db.data
  const itemInDb = feed.find((feedItem) => feedItem?.link === item?.link)
  if (itemInDb) {
    console.log('This item is already exists:')
    console.log(itemInDb.link)
  } else {
    let message = item.description
    const oldstring = '<br />'
    const newstring = '\n'
    while (message.indexOf(oldstring) > -1) {
      message = message.replace(oldstring, newstring)
    }
    await bot.telegram.sendMessage(credentials.telegram_chat_id, message,  { parse_mode: 'HTML' })
    await update(item)
    console.log('Haruse metu datane')
  }
})

reader.start()

bot.context.db = {
  getScores: () => {
    return 42
  },
}

bot.use(async (ctx, next) => {
  console.log(ctx.message)

  console.time(`Processing update ${ctx.update.update_id}`)
  await next() // runs next middleware
  // runs after next middleware finishes
  console.timeEnd(`Processing update ${ctx.update.update_id}`)
})

bot.on('sticker', (ctx) => ctx.reply('👍'))
bot.on('text', (ctx) => {
  const scores = ctx.db.getScores()
  return ctx.reply(`${ctx.message.text}: ${scores}`)
})

bot.launch()
