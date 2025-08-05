import { setStatusFilter, setDisplayOrder, getDisplaySettings } from "/externs/settings.js";
import {
  bookmarkRegex,
  hasRootFolderId,
  getExtensionSubtree,
  registerBookmarkListener
} from "/externs/bookmark.js";

import "/manager/sideNavigation/sideNavigation.js"

import "/components/svg-icon/svg-icon.js";
import "/components/toggle-menu/toggle-menu.js";
import "/components/dropdown-menu/dropdown-menu.js";
import "/components/tag-input/tag-input.js";
import "/components/themed-button/themed-button.js"
import "/components/bookmark-card/bookmark-card.js";

class Folder {
  /**
   * 
   * @param {string} name Folder name
   * @param {Bookmark[]} bookmarks bookmarks directly contained in folder
   * @param {Folder[]} subfolders subfolder within this folder
   */
  constructor(name, bookmarks, subfolders) {
    this.name = name;
    this.bookmarks = bookmarks;
    this.subfolders = subfolders ? subfolders : [];
  }

  /**
   * Get all bookmarks in folder and subfolders, optionally filter by tags and and/or title query tokens
   * 
   * @param {Object} filters Filtering options
   * @param {string[]} filters.tags Tags to filter by
   * @param {string[]} filters.queryTokens Tokenized search query to filter by
   * @returns {Bookmark[]} Filtered bookmarks
   */
  getAllBookmarks(filters = {}) {
    const { tags = [], queryTokens = [] } = filters;
    const allBookmarks = [...this.bookmarks];
    this.subfolders.forEach(subfolder => {
      allBookmarks.push(...subfolder.bookmarks);
    });
    return (tags.length || queryTokens.length)
      ? this.filterBookmarks(allBookmarks, tags, queryTokens)
      : allBookmarks;
  }

  /**
   * Get direct bookmarks in folder, optionally filter by tags and and/or title query tokens
   * 
   * @param {Object} filters Filtering options
   * @param {string[]} filters.tags Tags to filter by
   * @param {string[]} filters.queryTokens Tokenized search query to filter by
   * @returns {Bookmark[]} Filtered bookmarks
   */
  getMainBookmarks(filters = {}) {
    const { tags = [], queryTokens = [] } = filters;
    const mainBookmarks = [...this.bookmarks];
    return (tags.length || queryTokens.length)
      ? this.filterBookmarks(mainBookmarks, tags, queryTokens)
      : mainBookmarks;
  }

  /**
   * Get bookmarks in specified subfolder, optionally filter by tags and and/or title query tokens
   * 
   * @param {string} subfolderName Name of subfolder
   * @param {Object} filters Filtering options
   * @param {string[]} filters.tags Tags to filter by
   * @param {string[]} filters.queryTokens Tokenized search query to filter by
   * @returns {Bookmark[]} Filtered bookmarks
   */
  getSubFolderBookmarks(subfolderName, filters = {}) {
    const { tags = [], queryTokens = [] } = filters;
    const subfolder = this.subfolders.find(subfolder => subfolder.name === subfolderName);
    if (subfolder) {
      const subfolderBookmarks = [...subfolder.bookmarks];
      return (tags.length || queryTokens.length)
        ? this.filterBookmarks(subfolderBookmarks, tags, queryTokens)
        : subfolderBookmarks;
    } else {
      return [];
    }
  }

  /**
   * Filter bookmarks by tags and/or title query tokens
   * 
   * @param {Bookmark[]} bookmarks Bookmarks to filter
   * @param {string[]} tags Tags to filter by
   * @param {string[]} queryTokens Tokenized search query to filter by
   * @returns {Bookmark[]} Filtered bookmarks
   */
  filterBookmarks(bookmarks, tags, queryTokens) {
    return bookmarks.filter(bookmark => {
      const matchesTags = tags.length ? bookmark.hasTags(tags) : true;
      const matchesTokens = queryTokens.length ? bookmark.matchesTokens(queryTokens) : true;
      return matchesTags && matchesTokens;
    });
  }

