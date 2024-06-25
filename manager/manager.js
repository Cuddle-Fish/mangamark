import { bookmarkRegex, getMangamarkSubTree } from "/externs/bookmark.js";
import "/components/svg/close-icon.js";
import "/components/dropdown-menu/dropdown-menu.js";
import "/components/toggle-menu/toggle-menu.js";
import "/components/option-data/option-data.js";
import "/components/bookmark-card/bookmark-card.js";
import "/components/svg/search-icon.js";

var searchTypingTimer;
const searchBar = document.getElementById('search-input');

var extensionChange = false;
var bookmarkFolders;
var activeNavFolder;

class Folder {
  /**
   * 
   * @param {string} name 
   * @param {Bookmark[]} bookmarks 
   * @param {Folder[]} subFolders 
   */
  constructor(name, bookmarks, subFolders) {
    this.name = name;
    this.bookmarks = bookmarks;
    if (subFolders) {
      this.subFolders = subFolders;      
    } else {
      this.subFolders = [];
    }
  }

  getAllBookmarks() {
    const allBookmarks = [...this.bookmarks];
    this.subFolders.forEach(subFolder => {
      allBookmarks.push(...subFolder.bookmarks);
    });
    return allBookmarks;
  }

  getSubFolderBookmarks(subFolderName='completed') {
    const subFolder = this.subFolders.find(subFolder => subFolder.name === subFolderName);
    if (subFolder) {
      return [...subFolder.bookmarks];
    } else {
      return [];
    }
  }

  searchAllBookmarks(filter) {
    const filteredBookmarks = this.searchMainBookmarks(filter);
    this.subFolders.forEach(subFolder => {
      filteredBookmarks.push(...subFolder.searchAllBookmarks(filter));
    });

    return filteredBookmarks;
  }

  searchMainBookmarks(filter) {
    const filteredBookmarks = [];
    const searhFilter = filter.toLowerCase();
    this.bookmarks.forEach(bookmark => {
      if (bookmark.title.toLowerCase().includes(searhFilter)) {
        filteredBookmarks.push(bookmark);
      }
    });

    return filteredBookmarks;
  }

  searchSubFolderBookmarks(filter, subFolderName='completed') {
    const subFolder = this.subFolders.find(subFolder => subFolder.name === subFolderName);
    if (subFolder) {
      return subFolder.searchMainBookmarks(filter);
    } else {
      return [];
    }
  }

  navElement() {
    const input = document.createElement('input');
    input.type = 'radio';
    input.id = 'nav' + this.name;
    input.name = 'folderNav';
    input.value = this.name;

    const label = document.createElement('label');
    label.htmlFor = 'nav' + this.name;

    const circleText = document.createElement('div');
    var circleString = this.name.substring(0, 4);
    circleString = circleString.charAt(0).toUpperCase() + circleString.slice(1);
    circleText.textContent = circleString;
    circleText.classList.add('circleText');

    const labelText = document.createElement('div');
    labelText.textContent = this.name;
    labelText.classList.add('labelText');

    label.appendChild(circleText);
    label.appendChild(labelText);
    
    return {input, label};
  }
}

class Bookmark {
  /**
   * 
   * @param {string} title The bookmark contents title
   * @param {string} chapter The chapter number of the bookmark
   * @param {string} url The url used for navigation
   * @param {number} dateCreated The date the bookmark was created
   * @param {string} readingStatus Status associated with bookmark
   * @param {Array.<string>} tags List of tags associated with bookmark
   */
  constructor(title, chapter, url, dateCreated, readingStatus, tags) {
    this.title = title;
    this.chapter = chapter;
    this.url = url;
    this.date = dateCreated
    this.readingStatus = readingStatus || null;
    this.tags = tags || [];
  }

  bookmarkElement() {
    const bookmarkCard = document.createElement('bookmark-card');
    bookmarkCard.initialize(
      this.title,
      this.chapter,
      this.url,
      this.date,
      this.readingStatus,
      this.tags
    );

    return bookmarkCard;
  }
}

addEventListener('DOMContentLoaded', () => {
  setOptions()
  .then(() => getMarks())
});

function setOptions() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['managerType', 'managerOrder'])
    .then((result) => {
      const { managerType, managerOrder } = result;

      if (!managerType || !managerOrder) {
        reject(new Error('Type or order for manager page not found in storage'));
        return;
      }

      document.getElementById('toggle-reading-type').selected = managerType;
      document.getElementById('order-dropdown').selected = managerOrder;
      resolve();
    });
  });
}

