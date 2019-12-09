const assert = require('assert');
const firebase = require('@firebase/testing');
const {puppeteer, wait} = require('./helper');

// Config
const projectId = 'ritl-test-app';

// Fake authenticated user
const user = {uid: '123abc', email: "user@acme.com"};

// Endpoints to test
const baseEndPoint = 'http://localhost:5000';
const endPoints = {
  home: `${baseEndPoint}/`,
  signIn: `${baseEndPoint}/signin`,
  signOut: `${baseEndPoint}/signout`
}

describe('Web App Test Suite', () => {

  beforeEach(async () => {
    // Make sure Firestore is empty before each test run
    await firebase.clearFirestoreData({projectId});
    // Initialize with test config/data
    const app = firebase.initializeTestApp({
      projectId,
      auth: user
    });
  });

  afterEach(async () => {
    // Remove all Firebase apps, services and close up puppeteer browser
    await Promise.all(firebase.apps().map(app => app.delete()));
    puppeteer.quit();
  })

  it('home: when user is unauthenticated should return signin', async () => {
    // We start with request to home
    const {page} = await puppeteer.open(endPoints.home);
    
    // For debugging
    page.on('console', msg => console.log(msg._text))

    // Home gets initially loaded, and signin modal is hidden (ie, no open class)
    assert.strictEqual(await page.url(), endPoints.home);
    assert.strictEqual(await puppeteer.elClass('signin-modal', page), 'modal');

    // Wait for script execution on page to complete
    await page.waitForNavigation({waitUntil: 'networkidle0'});

    // Expect navigate to /signin and signin modal should display
    assert.strictEqual(await page.url(), endPoints.signIn);
    assert.strictEqual(await puppeteer.elClass('signin-modal', page), 'modal open');
  });


  it('home: when user is authenticated should return home', async () => {
    // We start with request to home /
    const {page} = await puppeteer.open(endPoints.home);

    // For debugging
    page.on('console', msg => console.log(msg._text))

    // Since we faked an authenticated user, listPages will eventually 
    // get called which expects an authenticated user from getCurrentUser.
    // We mock the fake user again.
    await page.evaluate(`window.getCurrentUser = () => {
      return ${JSON.stringify(user)};
    }`)

    // Home gets initialdly loaded, and signin modal is hidden (ie, no open class)
    assert.equal(await page.url(), endPoints.home);
    assert.equal(await puppeteer.elClass('signin-modal', page), 'modal');

    // Wait for script execution on page to complete
    await page.waitForNavigation({waitUntil: 'networkidle0'});
    // Fake authenticating a user
    await page.evaluate(`handleStateChange(${JSON.stringify(user)})`);

    // Expect home, should NOT display modal
    assert.equal(await page.url(), endPoints.home);
    assert.equal(await puppeteer.elClass('signin-modal', page), 'modal');
  });

});

