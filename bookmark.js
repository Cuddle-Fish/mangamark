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

export {getMangamarkFolderId}