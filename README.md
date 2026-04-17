# Rampage Photography

Photo portfolio built with Next.js 16. The site includes a public gallery plus a password-protected admin flow for uploading, editing, and deleting photos.

## Local development

Create a local env file and set the admin password:

```bash
cp .env.example .env.local
```

Run the app:

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

## Docker

This repo is configured for a production Docker build using Next.js `output: "standalone"`.

Build the image:

```bash
docker build -t rampage-photography .
```

Run the container:

```bash
docker run --rm -p 3000:3000 \
  -e ADMIN_PASSWORD='change-this-to-a-long-random-string' \
  rampage-photography
```

Open `http://localhost:3000`.

Or with Docker Compose:

```bash
export ADMIN_PASSWORD='change-this-to-a-long-random-string'
docker compose up --build
```

### Persistent uploads

The app treats `public/photos` as the source of truth for what exists, and stores editable metadata in `data/photos.json`. In a plain container these changes live only inside the container filesystem, so they are lost when the container is replaced.

For a real deployment, use one of these approaches:

- mount persistent storage into `/app/public/photos` and `/app/data`
- move photo storage and metadata to external storage instead of the container filesystem

## Production notes

- Set `ADMIN_PASSWORD` in the runtime environment.
- The container listens on port `3000`.
- `HOSTNAME=0.0.0.0` is already configured in the image so it can accept external traffic.
