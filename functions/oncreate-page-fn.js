const puppeteer = require('puppeteer');
const savePagePDFToStoragePkg = require('./helpers/save-page-pdf-to-storage');
const savePageToFirestorePkg = require('./helpers/save-page-to-firestore');

/**
 * Handler that will abort when request is of type "media". Current the 
 * list of media types are: avi, flv, mov, mp3, mp4, wmv.
 * @param {Object} interceptedRequest see https://pptr.dev/#?product=Puppeteer&version=v2.0.0&show=api-class-request 
 */
const abortMediaInterceptedRequestHandler = (interceptedRequest) => {
  const url = interceptedRequest.url().toLowerCase();
  const resourceType = interceptedRequest.resourceType();
  if (resourceType === 'media' ||
    url.endsWith('.avi') || 
    url.endsWith('.flv') || 
    url.endsWith('.mov') || 
    url.endsWith('.mp3') || 
    url.endsWith('.mp4') || 
    url.endsWith('.wmv')) 
  {
    console.log(`Aborting request for: ${url}`);
    interceptedRequest.abort();
  } else {
    interceptedRequest.continue();
  }
}

/**
 * Fetch web page at given URL, then extract text and generate PDF, then saved 
 * to Firestore database and Firebase Storage, respectively.
 *
 * @param {Object} page
 * @param {String} page.id 
 * @param {String} page.url
 */
exports.onCreatePageHandler = async ({id, url}) => {
  let browser;

  try {
    /* Launch Chrome, in headless mode */
    browser = await puppeteer.launch({headless: true, args:['--no-sandbox']});
    const browserPage = await browser.newPage();

    /* Add a request interceptor and ignore any "media" type resources */
    await browserPage.setRequestInterception(true);
    browserPage.on('request', abortMediaInterceptedRequestHandler);

    /* Fetch the web page */
    await browserPage.goto(url);

    /* Extract web page text and save to Firestore */
    const title = await browserPage.title();
    const text = await browserPage.$eval('*', el => el.innerText);
    await savePageToFirestorePkg.savePageToFirestore({id, title, text});

    /* Generate PDF version of web page and save to FB Storage */
    const pdf = await browserPage.pdf();
    await savePagePDFToStoragePkg.savePagePDFToStorage({id, url}, pdf);
  
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
}
