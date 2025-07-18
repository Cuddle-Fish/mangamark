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
    - edit title
    - add or remove tags
    - change folder
    - change reading status
    - delete bookmark
  - Organize bookmark folders into groups for better sorting and easier navigation

## Remaining Tasks:

### Features:

#### User Named Root folder:
  - ~~new screen in popup~~
  - ~~change in options page~~
  - Error detection if deleted or changed

#### Information/use page
  - provide functionality and general information on extension
  - caution users about making changes to contents of main bookmark folder

#### Popup:
- regex title and chapter matching

### Style:

#### Manager:
- restyle bookmark cards
  - reduce size
    - move third row to right side
    - adjust padding / gap sizes
  - make full card hyperlink
    - highlight full card on hover
    - move edit -- attach edit/options to left side of card
  - (for consideration) add toggle to further reduce size -- list view
- (for consideration) combine tag search and title search
- (for consideration) limit opening of bookmark card options element to one card
- (for consideration) pagination

### Other:
- (for consideration) move all chrome api calls to externs (popup.js and set-extension-folder.js have chrome calls)
- (for consideration) enum for reading status