function getMarks() {
  getMangamarkSubTree()
  .then((mangamarkTree) => getFolders(mangamarkTree[0].children))
  .then((folders) => {
    bookmarkFolders = folders;
    if (
      !activeNavFolder || 
      Array.isArray(activeNavFolder) ||
      !folders.some(currentFolder => currentFolder.name === activeNavFolder.name)
    ) {
      navAll.checked = true;
      activeNavFolder = folders;
    } else {
      activeNavFolder = folders.find(currentFolder => currentFolder.name === activeNavFolder.name);
    }
    return chrome.storage.sync.get(['managerType', 'managerOrder'])
      .then((result) => {
        const { managerType, managerOrder } = result;
        return {folders, managerType, managerOrder};
      });
  })
  .then(({folders, managerType, managerOrder}) => {
    displayBookmarks(activeNavFolder, managerType, managerOrder)
    return folders;
  })
  .then((folders) => populateFolderNav(folders));
}

function getFolders(tree) {
  const folders = [];
  tree.forEach(node => {
    if (node.children) {
      const {folders: subFolders, bookmarks: bookmarks} = getBookmarks(node.children);
      const folder = new Folder(node.title, bookmarks, subFolders);
      folders.push(folder);
    }
  });
  return folders;
}

function getBookmarks(tree, getSubFolders=true, subFolderName) {
  const bookmarks = [];
  const folders = []
  tree.forEach(node => {
    if (node.url) {
      let bookmark;
      if (subFolderName) {
        bookmark = createBookmarkObject(node.title, node.url, node.dateAdded, subFolderName);
      } else {
        bookmark = createBookmarkObject(node.title, node.url, node.dateAdded);
      }
      if (bookmark) {
        bookmarks.push(bookmark);
      } else {
        console.log(`Error, bookmark: '${node.title}' has an invalid title.`);
        //TODO display somewhere on page
      }
    } else if (node.children && getSubFolders) {
      const {bookmarks: folderBookmarks} = getBookmarks(node.children, false, node.title);
      const folder = new Folder(node.title, folderBookmarks);
      folders.push(folder);
    }
  });
  return {folders: folders, bookmarks: bookmarks};
}

function createBookmarkObject(bookmarkTitle, url, dateAdded, subFolderName) {
  const matches = bookmarkTitle.match(bookmarkRegex());
  if (!matches) {
    return null;
  } else {
    const title = matches[1];
    const chapter = matches[2];
    const tags = matches[3] ? matches[3].split(',') : [];
    const readingStatus = subFolderName || 'reading';
    return new Bookmark(title, chapter, url, dateAdded, readingStatus, tags);
  }
}

function displayBookmarks(folders, type='all', sortBy='Recent') {
  var bookmarks;
  if (!Array.isArray(folders)) {
    folders = [folders];
  }
  switch (type) {
    case 'all':
      bookmarks = compileAllBookmarks(folders);
      break;
    case 'reading':
      bookmarks = compileMainBookmarks(folders);
      break;
    case 'completed':
      bookmarks = compileCompletedBookmarks(folders);
      break;
    case 'search':
      bookmarks = folders;
      break;
    default:
      throw new Error('Invalid display type');
  }
  bookmarks = sortBookmarks(bookmarks, sortBy);
  console.log(bookmarks);
  const bookmarkDisplay = bookmarks.map(bookmark => bookmark.bookmarkElement());
  const bookmarkList = document.getElementById('bookmarkList');
  bookmarkList.replaceChildren(...bookmarkDisplay);
}

function compileAllBookmarks(folders) {
  const allBookmarks = [];
  folders.forEach(folder => {
    allBookmarks.push(...folder.getAllBookmarks());
  });
  return allBookmarks;
}

function compileMainBookmarks(folders) {
  const mainBookmarks = [];
  folders.forEach(folder => {
    mainBookmarks.push(...folder.bookmarks);
  });
  return mainBookmarks;
}

function compileCompletedBookmarks(folders) {
  const completedBookmarks = [];
  folders.forEach(folder => {
    completedBookmarks.push(...folder.getSubFolderBookmarks());
  });
  return completedBookmarks;
}

function sortBookmarks(bookmarks, sortBy) {
  return bookmarks.toSorted((a, b) => {
    switch (sortBy) {
      case 'Recent':
        return b.date - a.date;
      case 'Oldest':
        return a.date - b.date;
      case 'Az':
        return a.title.localeCompare(b.title);
      case 'Za':
        return b.title.localeCompare(a.title);
      default:
        throw new Error('Invalid sorting criteria');
    }
  });
}

document.getElementById('toggle-reading-type')
.addEventListener('toggleMenuChange', (event) => {
  chrome.storage.sync.set({'managerType': event.detail})
  .then(() => {
    if (searchBar.value === '') {
      chrome.storage.sync.get('managerOrder')
      .then((result) => displayBookmarks(activeNavFolder, event.detail, result.managerOrder));
    } else {
      performSearch();
    }
  });
});

document.getElementById('order-dropdown')
.addEventListener('DropdownChange', (event) => {
  chrome.storage.sync.set({'managerOrder': event.detail})
  .then(() => {
    if (searchBar.value === '') {
      chrome.storage.sync.get('managerType')
      .then((result) => displayBookmarks(activeNavFolder, result.managerType, event.detail));   
    } else {
      performSearch();
    }
  });
});

