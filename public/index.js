/**
 * Helper for working with and creating HTMLElements.
 * 
 * @param {String} id of element to lookup or if tagname was given, the id of the newly created element
 * @param {String} tagName type of element to create
 * @param {HTMLElement} parent optional parent to assign this new element.
 */
const el = (id, tagName, parent) => {
  const _el = tagName
    ? document.createElement(tagName)
    : document.getElementById(id);

  if (_el == null) {
    throw new Error(`No element with id: ${id}`);
  }

  // If we're creating a new element, give it an id and assign 
  // to a parent node if applicable
  if (tagName) {
    _el.id = id;
    if (parent) {
      parent.appendChild(_el);
    }
  }

  // Keep track of listeners on this element, in case we need to remove
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
    isEmpty: () => {
      return _el.innerHTML === '';
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
      for(const name in _el.__listeners) {
        _el.removeEventListener(name, _el.__listeners[name], false);
      }
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

// -----------------------------------------------
// Start of main application 
// -----------------------------------------------
const DEFAULT_RESULT_SIZE = 10;
const ERR_CLASS = 'bg-light-red';
const MSG_CLASS = 'bg-light-green';

// Get a reference Firebase services, assuming Firebase scripts were loaded before this.
const db = firebase.firestore();
const functions = firebase.functions();
const isDev = window.location.hostname === 'localhost';

// Need to scope this here instead of local function, because we re-attach
// the same event listener multiple times with slightly different params,
// and having it global makes it easier to clear the listeners.
let moreResultsEl;

if (isDev) {
  // Use the emulator if we in development, it's kinda hacky but see:
  // https://firebase.google.com/docs/emulator-suite/connect_and_prototype
  db.settings({ host: "localhost:8080", ssl: false });
  functions.useFunctionsEmulator('http://localhost:5001');
}

function handleCallableError({code, message, details}) {
  if (code === 'unauthenticated') {
    signout();
  } else {
    showMessage(message, {isError: true});
    if (isDev) console.log(details);
  }
}

/**
 * Add a new web page to the database.
 * 
 * @param {Object} page
 * @param {String} page.url address of web page to add
 */
function addPage({url}) {
  if(!isValidURL(url)) {
    showMessage('Not a valid URL!', {isError: true})
    return;
  }

  const user = firebase.auth().currentUser;
  const page = {url, createdAt: firebase.firestore.FieldValue.serverTimestamp()};

  db.collection('users').doc(user.uid)
      .collection('pages').add(page)
    .then(() => {
      el('term-or-url-input').get().value = '';
      showMessage(`Bookmarked successful: ${url}`, {autoClose: true});
    })
    .catch(error => showMessage(error.message, {isError: true}));
}

/**
 * Helper for clearing search results.
 */
function clearResults() {
  el('results-list').innerHtml('');
}

/**
 * Helper for display search results.
 * @param {Array} pages 
 * @param {Boolean} clear 
 */
function displayResults(pages, clear) {
  moreResultsEl.addClass('dn')
    .clearListeners();

  const resultsEl = el('results-list');
  if (clear) {
    clearResults();
  }

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

  // Handle no results
  if (pages.length == 0 && resultsEl.isEmpty()) {
    el('no-more', 'li', resultsEl)
      .innerHtml(`
        <h3 class="fl w-100 fw3 mv2">No matching results found</h3>
      `);
  } 
  // Handle additional results to get
  else if (pages.length > i) {
    moreResultsEl
      .clearListeners()
      .addListener('click', () => {
        const term = el('term-or-url-input').get().value;
        search(term, pages[i].id, false); 
      })
      .removeClass('dn');
    }
}

function showMessage(msg, opts = {isError: false, autoClose: false}) {
  el('message').innerHtml(msg);
  el('messages')
    .addClass(opts.isError ? ERR_CLASS : MSG_CLASS)  
    .removeClass('dn');
  if (opts.autoClose) {
    setTimeout(hideMessage, 3000);
  }
}

function hideMessage() {
  el('message').innerHtml(''); 
  el('messages')
    .addClass('dn')
    .removeClass(`${ERR_CLASS} ${MSG_CLASS}`);
}

/**
 * Search for the given term, returning all pages if term is empty, for 
 * the currently authenticated user.
 * 
 * @param {String} userId owner id of the resources to search through  
 * @param {String} term the word to search for in the pages
 * @param {String} startAt starting cursor for pagination
 */
function search(term, startAt, isNew=true) {
  // It's assumed we have an authenticated user at this point, otherwise
  // we would have been redirect to signin page
  const user = firebase.auth().currentUser;

  // Clean up our search term 
  const sanitizedTerm = (term || '').trim() // no starting or trailing spaces
    .replace(/\W|_/g,'') // remove all non alpha numeric chars
    .toLowerCase();
          
  if (sanitizedTerm && sanitizedTerm !== term) {
    showMessage(`Removed special chars from search term: "${sanitizedTerm}"`)
  }

  // Build the cursor param
  startAt = startAt || '';
  // Set the number of results to return
  const limit = DEFAULT_RESULT_SIZE + 1;

  const results = sanitizedTerm === '' 
    ? listPages(user.uid, {startAt, limit})
    : findPagesByTerm(user.uid, sanitizedTerm, {startAt, limit});
  
  // Display our results if success, otherwise show the error
  results
    .then(pages => displayResults(pages, isNew))
    .catch(error => showMessage(error.message, {isError: true}));
}

/**
 * Find all pages that have the given term.
 * 
 * @param {String} userId owner id of the resources to search through 
 * @param {String} term the word to search for in the pages 
 * @param {Object} opts 
 * @param {String} opts.startAt cursor to start at for paging 
 * @param {Number} opts.limit number of results to return 
 */
function findPagesByTerm(userId, term, {startAt, limit}) {
  const userRef = db.collection('users').doc(userId);
  const userTermPagesRef = userRef.collection('terms').doc(term).collection('pages');

  const query = userTermPagesRef
      .orderBy('count', 'desc')
      .limit(limit);

  // Query for pages mapped to given term
  const results = startAt 
      // We're given a startAt cursor for paging, so return results from there
      ? userTermPagesRef.doc(startAt).get()
          .then(snapshot => query.startAt(snapshot).get())
      : query.get();

  return results
    // For each term-to-page mapping, get and return the page ids
    .then(snapshot => {
      const pageIds = [];
      snapshot.forEach(doc => pageIds.push(doc.id));
      return pageIds;
    })
    // Load page documents by their ids
    .then(pageIds => Promise.all(pageIds.map(id => 
      // Given a page id, load the page
      userRef.collection('pages').doc(id).get().then(doc => ({id, ...doc.data()}))  
    )));
}

/**
 * Return a list of pages belonging to the given user.
 * 
 * @param {String} userId owner id of resources to return 
 * @param {Object} opts 
 * @param {String} opts.startAt cursor to start at for paging 
 * @param {Number} opts.limit number of results to return 
 */
function listPages(userId, {startAt, limit}) {
  // Reference to the users/pages collection
  const userPagesRef = db.collection('users').doc(userId).collection('pages');

  const query = userPagesRef
    .orderBy('createdAt', 'desc')
    .limit(limit)

  // Get all the pages
  const results = startAt 
    // We're given a startAt cursor for paging, so return results from there
    ? userPagesRef.doc(startAt).get().then(snapshot => {
        return query.startAt(snapshot).get()})
    : query.get();

  return results
    .then(snapshot => {
      const pages = [];
      snapshot.forEach(doc => pages.push({id: doc.id, ...doc.data()}));
      return pages;
    });
}

/**
 * Display or hide the signin modal.
 * @param {boolean} show 
 */
function toggleSigninModal(show=true) {
  const signinModal = el('signin-modal'),
    signoutLink = el('signout-link'),
    header = el('header');

  if (show) {
    signinModal.addClass('open');
    signoutLink.addClass('dn');
    header.addClass('dn');
  } else {
    signinModal.removeClass('open');
    header.removeClass('dn');
    signoutLink.removeClass('dn');  
  }
}

/**
 * Display or hide the signing loading status.
 * @param {boolean} show 
 */
function toggleSigninLoading(show = true) {
  const signinBtn = el('signin-btn'),
    signinLoading = el('signin-loading');
  if (show) {
    signinBtn.addClass('dn');
    signinLoading.removeClass('dn');
  } else {
    signinBtn.removeClass('dn');
    signinLoading.addClass('dn');
  }
}

/**
 * Load the home page, thus hiding the signin page. Called
 * after successful authentication or already auth and 
 * reload page.
 */
function loadHome() {
  toggleSigninModal(false);
  search();
}

/**
 * Sign us out, and show the signin page afterwards.
 */
function signout() {
  clearResults();
  firebase.auth().signOut().then(() => {
    history.pushState({}, '', '/signin');
    toggleSigninModal(true);
  });
}

/**
 * Attempt to signin with the configured OAuth provider.
 */
function signin() {
  // Get ready for signin to Github
  var githubProvider = new firebase.auth.GithubAuthProvider();
  githubProvider.addScope('user');
  githubProvider.setCustomParameters({'allow_signup': 'false'});
  // Hide signin and show loading
  toggleSigninLoading(true);
  // Start OAuth dance
  firebase.auth().signInWithPopup(githubProvider).then((result) => {
    //if(result.credential) {}
    toggleSigninLoading(false);
  });
}

/**
 * Any time there's a user state change (e.g, signin/signout), we'll
 * handle here.
 * @param {Object} user 
 */
function handleStateChange(user) {
  const {pathname} = window.location;
  // No user or user wishes to signout
  if (!user || pathname === '/signout') {
    signout();
    return;
  }
  // At this point, user must be authenticated, so show the home page,
  // also fix the path if needed.
  if (pathname === '/signin')
    history.replaceState({}, '', '/');

  loadHome();  
}

ready(() => {
  // The overloaded input field that holds search terms or URLs
  const termOrUrlInputEl = el('term-or-url-input');
  moreResultsEl = el('more-results');

  window.onpopstate = (evt) => {
    // Whenever the browser nav back/forward, check if we need to update UI
    handleStateChange(firebase.auth().currentUser);
  }
  
  // When a user is signed in/out, update UI appropriately
  firebase.auth().onAuthStateChanged(handleStateChange);
  
  // Handle signin out click
  el('signout-link').addListener('click', (ev) => {
    ev.preventDefault();
    signout();
  });

  // Handle signing in click
  el('signin-btn').addListener('click', signin);

  // Prevent default form submit, we explicitly handle add URL/searching
  el('search-n-add-form').addListener('submit', (ev) => {
    ev.preventDefault();
    search(termOrUrlInputEl.get().value);
  });

  // Handle adding web page
  el('add-page-btn').addListener('click', () => addPage({url: termOrUrlInputEl.get().value}));

  // Handle searching for term and displaying results
  el('search-btn').addListener('click', () => search(termOrUrlInputEl.get().value));

  // Register handler to dismiss errors
  el('close-msg-btn').addListener('click', hideMessage);

});
