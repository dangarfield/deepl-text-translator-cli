#!/usr/bin/env node

const puppeteer = require('puppeteer')
const fs = require('fs-extra')
const path = require('path')
const read = require('fs-readdir-recursive')
const cliProgress = require('cli-progress')
const chalk = require('chalk')
const _colors = require('colors')
const YAML = require('yaml')

let config
let browser
let page

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
const initPuppeteer = async () => {
  console.log(chalk`{cyan INFO:} Preparing translator...`)
  browser = await puppeteer.launch({
    headless: config.hideBrowser
  })

  page = await browser.newPage()
  await page.goto('https://www.deepl.com/translator', {
    waitUntil: 'networkidle2'
  })

  await page.click('button.dl_cookieBanner--buttonAll')
  await login()
}
const login = async () => {
  await page.click('button[dl-test="menu-account-out-btn"]')
  await page.type('input[name="username"]', config.email, {delay: 20})
  await page.type('input[name="password"]', config.password, {delay: 20})
  await page.click('button[dl-test="menu-login-submit"]')

  await sleep(2000)
  const loggedIn = await page.evaluate(() => {
    const element = document.querySelector('[dl-test="menu-account-in-btn"]')
    const style = window.getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return style.visibility !== 'hidden' && !!(rect.bottom || rect.top || rect.height || rect.width)
  })
  if (!loggedIn) {
    showHelp()
    console.log(chalk`{red ERROR} DeepL login failed, please check your credentials in the {yellow config.yml}`)
    process.exit(0)
  }
}
const translateOneFile = async (text, sourceLang, targetLang) => {
  const clearButtonVisible = await page.evaluate(() => {
    const element = document.querySelector('[dl-test="translator-source-clear-button"]')
    const style = window.getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return style.visibility !== 'hidden' && !!(rect.bottom || rect.top || rect.height || rect.width)
  })
  if (clearButtonVisible) {
    await page.click('[dl-test="translator-source-clear-button"]')
  }
  await page.click('[dl-test="translator-source-lang"]')
  await page.click(`[dl-test="translator-lang-option-${sourceLang.substring(0, 2)}"]`)
  await page.click('[dl-test="translator-target-lang"]')
  await page.click(`[dl-test="translator-lang-option-${targetLang}"]`)

  await page.focus('textarea[dl-test="translator-source-input"]')
  await page.type('textarea[dl-test="translator-source-input"]', text + ' 1234')

  let complete = false
  let outputText
  while (!complete) {
    outputText = await page.evaluate(() => { return document.querySelector('[dl-test="translator-target-input"]').value })
    await sleep(1000)
    if (outputText.endsWith(' 1234')) {
      complete = true
      outputText = outputText.substring(0, outputText.length - 5)
    }
  }
  //   console.log('DONE', outputText)
  return outputText
}

