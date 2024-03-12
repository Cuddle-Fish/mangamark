import { getMangamarkFolderId } from "../bookmark.js";

const sideNavWidth = "250px";
var globalFolders;

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
    this.subFolders = subFolders;
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
}

class Bookmark {
  /**
   * 
   * @param {string} bookmarkTitle
   * @param {string} url
   * @param {number} dateCreated
   */
  constructor(bookmarkTitle, url, dateCreated) {
    const {title, chapter} = this.#convertBookmarkTitle(bookmarkTitle);

    this.title = title;
    this.chapter = chapter;
    this.url = url;
    this.date = dateCreated
    this.dateString = this.#convertDate(dateCreated);
  }

  #convertBookmarkTitle(bookmarkTitle) {
    const regex = /^(.*?) - Chapter (\d+)$/i;
    const matches = bookmarkTitle.match(regex);
    return {
      title: matches[1],
      chapter: matches[2]
    };
  }

  #convertDate(dateCreated) {
    const months = [
      "January", 
      "February", 
      "March", 
      "April", 
      "May", 
      "June", 
      "July", 
      "August", 
      "September", 
      "October", 
      "November", 
      "December"
    ];
    const date = new Date(dateCreated);
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`
  }

  bookmarkElement() {
    const bookmarkEntry = document.createElement('div');
    bookmarkEntry.classList.add('bookmarkEntry');

    const bookmarkGrid = document.createElement('div');
    bookmarkGrid.classList.add('bookmarkGrid');

    const titleElement = document.createElement('div');
    titleElement.classList.add('col1');
    titleElement.textContent = this.title;

    const optionsElement = document.createElement('div');
    optionsElement.classList.add('col2');

    const dropDown = document.createElement('div');
    dropDown.classList.add('dropDown');
    for (let i = 0; i < 3; i++) {
      const circle = document.createElement('div');
      circle.classList.add('circle');
      dropDown.appendChild(circle);
    }

    optionsElement.appendChild(dropDown);

    const chapterElement = document.createElement('div');
    chapterElement.classList.add('fullGridLength');
    chapterElement.textContent = 'Chapter ' + this.chapter;

    const domainElement = document.createElement('div');
    domainElement.classList.add('col1');
    domainElement.textContent = new URL(this.url).hostname;

    const dateElement = document.createElement('div');
    dateElement.classList.add('col2');
    dateElement.textContent = this.dateString;

    bookmarkGrid.appendChild(titleElement);
    bookmarkGrid.appendChild(optionsElement);
    bookmarkGrid.appendChild(chapterElement);
    bookmarkGrid.appendChild(domainElement);
    bookmarkGrid.appendChild(dateElement);

    const bookmarkOptions = this.#optionsMenu();
    dropDown.addEventListener('click', () => {
      bookmarkOptions.classList.toggle('show');
    });

    bookmarkEntry.appendChild(bookmarkGrid);
    bookmarkEntry.appendChild(bookmarkOptions);

    return bookmarkEntry;
  }

  #optionsMenu() {
    const bookmarkOptions = document.createElement('div');
    bookmarkOptions.classList.add('bookmarkOptions');

    const deleteButton = document.createElement('button');
    deleteButton.title = 'Delete Bookmark';
    const deleteIcon = document.createElement('span');
    deleteIcon.classList.add('material-symbols-outlined', 'removeIcon');
    deleteIcon.textContent = 'delete';
    deleteButton.appendChild(deleteIcon);
    deleteButton.addEventListener('click' , () => {
      //TODO remove bookmark
      //TODO remove HTML element
    });

    const completeButton = document.createElement('button');
    completeButton.title = 'Mark as Completed';
    const completeIcon = document.createElement('span');
    completeIcon.classList.add('material-symbols-outlined', 'completeIcon');
    completeIcon.textContent = 'done';
    completeButton.appendChild(completeIcon);
    //TOOD add onclick move to completed

    bookmarkOptions.appendChild(deleteButton);
    bookmarkOptions.appendChild(completeButton);

    return bookmarkOptions;
  }
}

getMarks();

function getMarks() {
  getMangamarkFolderId()
  .then((mangamarkId) => chrome.bookmarks.getSubTree(mangamarkId))
  .then((mangamarkTree) => getFolders(mangamarkTree[0].children))
  .then((folders) => displayBookmarks(folders))
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
  globalFolders = folders;
  return folders;
}

function getBookmarks(tree, getSubFolders=true) {
  const bookmarks = [];
  const folders = []
  tree.forEach(node => {
    if (node.url) {
      const bookmark = new Bookmark(node.title, node.url, node.dateAdded)
      bookmarks.push(bookmark);
    } else if (node.children && getSubFolders) {
      const {bookmarks: folderBookmarks} = getBookmarks(node.children, false);
      const folder = new Folder(node.title, folderBookmarks);
      folders.push(folder);
    }
  });
  return {folders: folders, bookmarks: bookmarks};
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

function displayBookmarks(folders, type='all', sortBy='recent') {
  var bookmarks;
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
    default:
      throw new Error('Invalid display type');
  }
  bookmarks = sortBookmarks(bookmarks, sortBy);
  const bookmarkDisplay = bookmarks.map(bookmark => bookmark.bookmarkElement());
  const bookmarkList = document.getElementById('bookmarkList');
  bookmarkList.replaceChildren(...bookmarkDisplay);
}

function sortBookmarks(bookmarks, sortBy) {
  return bookmarks.toSorted((a, b) => {
    switch (sortBy) {
      case 'recent':
        return b.date - a.date;
      case 'oldest':
        return a.date - b.date;
      case 'titleAZ':
        return a.title.localeCompare(b.title);
      case 'titleZA':
        return b.title.localeCompare(a.title);
      default:
        throw new Error('Invalid sorting criteria');
    }
  });
}

const bookmarkType = document.getElementsByName('bookmarkType');
bookmarkType.forEach(type => {
  type.addEventListener('change', () => {
    console.log(type.value);
    displayBookmarks(globalFolders, type.value);
  });
});

function openNav() {

}

function closeNav() {
  
}