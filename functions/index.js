const functions = require('firebase-functions');
const firebase = require('firebase-admin');

// fetcher, indexer, search and create are dependent on Firebase being initialize
if (firebase.apps.length == 0) {
  firebase.initializeApp();
}

const fetcher = require('./fetcher');
const indexer = require('./indexer');
const users = require('./users');

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
 * Register an authenticated user into our system.
 */
exports.registerUser = users.handler;