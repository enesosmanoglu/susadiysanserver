// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality
const puppeteer = require('puppeteer-extra')

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

// puppeteer usage as normal
puppeteer.launch({ headless: false, userDataDir: "./UserData" }).then(async browser => {
    console.log('Running tests..')
    const page = await browser.newPage()
    await page.goto('https://youtube.com/upload')
})