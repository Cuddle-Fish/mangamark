/**
 * Get a Set of all existing tags
 * 
 * @returns a Set containing all tag names. an empty Set will be returned if no tags have been saved
 */
async function getTags() {
  const result = await chrome.storage.sync.get('tags');
  if (result.tags) {
    const tagSet = new Set(result.tags);
    return tagSet;
  } else {
    return new Set();
  }
}

/**
 * Add a new tag
 * 
 * @param {string} tagName unique name of tag to be added, converted to lowercase
 * @returns true if tag was added. false if tag name already exists
 */
async function createNewTag(tagName) {
  const tags = await getTags();
  const tagNameToLower = tagName.toLowerCase();
  if (tags.has(tagNameToLower)) {
    return false;
  } else {
    tags.add(tagNameToLower);
    const tagList = Array.from(tags);
    chrome.storage.sync.set({ 'tags': tagList });
    return true;
  }
}

/**
 * Remove specified tag from extension. Checks all bookmarks for the tag name
 * and removes the tag if present. The supplied tag name is then removed from
 * the stored tag list
 * 
 * @param {string} tagName name of tag to be deleted, converted to lowercase
 */
function deleteTag(tagName) {
  getTags()
  .then((tags) => {
    //TODO need to find all bookmarks with tag and remove tag
    tags.delete(tagName.toLowerCase());
    tagList = Array.from(tags);
    chrome.storage.sync.set({'tags': tagList});
  });
}

/**
 * check if tag is already present within storage
 * 
 * @param {string} tagName name of tag to check
 * @returns true if tag name is already stored, otherwise false
 */
async function hasTag(tagName) {
  const tags = await getTags();
  return tags.has(tagName.toLowerCase());
}

export {getTags, createNewTag, hasTag}