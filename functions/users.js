const firebase = require('firebase-admin');
const functions = require('firebase-functions');

// Grab the list of authorized users from environment config
const authorizedUsers = (functions.config().security.authorized || '').split(',');

exports.handler = functions.auth.user().onCreate(async (user) => {
  if (!authorizedUsers.includes(user.email)) {
    console.warn('User is not authorized!');
    // Clear the firebase system of unauthorized users
    await firebase.auth().deleteUser(user.uid);
    return;
  }

  // User is authorized, let's create silo for this users to 
  // store their bookmarks and inverted index, acts like a 
  // multi-tenent application
  const db = firebase.firestore();
  db.collection('users').doc(user.uid)
      .set({admin: true})
    .then(console.log)
    .catch(console.error);
});