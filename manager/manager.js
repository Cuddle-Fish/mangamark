import { bookmarkRegex, getExtensionSubtree, hasRootFolderId, registerBookmarkListener } from "/externs/bookmark.js";
import { setStatusFilter, setDisplayOrder, getDisplaySettings } from "/externs/settings.js";

import "/manager/sideNavigation/sideNavigation.js"

import "/components/svg-icon/svg-icon.js";
import "/components/toggle-menu/toggle-menu.js";
import "/components/dropdown-menu/dropdown-menu.js";
import "/components/tag-input/tag-input.js";
import "/components/themed-button/themed-button.js"
import "/components/bookmark-card/bookmark-card.js";

let _bookmarkFolders;
let _displayedCards;
let _typingtimer;
let _navSelection = '';

class Folder {
  /**
   * @param {string} name folder name
   * @param {Bookmark[]} bookmarks bookmarks contained in folder
   */
  constructor(name, bookmarks) {
    this.name = name;
    this.bookmarks = bookmarks || [];
  }

  getBookmarks(filters = {}) {
    const { tags = [], queryTokens = [] } = filters;
    return (tags.length || queryTokens.length)
      ? this.#filterBookmarks(tags, queryTokens)
      : [...this.bookmarks];
  }

  #filterBookmarks(tags, queryTokens) {
    const filteredBookmarks = [...this.bookmarks];
    return filteredBookmarks.filter(bookmark => {
      const matchesTags = tags.length ? bookmark.hasTags(tags) : true;
      const matchesTokens = queryTokens.length ? bookmark.hasTitle(queryTokens) : true;
      return matchesTags && matchesTokens;
    });
  }
}

class NamedFolder extends Folder {
  static VALID_SUBFOLDERS = ['Completed', 'Plan to Read', 'Re-Reading', 'On Hold'];

  /**
   * @param {string} name folder name
   * @param {Bookmark[]} bookmarks bookmarks contained in folder
   * @param {string} id unique identifier for folder
   * @param {Folder[]} subfolders folders associated with this folder
   */
  constructor(name, bookmarks, id, subfolders) {
    super(name, bookmarks)
    this.id = id;
    this.subfolders = subfolders ? subfolders : [];
  }

  getCards(source, filters = {}) {
    if (source === 'reading') {
      return this.#getReadingCards(filters);
    } else if (source === 'all') {
      const readingCards = this.#getReadingCards(filters);
      const subfolderCards = this.subfolders.flatMap(subfolder =>
        this.#getSubfolderCards(subfolder, filters)
      );
      return [...readingCards, ...subfolderCards];
    } else {
      const subfolder = this.subfolders.find(folder => folder.name === source);
      return subfolder ? this.#getSubfolderCards(subfolder, filters) : [];
    }
  }

  #getReadingCards(filters = {}) {
    const filteredBookmarks = this.getBookmarks(filters);
    return filteredBookmarks.map(bookmark => 
      bookmark.getCard(this.id, this.name)
    );
  }

  #getSubfolderCards(subfolder, filters = {}) {
    const filteredBookmarks = subfolder.getBookmarks(filters);
    return filteredBookmarks.map(bookmark => 
      bookmark.getCard(this.id, this.name, subfolder.name)
    );
  }

  findBookmark(source, bookmarkId) {
    if (source === 'reading') {
      return this.bookmarks.find(bookmark => bookmark.id === bookmarkId);
    } else {
      const subfolder = this.subfolders.find(folder => folder.name === source);
      return subfolder?.bookmarks.find(bookmark => bookmark.id === bookmarkId);
    }
  }

  addBookmark(destination, bookmark) {
    if (destination === 'reading') {
      this.bookmarks.push(bookmark);
      return true;
    }

    if (!NamedFolder.VALID_SUBFOLDERS.includes(destination)) {
      console.warn(`Warning: Invalid subfolder name '${destination}'`);
      return false;
    }

    let subfolder = this.subfolders.find(folder => folder.name === destination);
    if (!subfolder) {
      subfolder = new Folder(destination);
      this.subfolders.push(subfolder);
    }

    subfolder.bookmarks.push(bookmark);
    return true;
  }

  removeBookmark(source, bookmarkId) {
    const bookmarkList = source === 'reading'
      ? this.bookmarks
      : this.subfolders.find(folder => folder.name === source)?.bookmarks;
    if (bookmarkList === undefined) return null;

    const index = bookmarkList.findIndex(bookmark => bookmark.id === bookmarkId);
    if (index === -1) return null;
    return bookmarkList.splice(index, 1)[0];
  }
}

