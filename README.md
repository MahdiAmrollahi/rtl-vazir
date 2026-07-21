# RTL Vazir — Persian & Mixed Direction for AI Chats

A small Chrome extension (Manifest V3) that makes AI chat interfaces
**read naturally in Persian (and other RTL languages) while keeping
English and other LTR text in its original direction and font.**

It works on the most popular AI chatbot sites — ChatGPT, Claude, Gemini,
Perplexity, Microsoft Copilot, Poe, DeepSeek, Grok, Mistral, Hugging Face
Chat, and You.com — and is site-agnostic enough to work on any LLM chat
UI that exposes a text container.

## Features

- **Auto direction (`dir="auto"`)** for every paragraph, list, heading,
  blockquote, table cell, prompt input, and contenteditable block that
  contains a Persian, Arabic, Hebrew, Urdu, Kurdish, or Sindhi
  character. The browser's native bidi algorithm renders mixed lines
  (`Hello سلام world`) correctly, with no manual toggling.
- **Vazir font** is applied **only to text that actually resolved to
  RTL direction**. Pure-LTR paragraphs keep the site's own font, so
  English text is never rendered in a Persian font.
- **Code, math, and tables are never touched.** `pre`, `code`, `kbd`,
  `samp`, `KaTeX`, `MathJax`, `mjx-container`, `math`, and `table/*`
  keep their original direction (LTR), their original monospace/math
  font, syntax highlighting, and the Farsi/Persian digit variants
  that some sites apply.
- **Icon fonts stay correct.** Material Symbols, Font Awesome, Lucide,
  Phosphor, Tabler, Bootstrap Icons, Heroicons, Glyphicons, and SVG
  sprites are excluded from the font rule, so icons render in their
  intended glyphs.
- **Streaming-aware.** A `MutationObserver` watches the page and
  re-evaluates new tokens and newly inserted message bubbles in real
  time using `requestIdleCallback`, with no measurable impact on chat
  responsiveness.
- **Live toggle popup** with two independent switches:
  - **Auto direction** — turn off the `dir="auto"` rule if you'd rather
    let the site decide.
  - **Vazir font** — turn off the font override while keeping the
    direction logic on (or vice versa).
  - **Reset to defaults** link in the popup footer.
- **No telemetry, no remote requests, no host permissions** beyond the
  list of supported AI chat sites. Uses `chrome.storage` only for
  your toggle preferences.

## Supported sites

| Site                  | Match                                  |
| --------------------- | -------------------------------------- |
| ChatGPT               | `chatgpt.com`, `chat.openai.com`       |
| Claude                | `claude.ai`                            |
| Gemini                | `gemini.google.com`                    |
| Perplexity            | `perplexity.ai`, `www.perplexity.ai`   |
| Microsoft Copilot     | `copilot.microsoft.com`, `www.bing.com`|
| Poe                   | `poe.com`, `www.poe.com`               |
| DeepSeek              | `chat.deepseek.com`                    |
| Grok / X              | `grok.com`, `x.com`                    |
| Mistral               | `chat.mistral.ai`                      |
| Hugging Face Chat     | `huggingface.co`                       |
| You.com               | `you.com`                              |

Adding a new site is a one-line change: append the URL to the three
`matches` arrays in `extension/manifest.json` and reload the
extension. The script does not rely on any site-specific class names.

## Install (developer mode)

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome (or any Chromium browser
   that supports Manifest V3 — Chrome 111+, Edge, Brave, Arc, Opera).
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the `extension/` folder.
5. Open any of the supported sites. Persian text in messages, bubbles,
   and the prompt box will render RTL with the Vazir font; English
   text is left untouched.

## Project layout

```
.
├── README.md                # this file
├── LICENSE                  # MIT
├── .gitignore
├── .gitattributes
├── extension/               # the Chrome extension (load this folder)
│   ├── manifest.json
│   ├── content.js           # RTL detection + MutationObserver
│   ├── content.css          # @font-face, font rules, kill switches
│   ├── popup.html
│   ├── popup.js
│   ├── fonts/               # the 5 woff2 files used at runtime
│   │   ├── Vazir.woff2
│   │   ├── Vazir-Bold.woff2
│   │   ├── Vazir-Light.woff2
│   │   ├── Vazir-Medium.woff2
│   │   └── Vazir-Thin.woff2
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       ├── icon128.png
│       └── make_icons.ps1
└── fonts/                   # original Vazir source bundle (full set,
                             # all formats, including FD-WOL variants)
```

The `extension/fonts/` directory contains only the five woff2 weights
the extension needs. The `fonts/` directory at the repo root is the
upstream [Vazir font](https://github.com/rastikerdar/vazir-font)
bundle (all formats, including the Farsi-Digits-Without-Latin
variants), kept here as the source of truth and for offline reference.

## Regenerating the icons

The icons are generated by `extension/icons/make_icons.ps1` (a small
PowerShell + .NET System.Drawing script). Re-run it any time to
regenerate `icon{16,48,128}.png` from scratch:

```powershell
powershell -ExecutionPolicy Bypass -File extension/icons/make_icons.ps1
```

## How it works

### Direction

The content script (`extension/content.js`) walks the page
recursively, finds every `p`, `li`, heading, `blockquote`, leaf
`div/span/a`, and editable (`contenteditable`, `textarea`,
`[role="textbox"]`) that contains at least one RTL character
(Unicode ranges covering Hebrew, Arabic, Persian, Kurdish Sorani,
Urdu, Sindhi, and Arabic Presentation Forms-B), and sets
`dir="auto"` on it. The browser's native bidi algorithm then
resolves the direction per paragraph, which gives natural mixed
text without any string manipulation.

After the browser has resolved the direction, a follow-up pass
checks the computed `direction` of each tagged element. If it
resolved to `rtl`, the element is also given the `.rv-rtl` class.
This is the only signal CSS uses to apply the Vazir font — so
pure-LTR text never inherits Vazir.

Excluded from any change: `pre`, `code`, `kbd`, `samp`, `tt`,
`table/*`, `caption`, `input`, `select`, `button`, `script`,
`style`, `noscript`, `template`, `option`, `[contenteditable]` is
*included* in processing (so the prompt box gets `dir="auto"` too),
KaTeX/MathJax/mjx-container, `svg`, `formula`, and elements with
the `formula` role.

### Font

`extension/content.css` declares the five Vazir weights
(`VazirExt` family) via `@font-face` and applies them to every
element that carries the `.rv-rtl` class (and its descendants),
with `!important` to win over direct site rules. Code, math, and
icon-font elements are excluded via a long `:not(...)` selector,
so they fall through to their own direct font-family rules.

Two master kill switches (`html.rv-font-off` and `html.rv-rtl-off`)
mirror these rules with `revert !important` so each toggle only
disables its own feature, never the other.

## Privacy

This extension runs entirely on the client. It does not contact any
remote server, does not collect any data, and only requests the
`storage` permission (to remember your toggle preferences). The
`host_permissions` list restricts where the content script is
allowed to run.

## Credits

- [Vazir font](https://github.com/rastikerdar/vazir-font) by Saber
  Rastikerdar, licensed under the SIL Open Font License v1.1. The
  upstream bundle is included in `fonts/`.
- Icons generated with .NET `System.Drawing`.

## License

MIT. See `LICENSE`.
