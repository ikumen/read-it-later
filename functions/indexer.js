const functions = require('firebase-functions');
const firebase = require('firebase-admin');

const {STOP_WORDS} = require('./stopwords');

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
      terms[token]++;
      return terms;
    }, {});
}

const logBatchResults = (results) => console.log('Batched:', results);

exports.handler = async (change, context) => {
  const {id, text, title} = {
    id: change.after.id,
    ...change.after.data()
  };

  const db = firebase.firestore();
  let batch = db.batch();

  // Tokenize both the text and title
  const terms = tokenize([text, title].join(' '));

  let i=1;
  for (const term in terms) {
    const ref = db.collection('terms').doc();
    batch.set(ref, {
      term: term,
      page: id,
      count: terms[term]
    });

    if (i++ % 500 == 0 || i >= terms.length) {
      batch.commit().then(logBatchResults);
      batch = db.batch();
    } 
  }
}