const navAll = document.getElementById('navAll');
navAll.addEventListener('change', () => {
  console.log('Nav: all');
  chrome.storage.sync.get(['managerType', 'managerOrder'])
  .then((result) => {
    if (searchBar.value !== '') {
      searchBar.value = '';
      setSearchIcon();
    }
    const { managerType, managerOrder } = result;
    activeNavFolder = bookmarkFolders;
    displayBookmarks(bookmarkFolders, managerType, managerOrder);
  });
});

function populateFolderNav(folders) {
  const navFolders = document.getElementById('navFolders');
  clearNavFolders(navFolders.children);
  folders.forEach(folder => {
    const {input, label} = folder.navElement();
    if (folder.name === activeNavFolder.name) {
      console.log('names match');
      input.checked = true;
    }
    input.addEventListener('change', navListener);
    navFolders.appendChild(input);
    navFolders.appendChild(label);
  });
}

function clearNavFolders(folderChildren) {
  if (!folderChildren || folderChildren.length === 0) {
    return;
  }
  for (var i = folderChildren.length - 1; i >= 0; i--) {
    const child = folderChildren[i];
    child.removeEventListener('change', navListener);
    child.remove();
  }
}

function navListener() {
  if (searchBar.value !== '') {
    searchBar.value = '';
    setSearchIcon();
  }
  const value = this.value;
  console.log(`Nav: ${this.value}`);
  chrome.storage.sync.get(['managerType', 'managerOrder'])
  .then((result) => {
    const { managerType, managerOrder } = result;
    const folder = bookmarkFolders.find(currentFolder => currentFolder.name === value);
    activeNavFolder = folder;
    displayBookmarks(folder, managerType, managerOrder);
  });
}


searchBar.addEventListener('keydown', () => {
  clearTimeout(searchTypingTimer);

  setTimeout(() => {
    searchBar.value !== '' ? setSearchIcon(false) : setSearchIcon();
  }, 0);

  searchTypingTimer = setTimeout(performSearch, 400);
});

document.getElementById('clear-search-button')
.addEventListener('click', () => {
  searchBar.value = '';
  clearSearch();
  setSearchIcon();
});

function setSearchIcon(searchCleared=true) {
  const clearSearchButton = document.getElementById('clear-search-button');
  const searchLabel = document.getElementById('search-label');
  if (searchCleared) {
    clearSearchButton.classList.add('hidden');
    searchLabel.classList.remove('hidden');        
  } else {
    searchLabel.classList.add('hidden');
    clearSearchButton.classList.remove('hidden');   
  }
}

function performSearch() {
  console.log(`search value: '${searchBar.value}'`);
  if (searchBar.value === '') {
    clearSearch();
  } else {
    const navFolders = Array.from(document.getElementsByName('folderNav'));
    const selectedNav = navFolders.find(input => input.checked);
    if (selectedNav) {
      selectedNav.checked = false;      
    }

    const searchResults = [];
    chrome.storage.sync.get('managerType')
    .then((result) => {
      switch (result.managerType) {
        case 'all':
          bookmarkFolders.forEach(folder => {
            searchResults.push(...folder.searchAllBookmarks(searchBar.value));
          });
          break;
        case 'reading':
          bookmarkFolders.forEach(folder => {
            searchResults.push(...folder.searchMainBookmarks(searchBar.value));
          });
          break;
        case 'completed':
          bookmarkFolders.forEach(folder => {
            searchResults.push(...folder.searchSubFolderBookmarks(searchBar.value));
          });
          break;
        default:
          throw new Error('Invalid display type');
      }
    });
    chrome.storage.sync.get('managerOrder')
    .then((result) => displayBookmarks(searchResults, 'search', result.managerOrder));
  }
}

function clearSearch() {
  chrome.storage.sync.get(['managerType', 'managerOrder'])
  .then((result) => {
    const { managerType, managerOrder } = result;
    displayBookmarks(activeNavFolder, managerType, managerOrder);
    if (Array.isArray(activeNavFolder)) {
      navAll.checked = true;
    } else {
      const navFolders = Array.from(document.getElementsByName('folderNav'));
      const matchingInput = navFolders.find(input => input.value === activeNavFolder.name);
      matchingInput.checked = true;
    }
  });
}

chrome.bookmarks.onChanged.addListener(handleBookmarkChange);
chrome.bookmarks.onChildrenReordered.addListener(handleBookmarkChange);
chrome.bookmarks.onCreated.addListener(handleBookmarkChange);
chrome.bookmarks.onMoved.addListener(handleBookmarkChange);
chrome.bookmarks.onRemoved.addListener(handleBookmarkChange);

function handleBookmarkChange() {
  console.log(`bookmark changed extensionChange = ${extensionChange}`);
  if (!extensionChange) {
    getMarks();
  }
  extensionChange = false;
}