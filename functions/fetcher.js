const puppeteer = require('puppeteer');
const firebase = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Helper for determining if the child requests should be aborted. We abort
 * any request for media content--as we cannot extract text or generate PDFs 
 * from video or audio content. Currently the blacklist of media types are: 
 * avi, flv, mov, mp3, mp4, wmv.
 * 
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
 * Returns roughly the first ~155 chars of the given text as a description.
 * @param {String} text 
 */
const makeDescription = (text) => {
  let charCount = 0;
  return (text || '').substr(0, 300)
    .split(' ')
    .filter(word => {
      if (charCount < 155) {
        charCount += word.length;
        return true;
      }
      return false;
    })
    .join(' ');
}

/**
 * Builds an array of meta objects and their attributes. Must use in the 
 * context of a Puppeteer evaluate() function.
 * @returns array of meta objects [{meta: {attrs,..}}]
 */
const extractMeta = () => {
  return [...document.querySelectorAll('meta')]
  .map(elem => {
    const attr = {};
    elem.getAttributeNames().forEach(n => attr[n] = elem.getAttribute(n));
    return attr;
  });
}

/**
 * Look for one of (twitter:|og:)*description meta tags and
 * use this as the web pages description.
 * 
 * @param {Array} metas an array of meta objects and their attributes 
 */
const getMetaDescription = (metas) => {
  let description;
  metas.forEach(meta => {
    for(const n in meta) {
      if ((n === 'name' && (meta[n] === 'description' || meta[n] === 'twitter:description')) 
          || (n === 'property' && meta[n] === 'og:description')) {
        description = meta['content'];
        break;
      }
    }
  });
  return description;
}

/**
 * Save the given page to Firestore.
 * 
 * @param {Object} page
 * @param {String} page.id
 * @param {String} page.title
 * @param {String} page.text
 */
const savePageToFirestore = async ({id, title, description, text}) => {
  const db = firebase.firestore();
  return db.collection('pages').doc(id)
    .update({
      title, 
      description,
      text
    });
}

/**
 * Saves the given web page PDF contents to Firebase Storage.
 * 
 * @param {Object} page
 * @param {String} page.id Firestore id of web page, will be used as storage filename "id.pdf"
 * @param {String} page.url URL of web page, will save to storage as metadata
 * @param {Buffer} contents of web page as PDF buffer
 */
savePagePdfToStorage = async ({id, url}, contents) => {
  return new Promise((resolve, reject) => {
    const bucket = firebase.storage().bucket();
    const fileName = `${id}.pdf`;
    const file = bucket.file(fileName);
    file.createWriteStream({
      resumable: false,
      contentType: 'application/pdf',
      metadata: {url}
    })
    .on('error', reject)
    .on('finish', () => resolve(fileName))
    .end(contents);
  });
}


/**
 * Handles fetching a web page, then extracting the text and generating a PDF, 
 * and finally saving to Firestore and Firebase Storage respectively.
 *  
 * @param {Object} snapshot https://firebase.google.com/docs/reference/node/firebase.firestore.DocumentSnapshot
 * @param {Object} context https://firebase.google.com/docs/reference/functions/cloud_functions_.eventcontext.html
 */
exports.handler = functions.firestore
  .document('pages/{pageId}')
  .onCreate(async (snapshot, context) => 
{
  const {url} = snapshot.data();
  const id = context.params.pageId;

  let browser;

  try {
    // Launch Chrome, in headless mode
    browser = await puppeteer.launch({headless: true, args:['--no-sandbox']});
    const browserPage = await browser.newPage();

    // Add a request interceptor and ignore any "media" type resources
    await browserPage.setRequestInterception(true);
    browserPage.on('request', abortMediaInterceptedRequestHandler);

    // Fetch the web page
    await browserPage.goto(url);

    // Extract web page text and save to Firestore
    const title = await browserPage.title();
    const text = await browserPage.$eval('*', el => el.innerText);
    const metas = await browserPage.evaluate(extractMeta);
    const description = getMetaDescription(metas) || makeDescription(text);
    await savePageToFirestore({id, title, description, text});

    // Generate PDF version of web page and save to FB Storage
    const pdf = await browserPage.pdf();
    await savePagePdfToStorage({id, url}, pdf);
  
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }

});