  moveBookmark(title, subFolderName) {
    const validSubfolders = ['reading', 'Completed', 'Plan to Read', 'Re-Reading', 'On Hold'];
    if (!validSubfolders.includes(subFolderName)) {
      console.error(`Invalid subfolder name '${subFolderName}'`);
      return;
    }

    const findAndRemoveBookmark = (folder) => {
      const index = folder.bookmarks.findIndex(bookmark => bookmark.title === title);
      if (index !== -1) {
        const bookmark = folder.bookmarks[index];
        folder.bookmarks.splice(index, 1);
        return bookmark;
      } else {
        return null;        
      }
    };

    let bookmark = findAndRemoveBookmark(this);
    if (!bookmark) {
      for (const subfolder of this.subfolders) {
        bookmark = findAndRemoveBookmark(subfolder);
        if (bookmark) break;
      }
    }

    if (!bookmark) {
      console.error(`Could not find bookmark '${title}' in folder '${this.name}'`);
      return;
    }

    if (subFolderName === 'reading') {
      this.bookmarks.push(bookmark);
    } else {
      let subfolder = this.subfolders.find(folder => folder.name === subFolderName);
      if (!subfolder) {
        subfolder = new Folder(subFolderName, []);
        this.subfolders.push(subfolder);
      }
      subfolder.bookmarks.push(bookmark);
    }
    bookmark.readingStatus = subFolderName;
  }
}

class Bookmark {
  /**
   * 
   * @param {string} title Bookmark contents title
   * @param {string} chapter Chapter number of the bookmark
   * @param {string} url Url for bookmark
   * @param {number} dateCreated Date bookmark was created
   * @param {string} readingStatus Reading Status associated with bookmark
   * @param {string[]} tags Tags associated with bookmark
   * @param {string} folderName Name of main containing folder
   */
  constructor(title, chapter, url, dateCreated, readingStatus, tags, bookmarkId, folderName) {
    this.title = title;
    this.chapter = chapter;
    this.url = url;
    this.date = dateCreated
    this.readingStatus = readingStatus || null;
    this.tags = tags || [];
    this.domain = new URL(url).hostname;
    if (this.domain.startsWith('www.')) {
      this.domain = this.domain.substring(4);
    }
    this.bookmarkId = bookmarkId;
    this.folder = folderName;
  }

  /**
   * @param {string[]} filterTags Name(s) of tags to check
   * @returns boolean indicating whether bookmark has the specifed tags
   */
  hasTags(filterTags) {
    return filterTags.every(tag => this.tags.includes(tag));
  }

  /**
   * @param {string[]} queryTokens tokens to match against bookmark title
   * @returns boolean indicating whether bookmark title has all query tokens
   */
  matchesTokens(queryTokens) {
    const normalizedTitle = this.title.toLowerCase();
    return queryTokens.every(token => normalizedTitle.includes(token));
  }

  /**
   * Create an HTML element to represent this bookmark
   * 
   * @returns {HTMLElement} Instance of the `bookmark-card` custom element, with this bookmarks properties
   */
  bookmarkElement() {
    const bookmarkCard = document.createElement('bookmark-card');
    bookmarkCard.initialize(
      this.title,
      this.chapter,
      this.url,
      this.date,
      this.readingStatus,
      this.tags,
      this.domain,
      this.bookmarkId,
      this.folder
    );

    return bookmarkCard;
  }
}

addEventListener('DOMContentLoaded', () => {
  setupSavedSettings();
  setupEventListeners();
  getMarks().then(() => displayBookmarks());
});

function setupSavedSettings() {
  getDisplaySettings()
    .then((settings) => {
      document.getElementById('toggle-status-display').selected = settings.status;
      document.getElementById('order-dropdown').selected = settings.order;
    });
}

function setupEventListeners() {
  document.getElementById('open-nav').addEventListener('click', openSideNav);
  document.getElementById('side-nav').addEventListener('navClosed', showOpenNavButton);
  document.getElementById('side-nav').addEventListener('navChange', navChangeHandler);

  document.addEventListener('scroll', handleScroll);

  document.getElementById('search-input').addEventListener('keyup', searchHandler);
  document.getElementById('clear-search-button').addEventListener('click', clearSearchHandler);

  document.getElementById('toggle-status-display').addEventListener('toggleMenuChange', readingStatusHandler);
  document.getElementById('order-dropdown').addEventListener('DropdownChange', displayOrderHandler);

  document.getElementById('filter-tags-input').addEventListener('tagChange', tagFilterHandler);
  document.getElementById('toggle-filter-input').addEventListener('click', toggleFilterHandler);
  document.getElementById('remove-filters').addEventListener('click', removeTagFiltersHandler);

  document.addEventListener('readingStatusChanged', readingStatusChangeHandler);
  document.addEventListener('tagsChanged', tagsChangeHandler);
  document.addEventListener('titleChanged', titleChangeHandler);
}

function openSideNav() {
  document.getElementById('side-nav').openNav();
  const openButton = document.getElementById('open-nav');
  openButton.style.visibility = 'hidden';
}

function showOpenNavButton() {
  const openButton = document.getElementById('open-nav');
  openButton.style.visibility = 'visible';
}

