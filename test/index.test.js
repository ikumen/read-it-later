const assert = require('assert');
const firebase = require('@firebase/testing');
const puppeteer =  require('puppeteer');

// Apps are deleted after each test run, need to re-initialize
//const getFirestoreDB = () => firebase.initializeTestApp({projectId}).firestore();

// Config
const projectId = 'ritl-test-app';

// Test Data
const baseEndPoint = 'http://localhost:5000';
//const user = {uid: 'YRXqSxUjOvVXrQbsPc9LaUcJ1zp1', email: "ikumen@gnoht.com"};
const user = {uid: '123abc', email: "user@acme.com"};
const endPoints = {
  home: `${baseEndPoint}/`,
  signIn: `${baseEndPoint}/signin`,
  signOut: `${baseEndPoint}/signout`
}

let browser;

/**
 * Opens new browser page to given url. Returns tuple of Response and Page.
 * 
 * @param {String} url 
 */
const goto = async (url) => {
  const page = await browser.newPage();
  const resp = await page.goto(url);
  return [resp, page];
}

/**
 * Helper for getting element property.
 * 
 * @param {String} id element id 
 * @param {String} propName name of property to return
 * @param {Object} page 
 */
const getElProperty = async (id, propName, page) => {
  const elHandle = await page.$(`#${id}`);
  return await elHandle.getProperty(propName);
}

/**
 * Helper for getting an element's class.
 * 
 * @param {String} id element id
 * @param {Object} page 
 */
const getElClass = async (id, page) => {
  return await (await getElProperty(id, 'className', page)).jsonValue();
}

/**
 * Simple wait helper.
 * 
 * @param {Number} ms milliseconds to wait before resolve 
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('Integration::Web App Test Suite', () => {
  beforeEach(async () => {
    browser = await puppeteer.launch({headless: true, args:['--no-sandbox']});
    await firebase.clearFirestoreData({projectId})
    const app = firebase.initializeTestApp({
      projectId,
      auth: user
    });
    const db = app.firestore()
    await db.collection('users').doc(user.uid)
        .collection('pages').add({
          url: 'https://en.wikipedia.org/wiki/Issaquah,_Washington',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

    await wait(3000); // give indexer time to create page
  });

  afterEach(async () => {
    await Promise.all(firebase.apps().map(app => app.delete()));
    browser && await browser.close();
  })

  it('home: when user is unauthenticated should return signin', async () => {
    const [resp, page] = await goto(endPoints.home);
    let className = await getElClass('signin-modal', page);
    let pageUrl = await page.url();
    page.on('console', msg => console.log(msg._text))

    // Home gets initially loaded, and signin modal is hidden (ie, no open class)
    assert.equal(pageUrl, endPoints.home);
    assert.equal('modal', className);

    // Wait for script execution on page to complete
    await page.waitForNavigation({waitUntil: 'networkidle0'});
    await page.evaluate(`window.getCurrentUser = () => {
      console.log('foo ===== bar');
      return ${JSON.stringify(user)};
    }`)

    // Expect navigate to /signin and signin modal should display
    pageUrl = await page.url();
    className = await getElClass('signin-modal', page);
    assert.equal(pageUrl, endPoints.signIn);
    assert.equal('modal open', className);
  });


  it('home: when user is authenticated should return home', async () => {
    // We start with request to home
    const [resp, page] = await goto(endPoints.home);
    let className = await getElClass('signin-modal', page);
    let pageUrl = await page.url();

    page.on('console', msg => console.log(msg._text))
    await page.evaluate(`window.getCurrentUser = () => {
      console.log('foo ===== bar');
      return ${JSON.stringify(user)};
    }`)

    // Home gets initialdly loaded, and signin modal is hidden (ie, no open class)
    assert.equal(pageUrl, endPoints.home);
    assert.equal('modal', className);

    // Wait for script execution on page to complete
    await page.waitForNavigation({waitUntil: 'networkidle0'});
    // Fake authenticating a user
    await page.evaluate(`handleStateChange(${JSON.stringify(user)})`);

    // Expect home, should NOT display modal
    pageUrl = await page.url();
    className = await getElClass('signin-modal', page);
    assert.equal(pageUrl, endPoints.home);
    assert.equal('modal', className);
  });


});

