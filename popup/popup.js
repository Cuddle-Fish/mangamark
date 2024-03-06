const manageButton = document.getElementById('manageButton');
const editButton = document.getElementById('editButton');
const updateButton = document.getElementById('updateButton');
const createButton = document.getElementById('createButton');

const titleElement = document.getElementById('contentTitle');

HTMLTextAreaElement.prototype.resize = function() {
  this.style.height = '';
  this.style.height = this.scrollHeight + 'px';
}

chrome.tabs.query({active: true, currentWindow: true})
  .then((tabs) => {
    const activeTab = tabs[0];
    const domain = new URL(activeTab.url).hostname;
    const title = activeTab.title;
    return getMangamarkFolderId()
      .then((mangamarkId) => getDomainFolderId(mangamarkId, domain))
      .then((domainId) => domainId ? chrome.bookmarks.getSubTree(domainId) : null)
      .then((bookmarkTreeNode) => searchDomainFolder(bookmarkTreeNode, title))
      .then((bookmark) => [bookmark, domain, title]);
  })
  .then(([bookmark, domain, title]) => {
    domainDisplay(domain);
    const numsInTitle = title.match(/\d+/g) || [];
    if (bookmark) {
      console.log('bookmark exists');

      changeActionType('Update Title');
      setDisplayElements(true);

      const bookmarkInfo = bookmarkTitleAndChapter(bookmark.title);

      titleDisplay(bookmarkInfo.title);

      chapterDisplay(numsInTitle, bookmarkInfo.chapter);
    } else {
      console.log('new title');

      changeActionType('Add Title');
      setDisplayElements(false);

      titleDisplay(title);

      chapterDisplay(numsInTitle);
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

function bookmarkTitleAndChapter(bookmarkTitle) {
  const regex = /^(.*?) - Chapter (\d+)$/i;
  const matches = bookmarkTitle.match(regex);
  if (matches) {
    const [, title, chapter] = matches;
    return { title: title.trim(), chapter: parseInt(chapter)};
  } else {
    return null;
  }
}

function changeActionType(displyStr) {
  const actionType = document.getElementById('actionType');
  actionType.textContent = displyStr;
}

function setDisplayElements(update) {
  if (update) {
    updateButton.classList.remove('hidden');

    const oldChapter = document.getElementById('oldChapter');
    const chapterArrow = document.getElementById('chapterArrow');
    oldChapter.classList.remove('hidden');
    chapterArrow.classList.remove('hidden');
  } else {
    createButton.classList.remove('hidden');

    editButton.classList.remove('hidden');
  }
}

function titleDisplay(title) {
  titleElement.value = title.replace(/\n/g, '');
  titleElement.resize();
}

function chapterDisplay(newChapter, oldChapter) {
  if (oldChapter) {
    const oldChapterElement = document.getElementById('oldChapter');
    oldChapterElement.textContent = oldChapter;
  }

  const chapterInput = document.getElementById('chapterInput');

  if (oldChapter && newChapter.length > 0) {
    var defaultVal = newChapter.reduce((prev, curr) => {
      return (Math.abs(curr - oldChapter) < Math.abs(prev - oldChapter) ? curr : prev);
    });
    chapterInput.value = defaultVal;
  } else if (newChapter.length > 0) {
    chapterInput.value = newChapter[0];
  }

  const chapterSelect = document.getElementById('chapterSelect');

  if (newChapter.length > 1) {
    chapterSelect.classList.remove('hidden');
    newChapter.forEach(number => {
      const option = document.createElement('option');
      option.value = number;
      option.textContent = number;
      chapterSelect.appendChild(option);
    });

    chapterSelect.addEventListener('change', () => {
      chapterInput.value = chapterSelect.value;
    });
  }
}

function domainDisplay(domain) {
  const domainElement = document.getElementById('domain');
  domainElement.textContent = domain;
}

manageButton.addEventListener('click', function() {
  chrome.tabs.create({url: chrome.runtime.getURL('manager/manager.html')});
});

titleElement.addEventListener('input', function() {
  this.resize();
});

editButton.addEventListener('click', function() {
  if (titleElement.readOnly) {
    titleElement.readOnly = false;
    titleElement.classList.remove('readOnly');
    titleElement.classList.add('editable');
    editButton.textContent = 'Done';
  } else {
    titleElement.readOnly = true;
    titleElement.value = titleElement.value.replace(/\n/g, '');
    titleElement.resize();
    titleElement.classList.remove('editable');
    titleElement.classList.add('readOnly');
    editButton.textContent = 'Edit';
  }
});