const DEFAULT_RESULT_SIZE = 10;
const ERR_CLASS = 'bg-light-red';
const MSG_CLASS = 'bg-light-green';

// Need to scope this here instead of local function, because we re-attach
// the same event listener multiple times with slightly different params,
// and having it global makes it easier to clear the listeners.
let moreResultsEl;

/**
 * Helper for clearing search results.
 */
function clearResults() {
  el('results-list').innerHtml('');
}

/**
 * Helper for displaying search results. 
 * 
 * Note: The number of results can be DEFAULT_RESULT_SIZE + 1, 
 * indicating there are additional results after this results set.
 * 
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
    // For each page document, build HTML to display it in a <li>, then
    // add the list item into the 'results-list' <ul>
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
        <h3 class="fl w-100 fw3 mv2 tc">No matching results found</h3>
      `);
  } 
  // Handle additional results to get by showing a "More results"
  // link and attaching a listener that will start a search for the
  // same term but at a specific page as the cursor.
  else if (pages.length > i) {
    moreResultsEl
      .clearListeners()
      .addListener('click', () => {
        const term = el('term-or-url-input').get().value;
        // search for term again, returning next set of results after pages[i], 
        // false means do not clear current display results
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

  if (isError && window.location.hostname === 'localhost') {
    console.log(msg);
  }

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
 * @param {String} term the word to search for in the pages
 * @param {String} startAt starting cursor for pagination
 */
function search(term, startAt, isNew=true) {
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
    ? listPages({startAt, limit})
    : findPagesByTerm(sanitizedTerm, {startAt, limit});
  
  // Display our results if success, otherwise show the error
  results
    .then(pages => displayResults(pages, isNew))
    .catch(error => showMessage(error.message, {isError: true}));
}

/**
 * Find all pages that have the given term.
 * 
 * @param {String} term the word to search for in the pages 
 * @param {Object} opts 
 * @param {String} opts.startAt cursor to start at for paging 
 * @param {Number} opts.limit number of results to return 
 */
function findPagesByTerm(term, {startAt, limit}) {

  const user = getCurrentUser();
  const userRef = db.collection('users').doc(user.uid);
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
 * Return a list of pages for current user.
 * 
 * @param {Object} opts 
 * @param {String} opts.startAt cursor to start at for paging 
 * @param {Number} opts.limit number of results to return 
 */
function listPages({startAt, limit}) {
  // Reference to the users/pages collection
  const user = getCurrentUser();
  const userPagesRef = db.collection('users')
    .doc(user.uid).collection('pages');

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
 * after successful authentication or already auth and reload page.
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
 * Any time there's a user state change (e.g, signin/signout), we'll handle here.
 * 
 * @param {Object} user either authenticated or null
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
  if (pathname === '/signin') {
    history.replaceState({}, '', '/');
  }

  // All kosher, we have auth user, lets load home page
  loadHome();  
}

/**
 * Builds the bookmarklet url for the current host.
 */
function createBookmarkletScript() {
  const {protocol, host} = window.location;
  return encodeURI(`javascript:(function(){var w=window,d=document,e=encodeURIComponent,o=w.open('${protocol}//${host}/add?url='+e(d.location),'_ritl','left='+((w.screenX||w.screenLeft)+10)+',top='+((w.screenY||w.screenTop)+10)+',height=310,width=600,resizable=1,alwaysRaised=1,status=0');w.setTimeout(function(){o.focus()},400)})();`);
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
  el('add-page-btn').addListener('click', () => {
    const url = termOrUrlInputEl.get().value;
    termOrUrlInputEl.get().value = '';
    addPage(url,
      () => showMessage(`Bookmark successful: ${url}`, {autoClose: true}),
      (err) => showMessage(err, {isError: true}) 
    );
  });

  // Handle searching for term and displaying results
  el('search-btn').addListener('click', () => search(termOrUrlInputEl.get().value));

  // Register handler to dismiss errors
  el('close-msg-btn').addListener('click', hideMessage);

  el('bookmarklet').get().href = createBookmarkletScript();
});
