const {protocol, host} = window.location;

function tryToAddPage() {
  const query = window.location.search;
  if (query.indexOf('url') != -1) {
    const encodedUrl = query.slice(1).split('&')
      .filter(s => s.startsWith('url='))
      .map(s => s.slice(4))
      .reduce(s => s.joint(''));
    const url = decodeURIComponent(encodedUrl);
    
    addPage(url, 
      () => showMessage(`Bookmark successful: ${url}`, {autoClose: true}),
      (err) => showMessage(err, {isError: true}))
  }
}

function showMessage(msg, {isError=false, autoClose=false}) {
  const msgEl = el('message');
  msgEl.addClass(isError ? 'bg-light-red' : 'bg-light-green black');
  msgEl.innerHtml(msg);
  if (autoClose) {
    setTimeout(() => {
      window.close();
    }, 3000);
  }
}

function handleStateChange(user) {
  // No user or user wishes to signout
  if (!user) {
    showMessage(`To use the bookmarklet, please <a href="${protocol}//${host}" target="_blank">sign in</a> in first`, {isError: true});
    return;
  } else {
    tryToAddPage();
  }
}

ready(() => {
  firebase.auth().onAuthStateChanged(handleStateChange);
});