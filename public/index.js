/**
 * @param {Function} fn to call when DOM has finished loading 
 */
function ready(fn) {
  if (document.readyState === "complete") {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

/**
 * Very naive check for a valid URL. Must be http based
 * and a local address.
 * 
 * @param {String} url to bookmark 
 */
function isValidURL(url) {
  const a = document.createElement('a');
  a.href = url;
  const {host = '', protocol = ''} = a;
  return (protocol.startsWith('http') && !host.startsWith('localhost'));
}

// Get a reference to the Firestore DB
var db = firebase.firestore();

/**
 * Add a new web page to the database.
 * 
 * @param {Object} page
 * @param {String} page.url address of web page to add
 */
function addPage({url}) {
  if (!isValidURL(url)) {
    alert(`Not a valid URL: ${url}`);
  } else {
    db.collection('pages').add({
      url,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(resp => console.log(`Cool, we just added: ${url}, resp=`, resp))
    .catch(err => console.error(`Oh noes, error while adding: ${url},`, err));
  }
}

ready(() => {
  /* The overloaded input field that holds search terms or URLs */
  const termOrUrlInput = document.getElementById('term-or-url-input');

  /* Prevent default form submit, we explicitly handle add URL/searching. */
  const searchAddForm = document.getElementById('search-n-add-form');
  searchAddForm.addEventListener('submit', (ev) => ev.preventDefault());

  /* Handle adding web page */
  const addPageBtn = document.getElementById('add-page-btn');
  addPageBtn.addEventListener('click', (ev) => {
    const url = termOrUrlInput.value;
    addPage({url});
  });
});