chrome.runtime.onInstalled.addListener(() => {
  checkSettings();

  chrome.bookmarks.search({title: 'Mangamark'}, (result) => {
    if (result.length == 1) {
      console.log(result[0]);
    } else if (result.length > 1) {
      //TODO alert user to problem and needed action, do not allow further use of extension
      console.log('Error, multiple bookmarks titled "Mangamark" found.');
    } else {
      chrome.bookmarks.create({title: 'Mangamark'}, (folder) => {
        const url = chrome.runtime.getURL('manager/manager.html');
        chrome.bookmarks.create({parentId: folder.id, title: 'Manage Mangamarks', url: url});
      });
      console.log('No "Mangamark bookmark found, bookmark created.');
    }
  });
});

function checkSettings() {
  chrome.storage.sync.get(['managerType', 'managerOrder'])
  .then((result) => {
    const { managerType, managerOrder } = result;
    if (!managerType) {
      chrome.storage.sync.set({'managerType': 'reading'});
      console.log('setting type');
    }
    if (!managerOrder) {
      chrome.storage.sync.set({'managerOrder': 'Recent'});
      console.log('setting order')
    }
  });
}