class Bookmark {
  constructor(title, chapter, tags, url, date, id) {
    this.title = title;
    this.chapter = chapter;
    this.tags = tags;
    this.url = url;
    this.date = date;
    this.id = id;
  }

  hasTags(filterTags) {
    return filterTags.every(tag => this.tags.includes(tag));
  }

  hasTitle(queryTokens) {
    const normalizedTitle = this.title.toLowerCase();
    return queryTokens.every(token => normalizedTitle.includes(token));
  }

  getCard(folderId, folderName, readingStatus = 'reading') {
    const card = document.createElement('bookmark-card');
    card.setup(
      this.title,
      this.chapter,
      this.tags,
      this.url,
      this.date,
      readingStatus,
      this.id,
      folderName,
      folderId
    );
    return card;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await setSavedSettings();
  addListeners();

  await mapExtensionTree();

  const sideNav = document.getElementById('side-nav');
  await sideNav.renderFolders();
  sideNav.selected = _navSelection;

  const tagsInput = document.getElementById('filter-tags-input');
  tagsInput.populateDatalist();

  renderCards();
});

async function setSavedSettings() {
  const settings = await getDisplaySettings();
  document.getElementById('select-status-menu').selected = settings.status;
  document.getElementById('order-dropdown').selected = settings.order;
}

function addListeners() {
  document.addEventListener('scroll', handleScroll);

  document.getElementById('open-nav').addEventListener('click', showSideNav);
  document.getElementById('side-nav').addEventListener('navClosed', showOpenNavButton);
  document.getElementById('side-nav').addEventListener('navChange', navChangeHandler);

  document.getElementById('search-input').addEventListener('keyup', searchInputHandler);
  document.getElementById('clear-search-button').addEventListener('click', clearSearchHandler);

  document.getElementById('filter-tags-input').addEventListener('tagChange', tagFilterHandler);
  document.getElementById('toggle-filter-input').addEventListener('click', toggleFilterHandler);
  document.getElementById('remove-filters').addEventListener('click', clearTagFilterHandler);

  document.getElementById('select-status-menu').addEventListener('toggleMenuChange', readingStatusHandler);
  document.getElementById('order-dropdown').addEventListener('dropdownChange', changeOrderHandler);

  document.addEventListener('titleChanged', cardTitleChangeHandler);
  document.addEventListener('tagsChanged', cardTagChangeHandler);
  document.addEventListener('bookmarkMoved', cardMoveBookmarkHandler);
}

function handleScroll(event) {
  const searchContainer = document.getElementById('search-container');
  if (window.scrollY === 0) {
    searchContainer.classList.remove('scrolled');
  } else {
    searchContainer.classList.add('scrolled');
  }
}

// ****************
// side navigation functions
// ****************

function showSideNav() {
  document.getElementById('side-nav').openNav();
  const openButton = document.getElementById('open-nav');
  openButton.style.visibility = 'hidden';
}

function showOpenNavButton() {
  const openButton = document.getElementById('open-nav');
  openButton.style.visibility = 'visible';
}

function navChangeHandler(event) {
  _navSelection = event.detail;

  const searchInput = document.getElementById('search-input');
  searchInput.value = '';
  setSearchIcon();

  renderCards();
}

// ****************
// search functions
// ****************

function searchInputHandler(event) {
  clearTimeout(_typingtimer);
  const searchValue = event.target.value;
  setSearchIcon(searchValue === '');
  _typingtimer = setTimeout(performSearch, 400);
}

