const firebase = require('firebase-admin');
const functions = require('firebase-functions');
const {URL, parse} = require('url');

/**
 * Check if given URL is valid. Note: we only accept http/https protocols and
 * try to avoid non-reachable hosts.
 * @param {String} url of web page to bookmark
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    const parsed = parse(url.toLowerCase());
    return ['http:', 'https:'].includes(parsed.protocol) // only support these protocols
      && parsed.hostname != 'localhost'; 
  } catch(err) {
    return false;
  }
}

/**
 * Handles bookmarking a web page (e.g, save a URL to Firestore).
 * @param {Object} data 
 * @param {Object} context https://firebase.google.com/docs/reference/functions/cloud_functions_.eventcontext
 */
exports.handler = (data, context) => {
  // Validate URL
  const {url} = data;
  if (!isValidUrl(url)) {
    throw new functions.https.HttpsError('invalid-argument', 'Not a valid URL');
  }
  // Bookmark web page, which are unique to a user
  const db = firebase.firestore();
  return db.collection('pages').add({
    url,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    user: context.auth.uid,
  });
}