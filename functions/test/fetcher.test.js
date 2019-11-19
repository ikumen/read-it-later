const assert = require('assert');
const sinon = require('sinon');
const test = require('firebase-functions-test')();

// What we are testing 
const fetcher = require('../fetcher');

// Firestore and Firebase Storage abstractions, we'll mock them
// so then spy on the mocks to see if our fetcher function
// calls the services with the correct data.
const firestoreService = require('../firestore-service');
const storageService = require('../storage-service');


describe('Fetcher Unit Tests', () => {
  // Mocks the "save" function for each service
  let firestoreSaveMock; 
  let storageSaveMock;

  beforeEach(() => {
    // Begin mocking/spying
    firestoreSaveMock = sinon.stub(firestoreService, "save");
    storageSaveMock = sinon.stub(storageService, "save");
  });

  afterEach(() => {
    // Restore original implementations
    firestoreSaveMock && firestoreSaveMock.restore();
    storageSaveMock && storageSaveMock.restore();
  });

  // Expected results
  const expectedPage = {
    id: 'nsuvmO20T9JP1xMW7tmk',
    title: 'Introduction :: Eloquent JavaScript',
    url: 'http://eloquentjavascript.net/00_intro.html'
  };

  // Params from Firestore trigger to Function
  const context = {params: {pageId: expectedPage.id }};
  const snapshot = {data: () => ({url: expectedPage.url })};

  it('fetcher.handle: should call firestore service and save text from fetched web page', async () => {
    // Perform fetch and extract text/title
    await fetcher.handler(snapshot, context);
    
    // "handler" method should have called our mock, passing 
    // it the page {id, title, text} to save to Firestore. Get 
    // the passed in data and validate.
    const page = firestoreSaveMock.firstCall.args[0];
    assert.ok(firestoreSaveMock.calledOnce);
    assert.equal(page.id, expectedPage.id);
    assert.equal(page.title, expectedPage.title); // TODO: fragile
  });

  it('fetcher.handle: should call storage service and save generated PDF from fetched web page', async () => {
    // Perform fetch and PDF generation
    await fetcher.handler(snapshot, context);

    // "handler" method should have called our mock, passing
    // it the PDF to save to Firebase Storage. Get the passed
    // in data and validate.
    const page = storageSaveMock.firstCall.args[0];
    const pdf = storageSaveMock.firstCall.args[1];
    assert.ok(storageSaveMock.calledOnce)
    assert.equal(page.id, expectedPage.id);
    assert.equal(page.url, expectedPage.url);
    // PDF files usually start with %PDF identifier
    assert.equal(pdf.toString('utf8', 0, 4), '%PDF');
  });

});