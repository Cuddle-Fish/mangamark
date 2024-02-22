const updateButton = document.getElementById('updateButton');
const createButton = document.getElementById('createButton');
const editButton = document.getElementById('editButton');
const editDoneButton = document.getElementById('editDoneButton');
const getImageButton = document.getElementById('getImageButton');
const doneButton = document.getElementById('doneButton');
const manageButton = document.getElementById('manageButton');

manageButton.addEventListener('click', function() {
  chrome.tabs.create({url: chrome.runtime.getURL('manager/manager.html')});
});

updateButton.addEventListener('click', function() {
  chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
    let activeTab = tabs[0];
    updateTitle(activeTab);
  });
});

createButton.addEventListener('click', function() {
  chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'getCover'}, coverSrc => createTitle(tabs[0], coverSrc));
  });
});

editButton.addEventListener('click', function() {
  let contentTitle = document.getElementById("contentTitle");
  contentTitle.readOnly = false;
  contentTitle.className = "titleEditable";
  editButton.style.display = 'none';
  editDoneButton.style.display = 'inline-block';
});

editDoneButton.addEventListener('click', function() {
  let contentTitle = document.getElementById("contentTitle");
  contentTitle.readOnly = true;
  contentTitle.className = "titleReadOnly";
  editDoneButton.style.display = 'none';
  editButton.style.display = 'inline-block';
});

getImageButton.addEventListener('click', function() {
  chrome.tabs.query({active: true, lastFocusedWindow: true}, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'getImage'});
  });
});

doneButton.addEventListener('click', function() {
  alert("Not yet implemented");
});

function updateTitle(activeTab) {
  let domain = new URL(activeTab.url).hostname;
  let contentTitle = document.getElementById("contentTitle");
  let contentSite = document.getElementById("contentSite");
  contentTitle.value = activeTab.title;
  contentSite.textContent = domain;
}

function createTitle(activeTab, coverSrc) {
  updateTitle(activeTab);
  displayCover(coverSrc);
}

function displayCover(coverSrc) {
  if (coverSrc) {
    const popupImage = document.getElementById('coverImage');
    popupImage.src = coverSrc;
  } else {
    document.getElementById("noImageText").style.display = 'block';
  }
}

function findBookmarkByTitle(domain, title, callback) {
  chrome.bookmarks.search({title: 'Mangamark'}, (results) => {
    if (results.length == 1) {
      const mangamarkFolder = results[0];
      findDomainFolder(mangamarkFolder.id, domain, (domainId) => {
        if (domainId) {
          searchDomainFolder(domainId, title)
            .then(bookmark => {
              if (bookmark) {
                callback(bookmark);
              } else {
                // could not find bookmark
                callback(null);
              }
            })
            .catch(error => {
              console.error("Error searching domain folder:", error);
            });
        } else {
          // domain folder not found or empty
          callback(null);
        }
      });
    } else {
      // Mangamark folder not found or multiple folders
      //TODO should this just be a copy of the onInstalled function in background.js
      callback(null);
    }
  });
}

function findDomainFolder(parentId, domain, callback) {
  chrome.bookmarks.getChildren(parentId, (children) => {
    var domainFolder = children.find((child) => (child.title === domain) && child.children);
    if (domainFolder) {
      callback(domainFolder.id);
    } else {
      callback(null);
    }
  });
}

function searchDomainFolder(domainId, title) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getSubTree(domainId, (bookmarkTreeNode) => {
      var bookmark = null;

      function search(node) {
        if (node.url) {
          var bookmarkTitle = node.title.split(' - ')[0];
          if (title.includes(bookmarkTitle)) {
            bookmark = node;
          }
        } else if (node.children) {
          for (var i = 0; i < node.children.length; i++) {
            search(node.children[i]);
            if (bookmark) {
              break;
            }
          }
        }
      }

      for (var i = 0; i < bookmarkTreeNode.length; i++) {
        search(bookmarkTreeNode[i]);
        if (bookmark) {
          break;
        }
      }

      resolve(bookmark ? bookmark : null);
    });
  });
}