# UI Design System

## 1. Aesthetic Direction

The blog should feel:

```txt
self-owned
calm
futuristic
literary
technical
private
readable
```

It should not feel:

```txt
startup SaaS dashboard
marketing landing page
crypto casino
generic Bootstrap admin
over-animated portfolio
```

## 2. Visual Defaults

| Area | Decision |
|---|---|
| Mode | Dark-first |
| Fonts | System font stacks only |
| Layout | Spacious, readable |
| Motion | Subtle CSS-only |
| Color | Warm neutral text, quiet gradients |
| Components | Custom |
| Accessibility | High contrast, keyboard usable |

## 3. Font Policy

Allowed:

```css
font-family:
  ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;

font-family:
  ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

font-family:
  ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

Forbidden:

```txt
Google Fonts
Adobe Fonts
remote font CDNs
```

## 4. CSS Architecture

Use:

```txt
src/styles/tokens.css
src/styles/base.css
src/styles/prose.css
src/styles/layout.css
```

Components:

```txt
src/components/ui/Button.tsx
src/components/ui/Card.tsx
src/components/ui/Chip.tsx
src/components/ui/Input.tsx
src/components/ui/Textarea.tsx
src/components/ui/StatusBadge.tsx
```

## 5. CSS Tokens

Required token groups:

- colors
- typography
- spacing
- radius
- shadows
- borders
- z-index
- motion duration

## 6. Public Pages

Public pages:

```txt
/
 /post/:slug
 /about
 /proof
```

Home should include:

- title/identity
- short philosophical line
- latest posts
- tags
- footer note: `No DNS. No analytics. No public login.`

Post page should include:

- title
- excerpt
- date
- tags
- prose content
- technical metadata panel

## 7. Admin Pages

Admin pages:

```txt
/admin
/admin/posts
/admin/posts/new
/admin/posts/:id/edit
```

Admin design can be practical but should still visually match the public system.

Admin must show:

```txt
Admin is designed for local use only.
```

## 8. JavaScript Policy

Vanilla JS/React interactivity is allowed for:

- UI polish
- admin editor
- preview
- search/filtering
- transitions
- navigation

JavaScript must not be used for:

- tracking readers
- fingerprinting
- loading third-party scripts
- public analytics
