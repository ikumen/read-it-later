const functions = require('firebase-functions');
const firebase = require('firebase-admin');

const {STOP_WORDS} = require('./stopwords');

/**
 * A very simple tokenizer, breaking the given text into terms (i.e, words).
 * @param {String} text 
 * @returns hash of terms and count of their occurrences
 */
const tokenize = (text) => {
  return (text || '')
    .replace(/[\W_]+/g, ' ') // replace all non alphabetic with space
    .split(' ')
    .map(token => token.trim().toLowerCase()) // only work with lowercase words
    .filter(token => token.length >= 3)       // only want terms of length 3 or more
    .filter(token => !STOP_WORDS.includes(token)) // only want non stopwords
    .reduce((terms, token) => { // build a count of each term
      if (!terms[token]) 
        terms[token] = 0;
      terms[token]++; // update the count
      return terms;
    }, {});
}

/**
 * @param {Object} results 
 */
const logBatchResults = (results) => console.log('Batched complete.' /*, results*/);

exports.handler = functions.firestore
  .document('users/{userId}/texts/{pageId}')
  .onWrite(async (change, context) => 
{
  if (context.eventType === 'providers/cloud.firestore/eventTypes/document.delete') {
    // Nothing to do, document is being removed
    return;
  }

  const userId = context.params.userId;
  const pageId = context.params.pageId;
  const {text} = {...change.after.data()};

  const db = firebase.firestore();
  const userRef = db.collection('users').doc(userId);
  let batch = db.batch();

  // Break the text into terms (e.g. words)
  const terms = tokenize(text);
  
  let i=0;
  for (const term in terms) {
    const termPagesRef = userRef
      .collection('terms').doc(term)
      .collection('pages').doc(pageId);

    batch.set(termPagesRef, {
      count: terms[term]
    });
    
    if (++i % 500 == 0) {
      batch.commit().then(logBatchResults);
      batch = db.batch();
    } 
  }

  if (i % 500 > 0) {
    batch.commit().then(logBatchResults);
  }

});