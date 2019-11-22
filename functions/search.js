const firebase = require('firebase-admin');

const getPages = (ids) => {
  const db = firebase.firestore();
  return Promise.all(ids.map(id => {
    return db.collection('pages').doc(id).get()
      .then(doc => ({id, ...doc.data()}));
  }))
}

const listPages = (startAt) => {
  const db = firebase.firestore();
  const pagesCol = db.collection('pages');

  let results;
  if (startAt) {
    const startDoc = pagesCol.doc(startAt);
    results = startDoc.get().then(snapshot => {
      return pagesCol
        .orderBy('createdAt', 'desc')
        .limit(4)
        .get();
    });
  } else {
    results = pagesCol
      .orderBy('createdAt', 'desc')
      .limit(4)
      .get();
  }

  return results.then(snapshot => {
    const pages = [];
    snapshot.forEach(doc => pages.push({id: doc.id, ...doc.data()}));
    return pages;
  })
}

/**
 * @param {*} term 
 * @param {*} startAt 
 */
const findTermPages = async (term, startAt) => {
  const db = firebase.firestore();
  const termPagesCol = db.collection('terms').doc(term).collection('pages');
  
  let results;
  if (startAt) {
    const startDoc = termPagesCol.doc(startAt);
    results = startDoc.get().then(snapshot => {
      return termPagesCol
        .orderBy('count', 'desc')
        .startAt(snapshot)
        .limit(4)
        .get();
    });
  } else {
    results = termPagesCol
      .orderBy('count', 'desc')
      .limit(4)
      .get();
  }

  return results.then(snapshot => {
    const pageIds = [];
    snapshot.forEach(doc => pageIds.push(doc.id));
    return pageIds;
  });
}

const search = (term, startAt) => {
  return findTermPages(term, startAt).then(getPages);
}

exports.handler = async (req, res) => {
  const term = (req.query.term || '').trim().toLowerCase();
  const startAt = req.query.at;

  try {
    const pages = term 
      ? await listPages(startAt) 
      : await search(term, startAt);
    return res.status(200).send(pages);
  } catch(error) {
    console.error(`Caught error while searching: ${term}`, error);
    res.status(500).send();
  }
};