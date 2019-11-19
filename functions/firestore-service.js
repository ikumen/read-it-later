const firebase = require('firebase-admin');

/**
 * Save the given page to Firestore.
 * 
 * @param {Object} page
 * @param {String} page.id
 * @param {String} page.title
 * @param {String} page.text
 */
exports.save = async ({id, title, text}) => {
  if (firebase.apps.length === 0) {
    firebase.initializeApp();
  }

  const db = firebase.firestore();
  return db.collection('pages').doc(id).update({title, text});
}
