# Frontend Cloud Run Deployment Guide

This document contains the standard commands to update and deploy your Next.js frontend to Google Cloud Run.

**Important:** Make sure your terminal is inside the `client` directory before running any of these commands.

```bash
cd client
```

---

## 1. Rebuild the Docker Image

We use the `--platform linux/amd64` flag so that the image is built for Google Cloud's servers, not your Mac's Apple Silicon chip.

*(Note: Next.js reads your local `.env.local` during this build step to hardcode the `NEXT_PUBLIC_` variables into the static website files).*

```bash
docker build --platform linux/amd64 -t us-central1-docker.pkg.dev/interviewramp-495402/frontend-repo/interview-ramp-frontend:latest .
```

---

## 2. Push the Image to Google Cloud

Upload the newly built image to Artifact Registry.

```bash
docker push us-central1-docker.pkg.dev/interviewramp-495402/frontend-repo/interview-ramp-frontend:latest
```

---

## 3. Deploy to Cloud Run

Deploy the frontend container. We use `--set-env-vars` to pass the `CLERK_SECRET_KEY` to the Next.js server so that API routes and server actions can authenticate users.

```bash
gcloud run deploy interview-ramp-frontend \
  --image=us-central1-docker.pkg.dev/interviewramp-495402/frontend-repo/interview-ramp-frontend:latest \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="CLERK_SECRET_KEY=sk_test_Qs7XINgyBXdSv04uN0JVjCy3XhODxy57kRkK2vRSmM"
```
*(If your Clerk Secret Key ever changes, just update it in that command).*
