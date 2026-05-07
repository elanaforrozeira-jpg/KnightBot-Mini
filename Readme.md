# KnightBot Mini

WhatsApp multi-command bot powered by Baileys.

## Run locally

```bash
npm install
npm start
```

Set `SESSION_ID` in environment before starting.

## Deploy on Render

This repository includes `render.yaml` for one-click Render Blueprint deploy.

### Steps
1. Push repository to GitHub.
2. In Render, create **New + → Blueprint**.
3. Select this repo.
4. Add environment variable:
   - `SESSION_ID` = your KnightBot session string
5. Deploy.

Render will run:
- Build: `npm install --legacy-peer-deps --omit=optional`
- Start: `node --max-old-space-size=400 index.js`

## New utility features

Added 20+ utility commands:

`upper, lower, reverse, titlecase, swapcase, trim, repeat, slug, urlencode, urldecode, b64e, b64d, md5, sha1, sha256, rand, choose, coinflip, roll, palindrome, wordcount, charcount, jsonb64`
