/**
 * Helper for working with and creating HTMLElements.
 * 
 * @param {String} id of element to lookup or if tagname was given, the id of the newly created element
 * @param {String} tagName type of element to create
 * @param {HTMLElement} parent optional parent to assign this new element.
 */
function el(id, tagName, parent) {
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

/**
 * Returns the currently authenticated Firebase user. Encapsulating
 * this so we can decouple explicit calls to firebase and makes testing
 * easier.
 */
function getCurrentUser() {
  return firebase.auth().currentUser;
}

/**
 * Add a new web page to the database.
 * 
 * @param {*} url address of web page to add
 * @param {*} onSuccess handler on successful add
 * @param {*} onError handle on error
 */
function addPage(url, onSuccess, onError) {
  url = (url || '').trim();
  if(!isValidURL(url)) {
    onError('Not a valid URL!')
    return;
  }

  const user = getCurrentUser();
  const userPagesRef = db.collection('users').doc(user.uid).collection('pages');

  userPagesRef.where('url', '==', url).get()
    .then((snapshot) => {
      if (snapshot.empty) {
        userPagesRef.add({
          url, 
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(onSuccess)
        .catch(onError);
      } else {
        console.log(`Hey, a bookmark already exists for ${url}`);
        onSuccess();
      }
    })
    .catch(onError)
}

const db = firebase.firestore();
let authenticatedUser = null;

if (window.location.hostname === 'localhost') {
  // Use the emulator if we in development, it's kinda hacky but see:
  // https://firebase.google.com/docs/emulator-suite/connect_and_prototype
  db.settings({ host: "localhost:8080", ssl: false });
}

