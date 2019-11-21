const el = (id, tagName, parent) => {
  const _el = tagName
    ? document.createElement(tagName)
    : document.getElementById(id);

  if (_el == null) {
    throw new Error(`No element with id: ${id}`);
  }

  if (tagName) {
    _el.id = id;
    if (parent) {
      parent.appendChild(_el);
    }
  }

  const props = {
    get: () => _el,
    addClass: (cls) => {
      cls.split(' ').forEach(c => _el.classList.add(c));
      return props; // for chaining
    },
    removeClass: (cls) => {
      cls.split(' ').forEach(c => _el.classList.remove(c));
      return props;
    },
    appendChild: (child) => {
      _el.appendChild(child);
      return props;
    },
    innerHtml: (html) => {
      _el.innerHTML = html;
      return props;
    },
    addListener: (name, handler) => {
      _el.addEventListener(name, handler);
      return props;
    }
  }
  return props;
}

/**
 * Helper that will defer executing a given function, until DOM is loaded.
 * @param {Function} fn to call when DOM has finished loading 
 */
function ready (fn) {
  if (document.readyState === "complete") {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

/**
 * Very naive check for a valid URL. Must be http based
 * and NOT a local address.
 * 
 * @param {String} url to bookmark 
 */
function isValidURL(url) {
  const a = document.createElement('a');
  a.href = url;
  const {host = '', protocol = ''} = a;
  return (protocol.startsWith('http') 
      && !host.startsWith('localhost') 
      && host !== window.location.hostname);
}

// Get a reference to the Firestore DB, assuming Firebase scripts were loaded before this.
var db = firebase.firestore();

if (window.location.hostname === 'localhost') {
  // Use the emulator if we in development, it's kinda hacky but see:
  // https://firebase.google.com/docs/emulator-suite/connect_and_prototype
  db.settings({ host: "localhost:8080", ssl: false });
}

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

function displayResults(pages, clearResults = false) {
  const resultsEl = el('results-list');
  if (clearResults) {
    resultsEl.innerHtml(''); 
  }

  console.log(pages)
  pages.forEach(({id, title, createdAt, url, snippet}) => {
    el(id, 'li', resultsEl)
      .addClass('dim')
      .innerHtml(`
        <h3 class="fl w-100 fw3 mv2">${title || url}</h3>
        <a href="${url}" class="fl w-100" target="_new">${url}</a>
        <div class="fl w-100 f5 black-30 mv1"></div>
        <div class="fl w-100">${snippet || ''}</div>        
      `);
  });
}

function displayError(error) {
  el('errorMessages').innerHtml(error);
  el('errors').removeClass('dn');
}

function dismissError(errors) {
  el('errorMessages').innerHtml('');
  el('errors').addClass('dn');
}

function searchAndDisplayResults(term) {
  search(term)
    .then(displayResults)
    .catch(displayError);
}

function getPage(id) {
  return db.collection('pages').doc(id).get()
    .then(doc => ({id: doc.id, ...doc.data()}));
}

function search(term) {
  term = (term || '').trim().toLowerCase();

  if (!term) {
    return Promise.reject('A search term is required!');
  }

  return db.collection('terms')
      .where('term', '==', term)
      .orderBy('count', 'desc')
      .limit(10)
      .get()
    .then(snapshot => {
      // terms are mapped to page ids
      const pages = [];
      snapshot.forEach(doc => 
        pages.push(doc.data().page));

      // get all the pages given their ids
      return Promise.all(pages.map(getPage));
    });
}


ready(() => {
  // The overloaded input field that holds search terms or URLs
  const termOrUrlInputEl = el('term-or-url-input');

  // Prevent default form submit, we explicitly handle add URL/searching
  el('search-n-add-form').addListener('submit', ev => ev.preventDefault());

  // Handle adding web page
  el('add-page-btn').addListener('click', () => {
    const url = termOrUrlInputEl.get().value;
    addPage({url});
  });

  // Handle searching for term and displaying results
  el('search-btn').addListener('click', () => {
    const term = termOrUrlInputEl.get().value;
    searchAndDisplayResults(term);
  });

  // Register handler to dismiss errors
  el('close-errors-btn').addListener('click', dismissError);
});
