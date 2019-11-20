const functions = require('firebase-functions');
const firebase = require('firebase-admin');
const fetcher = require('./fetcher');
const projectId = 'read-it-later-demo';

if (firebase.apps.length == 0) {
  firebase.initializeApp({projectId});
}

exports.fetcher = functions.firestore
  .document('pages/{pageId}')
  .onCreate(fetcher.handler);
