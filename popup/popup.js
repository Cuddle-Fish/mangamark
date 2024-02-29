const updateButton = document.getElementById('updateButton');
const createButton = document.getElementById('createButton');
const editButton = document.getElementById('editButton');
const editDoneButton = document.getElementById('editDoneButton');
const getImageButton = document.getElementById('getImageButton');
const doneButton = document.getElementById('doneButton');
const manageButton = document.getElementById('manageButton');

chrome.tabs.query({active: true, currentWindow: true})
  .then((tabs) => {
    const activeTab = tabs[0];
    const domain = new URL(activeTab.url).hostname;
    const title = activeTab.title;
    return getMangamarkFolderId()
      .then((mangamarkId) => getDomainFolderId(mangamarkId, domain))
      .then((domainId) => domainId ? chrome.bookmarks.getSubTree(domainId) : null)
      .then((bookmarkTreeNode) => searchDomainFolder(bookmarkTreeNode, title))
  })
  .then((bookmark) => {
    if (bookmark) {
      console.log('bookmark exists');
    } else {
      console.log('new title');
    }
  })
  .catch((err) => console.error(err));


function getMangamarkFolderId() {
  return chrome.bookmarks.search({title: 'Mangamark'})
    .then((results) => {
      if (results.length == 1) {
        const mangamarkFolder = results[0];
        return mangamarkFolder.id;
      }
      else {
        //TODO create and return created id???
        return null;
      }
    });
}

function getDomainFolderId(parentId, domain) {
  return chrome.bookmarks.getChildren(parentId)
    .then((children) => {
      var domainFolder = children.find((child) => child.title === domain);
      if (domainFolder) {
        return domainFolder.id;
      } else {
        //TODO create and return id of created folder???
        return null;
      }
    });
}

function searchDomainFolder(bookmarkTreeNode, title) {
  return new Promise((resolve) => {
    if (!bookmarkTreeNode) {
      resolve(null);
    }

    var bookmark = null;

      function searchTree(tree) {
        for (var i = 0; i < tree.length; i++) {
          var node = tree[i];
          if (node.url) {
            var bookmarkTitle = node.title.split(' - ')[0];
            if (title.includes(bookmarkTitle)) {
              bookmark = node;
            }
          } else if (node.children) {
            searchTree(node.children)
          }
          if (bookmark) {
            break;
          }
        }
      }

      searchTree(bookmarkTreeNode);

      if (bookmark) {
        resolve(bookmark);
      } else {
        resolve(null);
      }
  });
}

function displayAddTitle(){
  changeActionDisplay("Add Title");
}

function displayUpdateTitle(siteTitle, bookmark) {
  changeActionDisplay("Update Title");
  const bookmarkInfo = bookmark.title.split(' - ');
  const bookmarkTitle = bookmarkInfo[0];
  const bookmarkChapter = parseInt(bookmarkInfo[1].trim().split(' ')[1]);

  const removeTitle = siteTitle.replace(bookmarkTitle, '');
  const siteChapterNum = removeTitle.match(/\d+/)[0];
}

function changeActionDisplay(displyStr) {
  const action = document.getElementById('action');
  action.textContent = displyStr;
}

manageButton.addEventListener('click', function() {
  chrome.tabs.create({url: chrome.runtime.getURL('manager/manager.html')});
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

function displayCover(coverSrc) {
  if (coverSrc) {
    const popupImage = document.getElementById('coverImage');
    popupImage.src = coverSrc;
  } else {
    document.getElementById("noImageText").style.display = 'block';
  }
}