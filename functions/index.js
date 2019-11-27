const functions = require('firebase-functions');
const firebase = require('firebase-admin');

// fetcher, indexer, search and create are dependent on Firebase being initialize
if (firebase.apps.length == 0) {
  firebase.initializeApp();
}

const fetcher = require('./fetcher');
const indexer = require('./indexer');
const search = require('./search');
const create = require('./create');

/**
 * Firestore triggered Function that takes newly created web page document
 * and fetches the full web page, extracts it's text to Firestore and generates
 * a PDF to Firebase Storage.
 */
exports.fetcher = functions.firestore.document('pages/{pageId}').onCreate(fetcher.handler);

/**
 * Firestore triggered Function that takes an updated web page document and 
 * builds an inverted index of the web page's text. The inverted index is saved
 * to Firestore.
 */
exports.indexer = functions.firestore.document('pages/{pageId}').onUpdate(indexer.handler);

/**
 * Handler for searching terms in bookmarked web page contents.
 */
exports.search = functions.https.onCall(search.handler);

/**
 * Handler for bookmarking a web page (e.g. save a page document with url of web page).
 */
exports.create = functions.https.onCall(create.handler);
