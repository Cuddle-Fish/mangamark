# Mangamark

A chrome extension that aims to provide users with a better method of managing a reading list. This extension provides users with a quick method of creating and updating existing reading entries through the use of automatic title detection. All reading entries can be accessed from a management page that allows for navigation to associated sites, provides better visualization and various sorting and filtering options. Additionally, a tag system and reading status provides users with additional means of personalizing their bookmarks.

This extension utilizes your browser's bookmark system. If users ever wish to uninstall the extension all bookmarks will remain in place and be accessible via your browsers standard bookmark interface.

## Features:
- Extension Popup
  - Create new bookmarks
  - Automatically detect and update existing bookmarks
    - provides manual update selection incase automatic detection fails
  - Set a bookmarks reading status
  - Add and manage bookmark tags
  - Create new tags to add to bookmarks
- Management Page
  - View all bookmarks saved via this extension
  - Navigate to site containing bookmarks content
  - Filter bookmarks by tag, reading status and/or site
  - Search bookmarks by name
  - Manage individual bookmarks
    - add or remove tags
    - change reading status
    - delete bookmark
  - Manage tags
    - create new tags
    - delete existing tags

## Remaining Tasks:

### Popup:
#### Critical:
- mode change button
- confirmation after create/update
- regex title and chapter matching
#### Additions:
- find update title: add folder select
- user named folders
- more reading status options
- chapter display when editing
- increases clarity for buttons:
  - edit and update: is it clear update buttons updates an existing bookmark
  - confirm tags change and find title change is permanent: cancel edit should revert all editing

### Manager:
#### Critical:
- side navigation styling
- tag options
  - filter tags
  - delete tag
  - create tag
- display bad bookmarks
- edit bookmark title

### Other:
- create Mangamark folder if not found
- move all chrome api calls to externs
