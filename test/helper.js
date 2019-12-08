const puppeteer = require('puppeteer');

let _browser;

const launch = async () => {
  if (!_browser) {
    _browser = await puppeteer.launch({headless: true, args:['--no-sandbox']});
  }
  return _browser;
}

const quit = async () => {
  if (_browser) {
    await _browser.close();
    _browser = undefined;
  }
}

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

const elProperty = async (id, name, page) => {
  const elHandle = await page.$(`#${id}`);
  return await elHandle.getProperty(name);
}

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
