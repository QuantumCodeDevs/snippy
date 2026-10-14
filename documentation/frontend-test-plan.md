# Snippy Frontend Test Plan

Manual QA checklist for fully exercising the Angular frontend. Use this after UI, search, dialog, or store changes.

## Table of Contents

1. [Scope and goals](#1-scope-and-goals)
2. [Prerequisites](#2-prerequisites)
3. [Test accounts and data](#3-test-accounts-and-data)
4. [Pass / fail criteria](#4-pass--fail-criteria)
5. [Smoke suite (must pass every release)](#5-smoke-suite-must-pass-every-release)
6. [Authentication and shell](#6-authentication-and-shell)
7. [Landing page](#7-landing-page)
8. [Navigation and layout](#8-navigation-and-layout)
9. [User home](#9-user-home)
10. [Explore (public)](#10-explore-public)
11. [Following feed](#11-following-feed)
12. [Profiles](#12-profiles)
13. [Snippet list interactions](#13-snippet-list-interactions)
14. [Collections](#14-collections)
15. [Editor and preview](#15-editor-and-preview)
16. [Snippet settings dialog](#16-snippet-settings-dialog)
17. [Comments](#17-comments)
18. [Assets](#18-assets)
19. [Settings](#19-settings)
20. [Embed player](#20-embed-player)
21. [Search (server-side)](#21-search-server-side)
22. [Dialogs, snackbars, and glass UI](#22-dialogs-snackbars-and-glass-ui)
23. [Guards and navigation edge cases](#23-guards-and-navigation-edge-cases)
24. [Responsive and accessibility](#24-responsive-and-accessibility)
25. [Error and empty states](#25-error-and-empty-states)
26. [Regression matrix](#26-regression-matrix)
27. [Sign-off](#27-sign-off)

---

## 1. Scope and goals

**In scope**
- All routed pages and lazy-loaded views
- PocketBase email login/logout and guarded routes
- Snippet CRUD, fork, favorite, comment, follow
- Collections create/open/delete/add/remove
- Editor layouts, save, unsaved-changes guard, full-page preview
- Assets upload/copy/delete
- Settings profile (including profile image) / editor preferences / account privacy / username / delete account
- Embed player (tabs, editable, theme query param)
- Server-side search (`q`) on lists and collections
- Shared UI: pill tabs, glass cards, dialogs, snackbars

**Out of scope**
- Backend unit/integration tests (see API / Postman docs)
- Load / performance benchmarking
- Cross-browser matrix beyond Chromium + one Safari/Firefox spot-check (extend if shipping publicly)

---

## 2. Prerequisites

| Item | Notes |
|------|--------|
| Stack running | `docker compose up` (or prod stack) with `db`, `api`, `frontend` healthy |
| PocketBase | Superuser env set; optional GitHub OAuth if testing social |
| Browser | Chromium latest; optional Safari / Firefox |
| Network | DevTools open for failing cases (Console + Network) |
| Files | PocketBase file fields for assets, avatars, snapshots |

Confirm:

```bash
# Frontend reachable
curl -I http://localhost:4200   # or your tunnel / prod URL

# PocketBase health (proxied)
curl -s http://localhost:4200/api/health || true
```

Record environment under test: URL, compose file (dev vs prod).

---

## 3. Test accounts and data

Prepare at least:

| Account | Purpose |
|---------|---------|
| **User A** | Primary owner — create snippets, collections, assets |
| **User B** | Second user — follow, favorite, comment, fork A’s public work |
| Optional **User C** | Extra follow graph / privacy checks |

Seed data (as User A before deep regression):

- 2+ public snippets (different names/descriptions/tags)
- 1 private snippet
- 1 collection with 2+ pens
- 1 favorited public snippet from B (or favorite A’s own after B publishes)
- Enough items to exercise pagination (page size 6)

---

## 4. Pass / fail criteria

**Pass** when:

- Expected UI appears without console errors (except known third-party noise)
- API calls return expected status; UI reflects server state after refresh
- Destructive actions require confirmation and only run on confirm
- Snackbars show readable white text on glass pills; dialogs match card glass (no harsh double border)

**Fail** when:

- Blank/stale content after navigation (e.g. previous snippet still shown)
- Search only filters the current page (must hit server and update total)
- Confirm dialogs skipped; data deleted without confirmation
- Unsaved editor changes discarded without prompt

Mark each case: **Pass** / **Fail** / **Blocked** / **N/A**.

---

## 5. Smoke suite (must pass every release)

Run in order (~15–20 minutes).

| ID | Case | Expected |
|----|------|----------|
| S1 | Open landing → Log in | PocketBase → redirect `/home` |
| S2 | Create New Snippet | Editor opens; can type HTML/CSS/JS; preview updates |
| S3 | Save snippet | Snackbar success; dirty flag clears; reload keeps content |
| S4 | Set description + tags + public | Settings dialog saves; appears on Explore |
| S5 | Favorite from list | Heart fills; Favorites tab shows it without hard refresh |
| S6 | Fork (as User B) | New snippet owned by B; navigates to B’s editor |
| S7 | Comment | Post shows in dialog; count bumps |
| S8 | Create collection + add snippet | Appears under Collections; detail lists pens |
| S9 | Search on Explore | Debounced; totals/pagination from server |
| S10 | Log out | Returns to landing; guarded routes redirect to login |

If any smoke case fails, stop and fix before full regression.

---

## 6. Authentication and shell

| ID | Steps | Expected |
|----|-------|----------|
| A1 | Visit `/` logged out | Landing header with Log in and View snippets; no Your Snippets / Following |
| A2 | Visit `/home` logged out | PocketBase redirect / login |
| A3 | Login success | `/home`; feed nav + user avatar menu |
| A4 | Refresh on `/home` | Session restored; user header populates (not stuck empty) |
| A5 | User menu → Home / Profile / New Snippet / Assets / Settings / Log out | Each route/action works |
| A6 | Log out | Session cleared; `/home` requires login again |

---

## 7. Landing page

| ID | Steps | Expected |
|----|-------|----------|
| L1 | View hero | Brand “Snippy”, headline, CTAs, glass cards, atmosphere orbs |
| L2 | Log in CTA | Starts PocketBase |
| L2a | View snippets CTA / header Public | Navigates to `/public` without login |
| L3 | Explore Features / section anchors | Scrolls to features (if linked) |
| L4 | Responsive | Usable at 375px and 1280px; no horizontal overflow |

---

## 8. Navigation and layout

| ID | Steps | Expected |
|----|-------|----------|
| N1 | Pill nav: Your Snippets / Following / Public | Active pill uses violet→cyan glass highlight |
| N2 | User-home tabs: Snippets / Collections / Favorites / Projects | Same pill style as top nav; no Material underline |
| N3 | Footer (non-editor) | Copyright only |
| N4 | Footer (in editor with saved snippet) | Compact Fork / Export / Assets actions |
| N5 | Glass surfaces | Cards, header, chips translucent over orbs; body background unchanged |

---

## 9. User home

| ID | Steps | Expected |
|----|-------|----------|
| H1 | Open `/home` | Identity header: avatar, display name, `@username` |
| H2 | Snippets tab | List + search + New Snippet; pagination |
| H3 | New Snippet | Opens blank/editor flow |
| H4 | Open own card | Navigates to `/:user/snippet/:id` |
| H5 | Collections tab | Create / open / delete (confirm) |
| H6 | Favorites tab | Shows favorited pens; unfavorite removes from list after sync |
| H7 | Projects tab | “Coming soon” glass card |
| H8 | Late auth hydrate | If user loads after first paint, name fields still fill (no empty shell forever) |

---

## 10. Explore (public)

| ID | Steps | Expected |
|----|-------|----------|
| E1 | Open `/public` | Sort header + snippet grid |
| E1a | Cards with/without snapshot | JPEG thumb when `snapshotUrl` set; code placeholder otherwise |
| E2 | Sort: Newest / Views / Favorites / Forks | List reorders; page resets to 1 |
| E3 | Pagination | Page size and next/prev load new server pages |
| E4 | Open another user’s public pen | Editor/view loads that snippet (not previous) |

---

## 11. Following feed

| ID | Steps | Expected |
|----|-------|----------|
| F1 | Open `/following` with no follows | Empty or empty-feed messaging; no crash |
| F2 | Follow User A from profile or card menu | Snackbar; A’s public pens appear in feed |
| F3 | Sort + search | Same behavior as Explore (server-driven) |
| F4 | Unfollow | Pens eventually leave feed on reload |

---

## 12. Profiles

| ID | Steps | Expected |
|----|-------|----------|
| P1 | Open own profile via menu | Identity + stats; no Follow button (self) |
| P2 | Open `/:otherUser` | Follow / Unfollow works; stats update |
| P3 | Pens tab | Public pens only for other users |
| P4 | Collections tab | Public collections; open detail |
| P5 | Private profile (if supported) | Locked/forbidden empty state with icon |
| P6 | Click username on a card | Routes to that profile |

---

## 13. Snippet list interactions

On home / explore / following / profile lists:

| ID | Steps | Expected |
|----|-------|----------|
| SL1 | Favorite toggle | Optimistic UI; reverts + error snackbar on failure |
| SL2 | Favorite on Snippets tab → open Favorites | Item appears without hard refresh |
| SL3 | Comment icon | Opens comments dialog for that snippet |
| SL3a | Hover Views / Favorite / Comments / Forks | Tooltips; Favorite vs Unfavorite; Views tooltip works though the button is disabled |
| SL3b | Embeds chip | Hidden when count is 0 |
| SL4 | Fork from ⋮ menu | Fork + navigate to new owner editor |
| SL5 | Follow/Unfollow from ⋮ | Snackbar; `isFollowing` updates |
| SL6 | Add to collection | Dialog lists collections; Add marks “In collection” |
| SL7 | Delete own (confirm Cancel) | No delete |
| SL8 | Delete own (confirm Delete) | Removed from list; success snackbar |
| SL9 | Views count | Increments when opening a pen (if view tracking enabled) |

---

## 14. Collections

| ID | Steps | Expected |
|----|-------|----------|
| C1 | Create collection (name, description, private toggle) | Appears in list; snackbar |
| C2 | Open collection detail | Name, privacy chip, pens, back button |
| C3 | Add pens via list “Add to collection” | Count updates; pens listed on detail |
| C4 | Remove from collection (owner) | Confirm; pen removed; count updates |
| C5 | Delete collection | Confirm; removed from home Collections |
| C6 | Search collections on home/profile | Server `q`; totals correct across pages |
| C7 | Search pens inside collection detail | Filtered set from server; pagination coherent |
| C8 | Rapid tab / profile switches | No stale collection list from older request (race guard) |

---

## 15. Editor and preview

| ID | Steps | Expected |
|----|-------|----------|
| ED1 | New snippet | Three editors (HTML/CSS/JS) + live preview |
| ED2 | Edit each pane | Preview updates (full vs partial as designed) |
| ED3 | Format Code / Analyze Code (⋮ on pane) | Format mutates content; analyze opens alert dialog |
| ED4 | Rename in header (owner) | Dirty; Save enabled |
| ED5 | Save | Success snackbar; Save disabled until next edit |
| ED5a | Save with PocketBase files on | List card later shows a preview thumb; Assets dialog does not list the snapshot |
| ED6 | Layout menu: Left / Top / Right / Bottom | Panels rearrange; preference persists (localStorage) |
| ED6a | Drag HTML/CSS/JS or preview splitters | Panes resize; no snap, no gutter labels; 14px themed gutters without grip dots |
| ED6b | Save a fork | Attribution still links to the live parent — not “(parent deleted)” unless the parent row is gone |
| ED7 | Full Page View | Opens `/:user/fullpage/:id`; preview only; minimal header |
| ED8 | Favorite / Comment / Fork in editor header | Same behavior as list |
| ED9 | Footer Export ZIP | Downloads zip with html/css/js + README |
| ED9a | Footer Import ZIP | Opens as unsaved pen contents |
| ED10 | Footer Fork / Assets | Fork navigates; Assets opens dialog |
| ED11 | Navigate away with unsaved changes | Confirm dialog; Cancel stays; Confirm leaves |
| ED12 | Open snippet B while viewing A | Clears A; shows B or not-found/error — never A’s content stuck |
| ED13 | Non-owner view | Read-only name; no Save/Settings (as designed) |

---

## 16. Snippet settings dialog

| ID | Steps | Expected |
|----|-------|----------|
| SS1 | Open settings (owner) | Glass modal; General / CSS / JS tabs as pills |
| SS2 | Description + Private toggle + tags add/remove | Save persists; private hidden from Explore for others |
| SS3 | External CSS/JS resources | Valid URL saves; invalid URL shows alert |
| SS4 | Cancel | Discards dialog edits |
| SS5 | Modal chrome | Matches card glass; soft edge (no weird hard double border) |

---

## 17. Comments

| ID | Steps | Expected |
|----|-------|----------|
| CM1 | Open comments (empty) | Empty state |
| CM2 | Post comment | Appears in list; count +1 |
| CM3 | Edit own | Saves; content updates |
| CM4 | Delete own (confirm) | Removed; count -1 |
| CM5 | Other user’s comment | No edit; delete only if allowed by rules |
| CM6 | Close | Dialog dismisses cleanly |
| CM7 | Reply | One-level indent; cannot reply to a reply |
| CM8 | `@username` | Renders as profile link; composer suggestions |

---

## 18. Assets

**When PocketBase files enabled**

| ID | Steps | Expected |
|----|-------|----------|
| AS1 | Open Assets (menu or footer) | Grid or empty state |
| AS2 | Upload image | Appears in grid; success snackbar |
| AS3 | Insert into editor (from footer) | Markup inserted at HTML caret; snackbar |
| AS3b | Copy URL | Success; URL on clipboard |
| AS4 | Delete (confirm) | Removed from grid; warning if usedInCount > 0 |
| AS6 | After profile picture and snippet save | Assets grid does **not** show avatar or snippet snapshots |

**When PocketBase files disabled**

| ID | Steps | Expected |
|----|-------|----------|
| AS5 | Open Assets | “Asset uploads are currently unavailable” empty state |

---

## 19. Settings

| ID | Steps | Expected |
|----|-------|----------|
| ST1 | Profile tab loads | Display name + bio filled when user arrives (including late load) |
| ST2 | Edit profile → Save | Success; header/identity reflect new name |
| ST2a | PocketBase files on: Profile Image section | Preview, Choose File, 500×500 / 5 MB hint, Remove |
| ST2b | PocketBase files on: upload image | Success; avatar updates in Settings and header |
| ST2c | PocketBase files on: Remove Profile Image | `pictureUrl` cleared; Gravatar fallback |
| ST2d | PocketBase files off: Profile tab | No Profile Image block; display name / bio still present |
| ST3 | Username availability | checking / available / taken / invalid / current hints |
| ST4 | Update username | Success; routes/`@` handle new name |
| ST5 | Editor tab → change theme/font | Live preview updates immediately |
| ST6 | Editor tab → Save preferences | Success; reopen snippet editor — prefs applied; survive refresh |
| ST7 | Account → toggle Private → Save privacy | Success toast; non-owner cannot open profile (403 / blocked UI) |
| ST8 | Account → toggle Public → Save privacy | Profile visible again |
| ST9 | Delete account Cancel | No deletion |
| ST10 | Delete account Confirm | Account deleted; logged out (destructive — use disposable account) |
| ST11 | Danger zone styling | Glass danger panel readable |

---

## 20. Embed player

Requires a **public** saved snippet with a `shortId`.

| ID | Steps | Expected |
|----|-------|----------|
| EM1 | Open Embed dialog from editor | Preview iframe + copyable HTML; blocked if private/unsaved |
| EM1a | Narrow viewport | Dialog content scrolls; copy/theme controls remain reachable |
| EM2 | Select theme (e.g. Dracula) | Preview URL includes `theme=dracula`; code pane uses that theme |
| EM3 | Open `/embed/{shortId}?theme=light` | Light theme on code tabs |
| EM4 | Open with invalid `theme=nope` | Editor still loads; theme falls back (defaults / viewer prefs) |
| EM5 | `editable=true` | Local edits allowed; not persisted to snippet |
| EM6 | `default-tab=css,result` | CSS + Result panes shown |

---

## 21. Search (server-side)

For each surface below: type a query that matches an item **not on page 1** (or reduce page size), wait ~400ms debounce, verify Network call includes `q=...` and UI total updates.

| ID | Surface | Endpoint should include `q` |
|----|---------|------------------------------|
| SE1 | Home → Snippets | `GET /snippets/me?q=` |
| SE2 | Home → Collections | `GET /collections/me?q=` |
| SE3 | Home → Favorites | `GET /favorites?q=` |
| SE4 | Explore | `GET /snippets/public?q=` (or search) |
| SE5 | Following | `GET /snippets/feed?q=` |
| SE6 | Profile pens | `GET /snippets/user/:user?q=` |
| SE7 | Profile collections | `GET /collections/user/:user?q=` |
| SE8 | Collection detail pens | `GET /collections/:shortId?q=` |
| SE9 | Clear query | Restores unfiltered list |
| SE10 | No client-only trap | Matching item on another page is found |

Also verify empty query does not send useless search-only empty results.

---

## 22. Dialogs, snackbars, and glass UI

| ID | Steps | Expected |
|----|-------|----------|
| UI1 | Confirm dialogs (delete snippet/collection/comment/asset/account) | Shared layout; Cancel + destructive primary |
| UI2 | Alert dialogs (analyze / invalid URL) | Title tint by type optional; message readable; Close |
| UI3 | All modals | Same glass recipe as cards; consistent padding/actions |
| UI4 | Success / error / info / warning snackbars | Frosted pill; **white** label + action text |
| UI5 | Form fields / selects / sort | Single clean outline (no stepped double border) |
| UI6 | Chips / tags | Glass pills |
| UI7 | Material menus | Glass panel |

---

## 23. Guards and navigation edge cases

| ID | Steps | Expected |
|----|-------|----------|
| G1 | Unsaved editor → browser back / nav link | Confirm guard fires |
| G2 | Saved editor → navigate | No confirm |
| G3 | Deep link `/:user/snippet/:id` while logged out | Login then land on snippet (or home per PocketBase config) |
| G4 | Invalid snippet id | Error / not-found state; no infinite spinner |
| G5 | Invalid collection id | Collection not found empty state |
| G6 | Unknown route | Redirects to landing |

---

## 24. Responsive and accessibility

| ID | Steps | Expected |
|----|-------|----------|
| R1 | 375px width | Nav wraps; lists stack; editor usable or scrollable |
| R2 | 768px / 1280px | Grid columns as designed |
| R3 | Keyboard | Tab through nav, dialogs, forms; Enter activates primary |
| R4 | Focus | Dialog focuses first control; Escape closes where Material allows |
| R5 | Contrast | White text on glass/snackbars readable on dark atmosphere |

---

## 25. Error and empty states

| ID | Steps | Expected |
|----|-------|----------|
| ER1 | API 500 on list load | Error messaging / empty list; no blank white screen |
| ER2 | Offline mid-save | Error snackbar; content remains dirty |
| ER3 | Empty favorites / collections / comments / assets | Icon + message (AsyncState pattern) |
| ER4 | Favorite API failure | Heart reverts; error snackbar |

---

## 26. Regression matrix

Quick cross-check after any large UI/store change:

| Area | Smoke IDs | Full section |
|------|-----------|--------------|
| Auth / shell | S1, S10 | §6 |
| Home / tabs | S2, S5 | §9 |
| Explore / Following | S9 | §10–11 |
| Social | S5–S7 | §12–13, §17 |
| Collections | S8 | §14 |
| Editor | S2–S3 | §15–16 |
| Search | S9 | §21 |
| Settings / Assets | — | §18–19 |
| Embed | — | §20 |
| Visual system | — | §8, §22 |

---

## 27. Sign-off

| Field | Value |
|-------|--------|
| Build / commit | |
| Environment URL | |
| Tester | |
| Date | |
| Smoke result | Pass / Fail |
| Full plan result | Pass / Fail / Partial |
| Blockers | |
| Notes | |

---

## Appendix — DevTools checks

While testing search and lists, filter Network for `/api/collections/`:

- `snippets`
- `favorites`
- `collections`
- `users`

Confirm filter/sort/page params match UI state.

Console should stay free of Angular/Material errors during happy paths.