function navChangeHandler(event) {
  const searchInput = document.getElementById('search-input');
  const searchValue = searchInput.value;
  if (searchValue !== '') {
    searchInput.value = '';
    setSearchIcon();
  }

  displayBookmarks();
}

function handleScroll(event) {
  const searchContainer = document.getElementsByClassName('search-container')[0];
  if (window.scrollY === 0) {
    searchContainer.classList.remove('scrolled');
  } else {
    searchContainer.classList.add('scrolled');
  }
}

let _searchTypingTimer;

function searchHandler(event) {
  clearTimeout(_searchTypingTimer);
  const searchValue = event.target.value;
  searchValue === '' ? setSearchIcon() : setSearchIcon(false);
  _searchTypingTimer = setTimeout(filterBySearch, 400);
}

function clearSearchHandler(event) {
  const searchInput = document.getElementById('search-input');
  searchInput.value = '';
  setSearchIcon();
  filterBySearch();
}

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

function filterBySearch() {
  const searchTokens = getSearchTokens();
  const sideNav = document.getElementById('side-nav');
  searchTokens.length ? sideNav.hideSelected() : sideNav.showSelected();
  displayBookmarks();
}

function getSearchTokens() {
  const searchValue = document.getElementById('search-input').value.trim();
  if (searchValue === '') {
    return [];
  } else {
    return searchValue.toLowerCase().split(/\s+/);
  }
}

async function readingStatusHandler(event) {
  try {
    await setStatusFilter(event.detail);
    displayBookmarks();    
  } catch (error) {
    console.error(`Error changing reading status display: ${error}`);
  }
}

async function displayOrderHandler(event) {
  try {
    await setDisplayOrder(event.detail);
    displayBookmarks();
  } catch (error) {
    console.error(`Error changing bookmark display order: ${error}`);
  }
}

function tagFilterHandler(event) {
  const removeFilters = document.getElementById('remove-filters');
  if (event.target.getTags().length) {
    removeFilters.disabled = false;
  } else {
    removeFilters.disabled = true;
  }
  displayBookmarks();
}

function toggleFilterHandler(event) {
  const button = event.currentTarget;
  button.active = !button.active;
  
  const arrow = document.getElementById('toggle-filter-arrow');
  arrow.type = button.active ? 'expand-less' : 'expand-more';

  const tagsInput = document.getElementById('filter-tags-input');
  tagsInput.inputHidden = !tagsInput.inputHidden;
  tagsInput.clearInput();
}

function removeTagFiltersHandler(event) {
  const tagsInput = document.getElementById('filter-tags-input');
  tagsInput.replaceAllTags([]);
  event.target.disabled = true;
  displayBookmarks();
}

function readingStatusChangeHandler(event) {
  const {folder, title, newReadingStatus} = event.detail;
  const bookmarkFolder = _bookmarkFolders.find(currentFolder => currentFolder.name === folder);
  if (!bookmarkFolder) {
    console.error(`Could not find folder '${folder}'`);
    return;
  }
  bookmarkFolder.moveBookmark(title, newReadingStatus);
  const selectedStatus = document.getElementById('toggle-status-display').selected;
  if (selectedStatus !== 'all' && selectedStatus !== newReadingStatus) {
    event.target.remove();
  }
}

function tagsChangeHandler(event) {
  const {folder, readingStatus, title, newTags} = event.detail;
  const bookmark = findBookmark(folder, readingStatus, title);
  if (!bookmark) return;

  bookmark.tags = newTags;
  const filterTags = document.getElementById('filter-tags-input').getTags();
  if (!bookmark.hasTags(filterTags)) {
    event.target.remove();
  }
}

function titleChangeHandler(event) {
  const {folder, readingStatus, oldTitle, newTitle} = event.detail;
  const bookmark = findBookmark(folder, readingStatus, oldTitle);
  if (!bookmark) return;

  bookmark.title = newTitle;
  const searchTokens = getSearchTokens();
  if (!bookmark.matchesTokens(searchTokens)) {
    event.target.remove();
  }
}

function findBookmark(folder, readingStatus, title) {
  const bookmarkFolder = _bookmarkFolders.find(currentFolder => currentFolder.name === folder);
  if (!bookmarkFolder) {
    console.error(`Could not find folder '${folder}'`);
    return null;
  }
  let bookmark;
  if (readingStatus === 'reading') {
    bookmark = bookmarkFolder.bookmarks.find(currentBookmark => currentBookmark.title === title);
  } else {
    const subfolder = bookmarkFolder.subfolders.find(currentFolder => currentFolder.name === readingStatus);
    bookmark = subfolder?.bookmarks.find(currentBookmark => currentBookmark.title === title);
  }

  if (!bookmark) {
    console.error(`Could not find bookmark with title '${title}' in folder '${folder}'`);
    return null;
  }

  return bookmark;
}

