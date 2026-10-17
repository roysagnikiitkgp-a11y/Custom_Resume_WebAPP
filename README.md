# Resume Tailor

Paste a job description and get a tailored resume (summary, IndiaMART bullets, skills) in a one-page layout, edit it inline and download it as a PDF.

## How it works
- `public/index.html` is the whole front end (no build step). It calls `/api/claude`.
- `api/claude.js` is a Vercel serverless function that forwards prompts to the Anthropic Messages API.
- Applications history, the experience repository and usage counters are stored in the browser (`localStorage`).

## Setup on Vercel
1. Import this repo as a Vercel project (framework preset: Other).
2. Add environment variable `ANTHROPIC_API_KEY` (Settings -> Environment Variables), then redeploy.
3. Optional: add `ACCESS_CODE`. When set, the site asks for the code before any Claude call, which stops strangers using your API key.

## Models
Auto uses Claude Sonnet 5.5. Haiku 5.5 and Opus 5.5 can be picked in the model selector. Requests are limited to 60 s by `vercel.json`; Opus on long prompts may be slow.

## Fonts
`public/fonts/` holds Charis SIL (SIL Open Font License 1.1), a Charter-style face used to match the PDF layout.
