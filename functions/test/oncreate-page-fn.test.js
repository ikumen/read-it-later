const sinon = require('sinon');
const assert = require('assert');

const onCreatePageFnPkg = require('../oncreate-page-fn');
const savePageToFirestorePkg = require('../helpers/save-page-to-firestore');
const savePagePDFToStoragePkg = require('../helpers/save-page-pdf-to-storage');


let savePageToFirestoreMock;
let savePagePDFToStorageMock;

beforeEach(() => {
  /* Mock the savePage* helpers */
  savePageToFirestoreMock = sinon.stub(savePageToFirestorePkg, "savePageToFirestore");
  savePagePDFToStorageMock = sinon.stub(savePagePDFToStoragePkg, "savePagePDFToStorage");
});

afterEach(() => {
  /* Restore the savePage* helpers to original */
  savePageToFirestoreMock && savePageToFirestoreMock.restore();
  savePagePDFToStorageMock && savePagePDFToStorageMock.restore();
});

describe('onCreate Page Handler Tests', () => {
  const page = {
    id: 1,
    title: 'Introduction :: Eloquent JavaScript',
    url: 'http://eloquentjavascript.net/00_intro.html'
  };

  it('onCreatePageHandler: should fetch page and call savePageToFirestore with extract text/title', async () => {

    await onCreatePageFnPkg.onCreatePageHandler(page);

    // verify savePageToFirestore was called, with expect params
    const pageForFirestore = savePageToFirestoreMock.firstCall.args[0];
    assert.ok(savePageToFirestoreMock.calledOnce);
    assert.equal(pageForFirestore.id, page.id);
    assert.equal(pageForFirestore.title, page.title); // TODO: fragile
  });

  it('onCreatePageHandler: should fetch page and call savePagePDFToStorage with generated PDF', async () => {

    await onCreatePageFnPkg.onCreatePageHandler(page);

    // verify savePagePDFToFirestore was called, with expect params
    const pageForStorage = savePagePDFToStorageMock.firstCall.args[0];
    const pdfForStorage = savePagePDFToStorageMock.firstCall.args[1];
    assert.ok(savePageToFirestoreMock.calledOnce)
    assert.equal(pageForStorage.id, page.id);
    assert.equal(pageForStorage.url, page.url);
    assert.equal(pdfForStorage.toString('utf8', 0, 4), '%PDF');
  });

});