function clearSearchHandler(event) {
  const searchInput = document.getElementById('search-input');
  searchInput.value = '';
  setSearchIcon();
  const sideNav = document.getElementById('side-nav');
  sideNav.selected = _navSelection;
  renderCards();
}

function performSearch() {
  const tokens = getSearchTokens();
  const sideNav = document.getElementById('side-nav');
  sideNav.selected = tokens.length ? null : _navSelection;
  renderCards();
}

function setSearchIcon(hasEmptySearch=true) {
  const clearSearchButton = document.getElementById('clear-search-button');
  const searchLabel = document.getElementById('search-label');
  if (hasEmptySearch) {
    clearSearchButton.classList.add('hidden');
    searchLabel.classList.remove('hidden');
  } else {
    searchLabel.classList.add('hidden');
    clearSearchButton.classList.remove('hidden');
  }
}

function getSearchTokens() {
  const searchValue = document.getElementById('search-input').value.trim();
  return searchValue === '' ? [] : searchValue.toLowerCase().split(/\s+/);
}

// ****************
// tag functions
// ****************

function tagFilterHandler(event) {
  const removeTagFilters = document.getElementById('remove-filters');
  removeTagFilters.disabled = event.target.getTags().length === 0;
  renderCards();
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

function clearTagFilterHandler(event) {
  const tagsInput = document.getElementById('filter-tags-input');
  tagsInput.replaceAllTags([]);
  event.target.disabled = true;
  renderCards();
}

// ****************
// card display functions
// ****************

async function readingStatusHandler(event) {
  try {
    await setStatusFilter(event.detail);
  } catch (error) {
    console.error(`Error changing reading status display: ${error}`);
  }
  renderCards();
}

async function changeOrderHandler(event) {
  try {
    await setDisplayOrder(event.detail);
  } catch (error) {
    console.error(`Error changing bookmark display order: ${error}`);
  }
  renderCards();
}

function renderCards() {
  const navSelection = document.getElementById('side-nav').selected;
  const searchTokens = getSearchTokens();

  const folders = searchTokens.length || !navSelection
    ? _bookmarkFolders
    : [_bookmarkFolders.find((folder) => folder.id === navSelection)];
  
  const status = document.getElementById('select-status-menu').selected;
  const tags = document.getElementById('filter-tags-input').getTags();
  const cards = folders.flatMap(folder => 
    folder.getCards(status, {tags: tags, queryTokens: searchTokens})
  );

  _displayedCards = sortCards(cards);
  const bookmarkList = document.getElementById('bookmark-list');
  bookmarkList.replaceChildren(..._displayedCards);
}

function sortCards(cards) {
  const order = document.getElementById('order-dropdown').selected;
  return cards.toSorted((a, b) => {
    switch (order) {
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

// ****************
// parse extension tree functions
// ****************

async function mapExtensionTree() {
  const rootError = document.getElementById('root-error');
  let hasRoot;
  try {
    hasRoot = await hasRootFolderId();
    rootError.style.display = 'none';
  } catch (error) {
    hasRoot = false;
    rootError.style.display = 'block';
    console.warn(error);
  }

  if (hasRoot) {
    const tree = await getExtensionSubtree();
    parseTree(tree);
  } else {
    _bookmarkFolders = [];
  }
}

function parseTree(tree) {
  _bookmarkFolders = [];
  for (const node of tree) {
    const namedFolder = parseNamedFolder(node);
    if (namedFolder) _bookmarkFolders.push(namedFolder);
  }
}

function parseNamedFolder(node) {
  if (!node.children) {
    console.warn(`Invalid bookmark skipped: '${node.title}'; can not be placed directly in extension folder`);
    return null;
  }

  const namedFolder = new NamedFolder(node.title, [], node.id, []);

  for (const child of node.children) {
    if (child.url) {
      const bookmark = parseBookmark(child);
      if (bookmark) namedFolder.bookmarks.push(bookmark);
      else console.warn(`Invalid bookmark skipped: '${child.title}'; does not match bookmark format`);
    } else if (child.children && NamedFolder.VALID_SUBFOLDERS.includes(child.title)) {
      const subfolder = parseSubfolder(child);
      namedFolder.subfolders.push(subfolder);
    } else {
      console.warn(`Invalid folder skipped: '${child.title}'; unsupported subfolder name`);
    }
  }

  return namedFolder;
}

function parseSubfolder(node) {
  const subfolder = new Folder(node.title, []);

  for (const child of node.children) {
    if (child.url) {
      const bookmark = parseBookmark(child);
      if (bookmark) subfolder.bookmarks.push(bookmark);
      else console.warn(`Invalid bookmark skipped: '${child.title}'; does not match bookmark format`);
    } else {
      console.warn(`Invalid folder skipped: '${child.title}'; unsupported tree depth`);
    }
  }

  return subfolder;
}

function parseBookmark(bookmark) {
  const match = bookmark.title.match(bookmarkRegex());
  if (!match) return null;

  const [, title, chapter, tagsString] = match;
  const tags = tagsString ? tagsString.split(',') : [];
  return new Bookmark(title, chapter, tags, bookmark.url, bookmark.dateAdded, bookmark.id);
}

// ****************
// card change functions
// ****************

function cardTitleChangeHandler(event) {
  const {folderId, readingStatus, bookmarkId, title} = event.detail;
  const namedFolder = _bookmarkFolders.find(folder => folder.id === folderId);
  const bookmark = namedFolder?.findBookmark(readingStatus, bookmarkId);

  if (!bookmark) return;

  bookmark.title = title;
  const searchTokens = getSearchTokens();
  if (!bookmark.hasTitle(searchTokens)) {
    event.target.remove();
  }
}

function cardTagChangeHandler(event) {
  const {folderId, readingStatus, bookmarkId, tags} = event.detail;
  const namedFolder = _bookmarkFolders.find(folder => folder.id === folderId);
  const bookmark = namedFolder?.findBookmark(readingStatus, bookmarkId);

  if (!bookmark) return;

  bookmark.tags = tags;
  const filterTags = document.getElementById('filter-tags-input').getTags();
  if (!bookmark.hasTags(filterTags)) {
    event.target.remove();
  }
}

async function cardMoveBookmarkHandler(event) {
  const bookmarkId = event.detail.bookmarkId;
  const source = event.detail.source;
  const destination = event.detail.destination;

  const sourceFolder = _bookmarkFolders.find(folder => folder.id === source.id);
  const bookmark = sourceFolder?.removeBookmark(source.readingStatus, bookmarkId);

  if (!bookmark) {
    console.error('Error: could not find bookmark in source folder.');
    return;
  }

  let destinationFolder = _bookmarkFolders.find(folder => folder.id === destination.id);
  if (destinationFolder === undefined) {
    destinationFolder = new NamedFolder(destination.title, [], destination.id, []);
    _bookmarkFolders.push(destinationFolder);
  }
  const isAdded = destinationFolder.addBookmark(destination.readingStatus, bookmark);
  if (!isAdded) {
    console.error('Error: failed to move bookmark to destination folder');
    sourceFolder.addBookmark(source.readingStatus, bookmark);
    return;
  }

  const folderRemoved = await updateSideNav();
  if (folderRemoved) {
    renderCards();
  } else {
    const status = document.getElementById('select-status-menu').selected;
    const matchesStatus = status === 'all' || destination.readingStatus === status;
    const matchesFolder = _navSelection === '' || _navSelection === destination.id;
    if (!matchesStatus || !matchesFolder) {
      event.target.remove();
    }    
  }
}

async function updateSideNav() {
  let selectionRemoved = false;
  const sideNav = document.getElementById('side-nav');
  await sideNav.renderFolders();
  if (!sideNav.hasOption(_navSelection)) {
    _navSelection = '';
    selectionRemoved = true;
  }
  const searchTokens = getSearchTokens();
  if (!searchTokens.length) {
    sideNav.selected = _navSelection;
  }
  return selectionRemoved;
}

registerBookmarkListener(updatePage);

async function updatePage() {
  await mapExtensionTree();

  await updateSideNav();

  const tagsInput = document.getElementById('filter-tags-input');
  tagsInput.populateDatalist();
  
  renderCards();
}