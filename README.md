# Nsubuga John Paul — Personal Website

1. Extract the ZIP.
2. In VS Code, choose **File → Open Folder** and select `personal-website`.
3. In VS Code, select **Go Live** in the status bar. Live Server opens the site in Chrome at `http://127.0.0.1:5500` and refreshes it as you edit. To preview inside VS Code, open the same URL in its integrated browser. Select **Port: 5500** in the status bar to stop the server. If Live Server is unavailable, run `python -m http.server 8000` and visit `http://localhost:8000`.

No package installation or build command is required.

| To edit | Open |
| --- | --- |
| Home | `index.html` |
| Selected work | `work.html` |
| Body&Soil case study | `body-and-soil.html` |
| About | `about.html` |
| Idea Box | `idea-box.html` |
| Contact | `contact.html` |
| Type, colour, spacing and breakpoints | `styles.css` |
| Kampala clock and header controls | `script.js` |
| Portfolio artwork | `assets/` |

The layout follows the shared Figma frames and reflows on smaller screens. The Body&Soil case study pairs section copy with its artwork galleries on desktop, then stacks them on mobile while preserving the artwork proportions. CSS motion animates the particle field, artwork and landing-page title; it respects reduced-motion preferences. Mozilla Headline is used for headings and Mozilla Text for body copy. The header sound control toggles brief synthesized UI sounds on clicks and when hovering over Idea Box artwork.

The green “Same Cookies, Fresh Identity” graphic is the original flat image from the linked Figma node and appears in the Body&Soil case study as supplied. Replace it and the related reference images before publishing if you want to show the final Body&Soil assets. Page text and layout can be edited directly in the source.
