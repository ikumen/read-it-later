const firebase = require('firebase-admin');

/**
 * Save given page data to Firestore database.
 *
 * @param {Object} page
 * @param {String} page.id
 * @param {String} page.title
 * @param {String} page.text
 */
exports.savePageToFirestore = ({id, title, text}) => {
  if (firebase.apps.length === 0) {
    firebase.initializeApp();
  }
  const db = firebase.firestore();
  return db.collection('pages')
    .doc(id)
    .update({title, text});
};
