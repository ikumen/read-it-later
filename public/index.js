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

  _el.__listeners = {};

  const props = {
    get: () => _el,
    addClass: (cls) => {
      cls.split(' ').forEach(c => {
        if (!_el.classList.contains(c))
          _el.classList.add(c);
      });
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
      _el.__listeners[name] = handler;
      _el.addEventListener(name, handler, false);
      return props;
    },
    clearListeners: () => {
      for(const name in _el.__listeners) 
        _el.removeEventListener(name, _el.__listeners[name], false);
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
const db = firebase.firestore();
const DEFAULT_RESULT_SIZE = 10;

let searchEndpoint = 'https://us-central1-ritl-app.cloudfunctions.net/search';
if (window.location.hostname === 'localhost') {
  // Use the emulator if we in development, it's kinda hacky but see:
  // https://firebase.google.com/docs/emulator-suite/connect_and_prototype
  db.settings({ host: "localhost:8080", ssl: false });
  searchEndpoint = 'http://localhost:5001/ritl-app/us-central1/search';  
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

function displayResults(pages, clearResults) {
  const moreResultsEl = el('more-results');
  moreResultsEl.addClass('dn');

  const resultsEl = el('results-list');
  if (clearResults) {
    resultsEl.innerHtml(''); 
  }

  // TODO: make 10 configurable page size
  let i = 0;
  while (i < pages.length && i < DEFAULT_RESULT_SIZE) {
    const {id, title, url, description} = pages[i];
    el(id, 'li', resultsEl)
      .addClass('cf pv3 hover-bg-washed-yellow')
      .innerHtml(`
        <h3 class="fl w-100 fw3 mv2"><a href="${url}" class="link">${title || url}</a></h3>
        <a href="${url}" class="link fl w-100 ma0 green truncate" target="_new">${url}</a>
        <div class="fl w-100">${description}</div>        
      `);
    i++;
  }

  if (pages.length > i) {
    el('more-results')
      .removeClass('dn')
      .clearListeners()
      .addListener('click', () => {
        search(el('term-or-url-input').get().value, pages[i].id, false)
    })
  }
}

function displayError(error) {
  el('errorMessages').innerHtml(error);
  el('errors').removeClass('dn');
}

function dismissError(errors) {
  el('errorMessages').innerHtml('');
  el('errors').addClass('dn');
}

function search(term, startAt, clearResults = true) {
  term = (term || '').trim().toLowerCase();
  startAt = startAt ? `&at=${startAt}` : '';

  fetch(`${searchEndpoint}?term=${term}${startAt}&limit=${DEFAULT_RESULT_SIZE+1}`)
    .then(res => res.json())
    .then(pages => displayResults(pages, clearResults))
    .catch(displayError);
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
    search(term);
  });

  // Register handler to dismiss errors
  el('close-errors-btn').addListener('click', dismissError);
});
