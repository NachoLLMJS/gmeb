# GMEB frontend

Frontend-first claim experience for a future Flap Vault distributing GMEB (tokenized GME exposure) to Reddit users who have commented in `r/wallstreetbets`.

## What is real now

- Reddit OAuth 2.0 authorization-code login, server-side token exchange and HttpOnly encrypted session.
- Identity lookup through `oauth.reddit.com/api/v1/me`.
- Eligibility check against the authenticated user's recent comments, requiring a comment whose subreddit is exactly `wallstreetbets`.
- No wallet, contract, token transfer, or claim transaction is implemented yet.

## Reddit setup

1. Visit https://www.reddit.com/prefs/apps and create a **web app**.
2. Set its redirect URI to `http://127.0.0.1:4173/auth/reddit/callback` for local use.
3. Copy `.env.example` to `.env`.
4. Put the Reddit client ID and secret into `.env` and generate a strong `SESSION_SECRET`.
5. Run `npm install`, then `npm run dev`.

Only the scopes `identity history read` are requested. The app never asks to post, vote, edit, or message on the user's behalf.

## Important limitation

Reddit's listing endpoint only exposes the comments available through its API listing window. A very old qualifying comment may not be discoverable. Eligibility is a backend attestation input for the future claim contract; it is not on-chain proof by itself.
