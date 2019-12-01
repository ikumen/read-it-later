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
const DEFAULT_RESULT_SIZE = 2;
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
function addPage(page) {
  functions.httpsCallable('create')(page)
    .then(resp => {
      el('term-or-url-input').get().value = '';
      showMessage(`Bookmarked added: ${page.url}`, {autoClose: true});
    })
    .catch(handleCallableError);
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
 * Search for the given term.
 * @param {String} term 
 * @param {String} startAt starting cursor for pagination
 * @param {Boolean} isNew indicate whether we are starting a new search or next resultset
 */
function search(unsanitizedTerm, startAt, isNew=true) {
  // Clean up our search term 
  const term = (unsanitizedTerm || '').trim() // no starting or trailing spaces
    .replace(/\W|_/g,'') // remove all non alpha numeric chars
    .toLowerCase();
          
  if (term && term !== unsanitizedTerm) {
    showMessage(`Removed special chars from search term: "${term}"`)
  }

  // Build the cursor param
  startAt = startAt || '';
  // Set the number of results to return
  const limit = DEFAULT_RESULT_SIZE + 1;

  // Do search
  functions.httpsCallable('search')({term, startAt, limit})
  .then(resp => displayResults(resp.data, isNew))
  .catch(error => showMessage(error.message, {isError: true}));
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
