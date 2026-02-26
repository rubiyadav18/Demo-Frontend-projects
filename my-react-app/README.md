# Store — Products & Customers

A simple, deployable frontend that displays **product listing** and **customer listing** with images and animations.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build for production

```bash
npm run build
```

Output is in the `dist` folder. Preview with:

```bash
npm run preview
```

## Deploy

### Vercel (recommended)

1. Push this project to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo.
3. Vercel will detect Vite; keep default settings and deploy.

Or use the CLI:

```bash
npx vercel
```

### Netlify

1. Push to GitHub and connect the repo in Netlify.
2. Build command: `npm run build`
3. Publish directory: `dist`

### Other hosts

Upload the contents of the `dist` folder to any static host (e.g. GitHub Pages, Cloudflare Pages).
