const firebase = require('firebase-admin');

/**
 * Save the given page to Firestore.
 * 
 * @param {Object} page
 * @param {String} page.id
 * @param {String} page.title
 * @param {String} page.text
 */
exports.save = ({id, title, text}) => {
  const db = firebase.firestore();
  return db.collection('pages').doc(id).update({title, text});
}
