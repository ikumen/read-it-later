const puppeteer = require('puppeteer');

let _browser;

/**
 * Creates an instance of the puppeteer browser as singleton
 * 
 * see https://pptr.dev/#?product=Puppeteer&version=v2.0.0&show=api-class-browser
 */
const launch = async () => {
  if (!_browser) {
    _browser = await puppeteer.launch({headless: true, args:['--no-sandbox']});
  }
  return _browser;
}

/**
 * Closes the puppeteer browser instance
 * 
 * see https://pptr.dev/#?product=Puppeteer&version=v2.0.0&show=api-class-browser
 */
const quit = async () => {
  if (_browser) {
    await _browser.close();
    _browser = undefined;
  }
}

/**
 * Encapsulates loading a puppeteer page for given url.
 * 
 * see https://pptr.dev/#?product=Puppeteer&version=v2.0.0&show=api-class-page
 * 
 * @param {String} url address of page to load
 * @returns tuple of response from page load and puppeteer page
 */
const open = async (url) => {
  let page;
  try {
    const browser = await launch();
    page = await browser.newPage();
    const resp = await page.goto(url);
    return {resp, page};

  } catch (err) {
    if (page) 
      await page.close();
    throw err;
  }
}

/**
 * Returns a property of HTMLElement identified by given id.
 * 
 * @param {String} id of HTMLElement to look up 
 * @param {String} name of HTMLElement property to get
 * @param {Object} page https://pptr.dev/#?product=Puppeteer&version=v2.0.0&show=api-class-page
 */
const elProperty = async (id, name, page) => {
  const elHandle = await page.$(`#${id}`);
  return await elHandle.getProperty(name);
}

/**
 * Returns class property of HTMLElement identified by given id.
 * 
 * @param {String} id of HTMLElement to look up
 * @param {Object} page https://pptr.dev/#?product=Puppeteer&version=v2.0.0&show=api-class-page
 */
const elClass = async (id, page) => {
  return await (await elProperty(id, 'className', page)).jsonValue();
}

exports.puppeteer = {
  launch,
  open,
  quit,
  elProperty,
  elClass
}

/**
 * Simple wait helper.
 * 
 * @param {Number} ms milliseconds to wait before resolve 
 */
exports.wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
