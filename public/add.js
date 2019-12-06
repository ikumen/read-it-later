const {protocol, host} = window.location;

/**
 * Try to parse the query string for the url parameter and 
 * if it's valid, add it.
 */
function tryToAddPage() {
  // Get the whole query string
  const query = window.location.search;
  const encodedUrl = query.slice(1) // drop the ?
    .split('&') // tokenize into name/value pairs
    .filter(s => s.startsWith('url=')) // if theirs a pair that has url
    .map(s => s.slice(4)) // drop the url=
    .reduce(s => s.joint('')
      .trim()); 

  if (encodedUrl) {    
    addPage(decodeURIComponent(encodedUrl), 
      () => showMessage(`Bookmark successful: ${url}`, {autoClose: true}),
      (err) => showMessage(err, {isError: true}))
  } else {
    showMessage(`Not a valid URL: ${decodeURIComponent(encodedUrl)}`, {isError: true, autoClose: true})
  }
}

/**
 * Shows the given message.
 * 
 * @param {String} msg 
 * @param {Object} opts
 * @param {Boolean} opts.isError boolean indicating if this message is of type error
 * @param {Boolean} opts.autoClose boolean indicating if message should autoclose
 */
function showMessage(msg, {isError=false, autoClose=false}) {
  el('message')
    .addClass(isError ? 'bg-light-red' : 'bg-light-green black')
    .innerHtml(msg);

  if (autoClose) {
    setTimeout(() => {
      window.close();
    }, 3000);
  }
}

/**
 * Called by firebase onAuthStateChanged listener with current
 * state of user object.
 * 
 * @param {Object} user firebase authenticated user or null
 */
function handleStateChange(user) {
  if (!user) {
    showMessage(`To use the bookmarklet, please <a href="${protocol}//${host}" target="_blank">sign in</a> in first`, {isError: true});
  } else {
    tryToAddPage();
  }
}

ready(() => {
  firebase.auth().onAuthStateChanged(handleStateChange);
});