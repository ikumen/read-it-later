const firebase = require('firebase-admin');
const functions = require('firebase-functions');
const DEFAULT_RESULT_SIZE = 10;

/**
 * Maps page documents from a query to plain old object. 
 * 
 * @param {DocumentSnapshot} doc  
 */
const pageDocQueryResultMapper = (doc) => {
  const {title, url, description, createdAt} = doc.data();
  return {id: doc.id, title, url, description, createdAt};
}

/**
 * Returns all the page documents referenced by given page ids.
 * 
 * @param {String} ids 
 */
const getPages = (ids) => {
  const db = firebase.firestore();
  return Promise.all(ids.map(id => (
    db.collection('pages').doc(id).get()
      .then(pageDocQueryResultMapper)
  )));
}

/**
 * Returns list of pages.
 * 
 * @param {String} startAt cursor id of document to start query at
 * @param {Number} limit the result set size
 */
const listPages = (startAt, limit) => {
  const db = firebase.firestore();
  const pagesCol = db.collection('pages');
  const query = pagesCol
    .orderBy('createdAt', 'desc')
    .limit(limit)

  const results = startAt 
    ? pagesCol.doc(startAt).get().then(snapshot => {
        return query.startAt(snapshot).get()})
    : query.get();

  return results.then(snapshot => {
    const pages = [];
    snapshot.forEach(doc => pages.push(pageDocQueryResultMapper(doc)));
    return pages;
  })
}

/**
 * Find page ids that are associated with the given term.
 * 
 * @param {String} term to find 
 * @param {String} startAt cursor id of document to start query at
 * @param {Number} limit the result set size
 */
const findTermPageIds = async (term, startAt, limit) => {
  const db = firebase.firestore();
  
  const termPagesCol = db.collection('terms').doc(term).collection('pages');
  const query = termPagesCol
    .orderBy('count', 'desc')
    .limit(limit);

  const results = startAt 
    ? termPagesCol.doc(startAt).get()
        .then(snapshot => query.startAt(snapshot).get())
    : query.get();

  return results.then(snapshot => {
    const pageIds = [];
    snapshot.forEach(doc => pageIds.push(doc.id));
    return pageIds;
  });
}

/**
 * Performs search for page documents associated with given term.
 * 
 * @param {String} term to find
 * @param {String} startAt cursor id of document to start search at 
 * @param {Number} limit the result set size
 */
const search = (term, startAt, limit) => {
  return findTermPageIds(term, startAt, limit).then(getPages);
}

/**
 * Handles searching for given term through all the bookmarked web page contents.
 * @param {Object} data 
 * @param {Object} context https://firebase.google.com/docs/reference/functions/cloud_functions_.eventcontext
 */
exports.handler = async ({term = '', startAt, limit = DEFAULT_RESULT_SIZE}, context) => {
  
  term = term.trim().toLowerCase();
  limit = parseInt(limit);

  try {
    return term 
      ? await search(term, startAt, limit)
      : await listPages(startAt, limit);
  } catch (error) {
    console.error(error);
    throw new functions.https.HttpsError('internal', `Caught error while searching: ${term}, ${error}`);
  }
};

