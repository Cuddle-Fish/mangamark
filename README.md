# mangamark

## Goals:
- no longer have to remove old bookmarks
- easier tracking and visualization of reading history
- provide better/ automatic filtering

## Tasks:
### Step 1:
- display site url, title of content and current chapter
  - separate title and chapter, discard group name if present
- store info locally (for now)
  - sort by domain name then title
### Step 2:
- check if title already exist
  - if title exist update chapter and url
  - else (options)
    - create new entry 
      
      OR

    - ask before creating
- add ability to add new title
  - try and automatically get cover image

### Step 3:
- site interaction



## For Consideration:
### What kind of confirmation dialog boxes should we have, if any?
### How should new titles be handled?
#### what happens when adding a new title from a chapter:
- display message (New title (add/cancel): ?)

  OR

- just add title
- make card image just first letter of title
#### button to add new title w/ image:
- find cover via keyword search or manually select image
  
  Manual:
  - blur all content except images
  - add border to hovered image
  - when image clicked revert site to normal