const prepareFiles = async () => {
  console.log(chalk`{cyan INFO:} Identifying Files...`)
  const data = {sources: [], targets: [], translations: {complete: [], toTranslate: []}}
  const sources = await fs.readdir(path.resolve('sources'))
  sources.forEach((source) => {
    const files = read(path.resolve('sources', source))
    data.sources.push({
      lang: source,
      files
    })
    console.log(chalk`{cyan INFO:} Source language available: {green ${source}}          (${files.length} files)`)
  })

  const targets = await fs.readdir(path.resolve('translations'))
  targets.forEach((target) => {
    const langSource = target.split('_')[0]
    const langTarget = target.split('_')[1]
    const filesComplete = read(path.resolve('translations', target))
    const filesToTranslate = data.sources.filter(f => f.lang === langSource)[0].files.filter(f => !filesComplete.includes(f))
    data.targets.push({
      lang: {
        source: langSource,
        target: langTarget
      },
      files: {
        complete: filesComplete,
        toTranslate: filesToTranslate
      }
    })
    filesComplete.forEach((file) => {
      data.translations.complete.push({
        langSource,
        langTarget,
        file
      })
    })
    filesToTranslate.forEach((file) => {
      data.translations.toTranslate.push({
        langSource,
        langTarget,
        file
      })
    })
    let perc = Math.round(100 * (filesComplete.length / (filesComplete.length + filesToTranslate.length)))
    perc = isNaN(perc) ? 0 : perc
    console.log(chalk`{cyan INFO:} Target language required:  {cyan ${langSource}} to {yellow ${langTarget}} (${perc}% complete - ${filesComplete.length} of ${filesComplete.length + filesToTranslate.length})`)
  })

  //   console.log('sources', JSON.stringify(data.sources))
  //   console.log('targets', JSON.stringify(data.targets))
  //   console.log('complete', JSON.stringify(data.translations.complete), data.translations.complete.length)
  //   console.log('toTranslate', JSON.stringify(data.translations.toTranslate), data.translations.toTranslate.length)

  console.log(chalk`{cyan INFO:} Translations completed: {green ${pad(8, data.translations.complete.length, ' ')}}`)
  console.log(chalk`{cyan INFO:} Translations required:  {yellow ${pad(8, data.translations.toTranslate.length, ' ')}}`)
  return data.translations
}
const translateFiles = async (toTranslate) => {
  //   console.log('translateFiles', toTranslate)
  let errors = 0
  console.log(chalk`{cyan INFO:} Beginning translations...`)
  const translationProgressBar = new cliProgress.SingleBar({
    format: _colors.cyan('INFO: ') + 'Translating... |' + _colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Files',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  })
  translationProgressBar.start(toTranslate.length, 0)

  for (let i = 0; i < toTranslate.length; i++) {
    const toTranslateOne = toTranslate[i]
    const sourceFilePath = path.resolve('sources', toTranslateOne.langSource, toTranslateOne.file)
    const targetFilePath = path.resolve('translations', `${toTranslateOne.langSource}_${toTranslateOne.langTarget}`, toTranslateOne.file)
    const sourceText = await fs.readFile(sourceFilePath, 'utf8') // TODO, utf8 will not work with all charset
    // console.log(`\nTranslating ${i + 1} of ${toTranslate.length} - ${toTranslateOne.langSource} to ${toTranslateOne.langTarget} - ${toTranslateOne.file}`)

    try {
      const translatedText = await translateOneFile(sourceText, toTranslateOne.langSource, toTranslateOne.langTarget)
      //   console.log(`\n                                      Translated - ${translatedText}`)
      await fs.ensureDir(path.dirname(targetFilePath))
      await fs.writeFile(targetFilePath, translatedText)
    } catch (error) {
      console.log(chalk`\n{red ERROR:} Translating: ${toTranslateOne.file} from ${toTranslateOne.langSource} to ${toTranslateOne.langTarget} - Error: ${error.message}`)
      errors++
    }
    translationProgressBar.update(i + 1)
  }
  translationProgressBar.stop()
  console.log(chalk`{cyan INFO:} Translations complete with {yellow ${errors} errors}`)
}
const pad = (width, string, padding) => {
  return (width <= string.length) ? string : pad(width, padding + string, padding)
}
const ensureSourceAndTranslationDirectories = async (config) => {
  config.translations.forEach((translation) => {
    const source = Object.keys(translation)[0]
    fs.ensureDirSync(path.resolve('sources', source))
    fs.ensureDirSync(path.resolve('translations', `${source}_${translation[source]}`))
  })
}
const showHelp = () => {
  console.log(chalk`{cyan HELP:} Open the {yellow config.yml} file in a text editor, add your DeepL credentials and configure which translations you want.`)
  console.log(chalk`      Running the {green npx ff7-translation} program again will create {yellow sources} and {yellow translations} directories for you.`)
  console.log(chalk`      Add any folders and text files to be translated in the {yellow sources} folder. Ensure that it is 5 characters, like {green en-GB} or {green es-ES}`)
  console.log(chalk`      DeepL supported languages are: de-DE, en-GB, en-US, fr-FR, it-IT, ja-JA, es-ES, nl-NL, pl-PL, pt-PT, pt-BR, ru-RU, zh-ZH`)
}
const validateConfig = async () => {
  const configPath = path.resolve('config.yml')
  //   console.log(, configPath)
  if (!fs.existsSync(configPath)) {
    const configDefault = {
      email: 'example@user.com',
      password: 'pa55w0rd',
      hideBrowser: true,
      translations: [
        {'en-GB': 'de-DE'},
        {'es-ES': 'de-DE'},
        {'es-ES': 'en-GB'}
      ]
    }
    fs.writeFileSync(configPath, YAML.stringify(configDefault))
    await ensureSourceAndTranslationDirectories(configDefault)
    console.log(chalk`{cyan INFO:} Creating config file...`)
    showHelp()
    process.exit(0)
  }

  config = YAML.parse(fs.readFileSync(configPath, 'utf8'))
  await ensureSourceAndTranslationDirectories(config)

//   const file = await fs.readFileSync('./config.yml', 'utf8')
//   const config = YAML.parse(file)
//   console.log('config', config)
//   console.log(chalk`{cyan INFO:} Translations complete with {yellow ${errors} errors}`)
}
const init = async () => {
  await validateConfig()
  const translations = await prepareFiles()
  if (translations.toTranslate.length === 0) {
    console.log(chalk`{cyan INFO:} No translations required`)
    if (translations.toTranslate.length === 0 && translations.complete.length === 0) {
      showHelp()
    }
    process.exit(0)
  }

  await initPuppeteer()
  await translateFiles(translations.toTranslate)
  if (browser) {
    browser.close()
  }
}

init()
