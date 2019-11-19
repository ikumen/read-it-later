//const firebase = require('firebase-admin');

/**
 * Saves the given web page PDF contents to Firebase Storage.
 * 
 * @param {Object} page
 * @param {String} page.id Firestore id of web page, will be used as storage filename "id.pdf"
 * @param {String} page.url URL of web page, will save to storage as metadata
 * @param {Buffer} contents of web page as PDF buffer
 */
exports.save = async ({id, url}, contents) => {

}