let _bookmarkFolders;

async function getMarks() {
  const invalidContainer = document.getElementById('invalid-container');
  invalidContainer.classList.add('hidden');
  const invalidList = document.getElementById('invalid-list');
  invalidList.replaceChildren();

  const hasRoot = await hasRootFolderId();
  if (hasRoot) {
    const tagsInput = document.getElementById('filter-tags-input');
    tagsInput.populateDatalist();
  }
  const extensionTree = hasRoot ? await getExtensionSubtree() : [];
  _bookmarkFolders = createFolders(extensionTree);
}

function createFolders(tree) {
  const folders = [];
  tree.forEach(node => {
    if (node.children) {
      const {folders: subFolders, bookmarks: bookmarks} = getBookmarks(node.children, node.title);
      const folder = new Folder(node.title, bookmarks, subFolders);
      folders.push(folder);
    }
  });
  return folders;
}

function getBookmarks(tree, mainFolderName, subFolderName) {
  const bookmarks = [];
  const folders = [];
  tree.forEach(node => {
    if (node.url) {
      const bookmark = createBookmark(node.title, node.url, node.id, node.dateAdded, mainFolderName, subFolderName);

      if (bookmark) {
        bookmarks.push(bookmark);
      } else {
        console.log(`Warning, bookmark: "${node.title}" has an invalid title`);
        const li = document.createElement('li');
        li.textContent = node.title;
        const invalidList = document.getElementById('invalid-list');
        invalidList.appendChild(li);
        const invalidContainer = document.getElementById('invalid-container');
        invalidContainer.classList.remove('hidden');
      }
    } else if (node.children  && !subFolderName) {
      const subFolderBookmarks = getBookmarks(node.children, mainFolderName, node.title).bookmarks;
      const folder = new Folder(node.title, subFolderBookmarks);
      folders.push(folder);
    }
  });
  return {folders: folders, bookmarks: bookmarks};
}

function createBookmark(bookmarkTitle, url, bookmarkId, dateAdded, folderName, subFolderName) {
  const matches = bookmarkTitle.match(bookmarkRegex());
  if (!matches) {
    return null;
  } else {
    const title = matches[1];
    const chapter = matches[2];
    const tags = matches[3] ? matches[3].split(',') : [];
    const readingStatus = subFolderName || 'reading';
    return new Bookmark(title, chapter, url, dateAdded, readingStatus, tags, bookmarkId, folderName);
  }
}

async function displayBookmarks() {
  const folderName = document.getElementById('side-nav').selected;
  const searchTokens = getSearchTokens();
  const { order, status } = await getDisplaySettings();
  const tags = document.getElementById('filter-tags-input').getTags();

  const folders = searchTokens.length || !folderName 
    ? [..._bookmarkFolders] 
    : [_bookmarkFolders.find((folder) => folder.name === folderName)];

  let bookmarks;
  if (status === 'all') {
    bookmarks = filterAllBookmarks(folders, searchTokens, tags);
  } else if (status === 'reading') {
    bookmarks = filterMainBookmarks(folders, searchTokens, tags);
  } else {
    bookmarks = filterSubfolderBookmarks(folders, status, searchTokens, tags);
  }

  bookmarks = sortBookmarks(bookmarks, order);
  const bookmarkDisplay = bookmarks.map(bookmark => bookmark.bookmarkElement());
  const bookmarkList = document.getElementById('bookmark-list');
  bookmarkList.replaceChildren(...bookmarkDisplay);
}

function filterAllBookmarks(folders, searchTokens, tags) {
  const bookmarks = [];
  folders.forEach(folder => {
    bookmarks.push(...folder.getAllBookmarks({ tags: tags, queryTokens: searchTokens }));
  });
  return bookmarks;
}

function filterMainBookmarks(folders, searchTokens, tags) {
  const bookmarks = [];
  folders.forEach(folder => {
    bookmarks.push(...folder.getMainBookmarks({ tags: tags, queryTokens: searchTokens }));
  });
  return bookmarks;
}

function filterSubfolderBookmarks(folders, subFolderName, searchTokens, tags) {
  const bookmarks = [];
  folders.forEach(folder => {
    bookmarks.push(...folder.getSubFolderBookmarks(subFolderName, { tags: tags, queryTokens: searchTokens }));
  });
  return bookmarks;
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

registerBookmarkListener(updatePage);

async function updatePage() {
  const sideNav = document.getElementById('side-nav');
  await sideNav.renderGroups();
  const searchTokens = getSearchTokens();
  if (!searchTokens.length) {
    sideNav.showSelected();
  }
  await getMarks();
  displayBookmarks();
}