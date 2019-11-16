const assert = require('assert');

const firebase = require('@firebase/testing');
const puppeteer =  require('puppeteer');

const projectId = 'read-it-later-demo';
/* Apps are deleted after each test run, need to re-initialize */
const getFirestoreDB = () => firebase.initializeTestApp({projectId}).firestore();

let browser;
beforeEach(async () => {
  browser = await puppeteer.launch({headless: true, args:['--no-sandbox']});
  await firebase.clearFirestoreData({projectId})
});

afterEach(async () => {
  await Promise.all(firebase.apps().map(app => app.delete()));
  browser && await browser.close();
});

describe('read-it-later web app test suite', () => {

  it('index.html: should load web app with simple search and add url form', async () => {
    let page = await browser.newPage();
    await page.goto('http://localhost:5000');

    assert.ok(await page.$('#search-n-add-form'));
    assert.ok(await page.$('#search-btn'));
    assert.ok(await page.$('#add-page-btn'));
    assert.ok(await page.$('#term-or-url-input'));
  });

  it('index.html: should save a web page URL as a page document', async () => {
    let page = await browser.newPage();
    await page.goto('http://localhost:5000');

    const db = getFirestoreDB();
    await db.collection('pages').get().then(snap => {
      assert.equal(snap.size, 0);
    });

    await page.evaluate(async () => {
      document.getElementById('term-or-url-input').value = 'http://eloquentjavascript.net/00_intro.html';
      document.getElementById('add-page-btn').click();
      //wait for save to emulator
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    await db.collection('pages').get().then(snap => {
      assert.equal(snap.size, 1);
    });
  });

});