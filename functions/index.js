const functions = require('firebase-functions');
const firebase = require('firebase-admin');

// fetcher, indexer, search are dependent on Firebase being initialize
if (firebase.apps.length == 0) {
  firebase.initializeApp();
}

const fetcher = require('./fetcher');
const indexer = require('./indexer');
const search = require('./search');

/**
 * 
 * @param {Object} req 
 * @param {Object} res 
 * @param {Function} handler 
 */
const corsFilter = async (req, res, handler) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');    
  } else {
    await handler(req, res);
  }
}

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

exports.search = functions.https.onRequest((req, res) => corsFilter(req, res, search.handler));