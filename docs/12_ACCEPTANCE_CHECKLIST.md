# Acceptance Checklist

## 1. Repo Scaffold

- [x] `apps/api` exists
- [x] `apps/web` exists
- [x] `packages/shared` exists
- [x] `docs` exists
- [x] `pnpm-workspace.yaml` exists
- [x] root `package.json` exists
- [x] `.env.example` exists
- [x] `.gitignore` protects secrets

## 2. Backend

- [x] API runs on `127.0.0.1:4000`
- [x] API does not bind to `0.0.0.0` by default
- [x] `GET /health` works
- [x] `GET /api/v1/status` works
- [x] Express disables `x-powered-by`
- [x] JSON body limit exists
- [x] errors use stable JSON shape
- [x] no MongoDB URI leaks in logs

## 3. Database

- [x] MongoDB connection uses local URI
- [x] no MongoDB Atlas used
- [x] no Mongoose used
- [x] post indexes exist
- [x] database health visible without secrets

## 4. Posts

- [x] drafts can exist
- [x] published posts can exist
- [x] archived posts can exist
- [x] slug is unique
- [x] content hash generated
- [x] Markdown converted server-side
- [x] HTML sanitized server-side

## 5. Public API

- [x] public list returns only published posts
- [x] public detail returns only published post by slug
- [x] drafts are hidden
- [x] pagination works
- [x] tag filter works
- [x] no admin metadata leaks

## 6. Frontend

- [x] React app runs on `127.0.0.1:5173`
- [x] home page exists
- [x] post detail page exists
- [x] about page exists
- [x] proof page placeholder exists
- [x] no remote fonts
- [x] no analytics
- [x] no CDN assets

## 7. Admin

- [x] admin routes exist locally
- [x] admin API rejects non-local access
- [ ] admin can create draft
- [ ] admin can edit draft
- [ ] admin can publish post
- [ ] admin can unpublish post
- [ ] admin can delete/archive post
- [x] public cannot access admin

## 8. WebAuthn Later

- [ ] owner can register passkey locally
- [ ] owner can login with passkey/Touch ID
- [x] no password fallback
- [x] admin session cookie is HttpOnly
- [x] admin session cookie is SameSite=Strict
- [x] auth routes are localhost-only

## 9. Tor

- [x] Tor config documented
- [ ] onion hostname generated
- [ ] onion site opens in Tor Browser
- [ ] admin blocked through onion
- [x] MongoDB not exposed
- [ ] onion private key backed up

## 10. Proof/Signing Later

- [x] author key generated
- [x] public key published
- [x] manifest generated
- [x] manifest hash generated
- [x] manifest signed
- [x] proof page displays verification data

## 11. IPFS Later

- [ ] public build can be added to local IPFS
- [ ] CID captured
- [ ] CID added to manifest
- [ ] manifest re-signed after CID update

## 12. Privacy

- [x] no analytics
- [x] no remote fonts
- [x] no tracking cookies
- [x] no reader login
- [x] no public write API
- [x] no source maps in production by default
- [x] image metadata policy documented
- [x] operational privacy warnings documented
