const functions = require('firebase-functions');
const firebase = require('firebase-admin');

// fetcher, indexer, search and create are dependent on Firebase being initialize
if (firebase.apps.length == 0) {
  firebase.initializeApp();
}

// Grab the list of authorized users from environment config
const authorizedUsers = (functions.config().security.authorized || '').split(',');

const fetcher = require('./fetcher');
const indexer = require('./indexer');
const search = require('./search');
const create = require('./create');

/**
 * Check if calling user is authorized to execute this callable function.
 * @param {Object} data passed to callable
 * @param {Object} context https://firebase.google.com/docs/reference/functions/cloud_functions_.eventcontext
 * @param {Function} handler callable function implementation 
 */
const checkIfAuthorized = (data, context, handler) => {
  // Calling user should be authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication is required!');
  }
  // Get the calling user's email, and check if authorized
  const userEmail = (context.auth.token || {}).email;
  if (!userEmail || !authorizedUsers.includes(userEmail)) {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized!');
  }
  // Execute callable
  return handler(data, context);
}

/**
 * Firestore triggered Function that takes newly created web page document
 * and fetches the full web page, extracts it's text to Firestore and generates
 * a PDF to Firebase Storage.
 */
exports.fetcher = fetcher.handler

/**
 * Firestore triggered Function that takes an updated web page document and 
 * builds an inverted index of the web page's text. The inverted index is saved
 * to Firestore.
 */
exports.indexer = indexer.handler;

/**
 * Handler for searching terms in bookmarked web page contents.
 */
exports.search = functions.https.onCall((data, cxt) => checkIfAuthorized(data, cxt, search.handler));

/**
 * Handler for bookmarking a web page (e.g. save a page document with url of web page).
 */
exports.create = functions.https.onCall((data, cxt) => checkIfAuthorized(data, cxt, create.handler));
