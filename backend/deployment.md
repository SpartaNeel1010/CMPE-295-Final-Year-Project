# GCP Cloud Run Deployment Guide

This document contains the standard commands to update and deploy the backend to Google Cloud Run whenever you make changes to the code or environment variables.

**Important:** Make sure your terminal is inside the `backend` directory before running any of these commands.

```bash
cd backend
```

---

## 1. Updating Secrets (Only if you changed `secrets/.env`)

If you added, removed, or modified any variables inside `backend/secrets/.env`, you must push those changes to Google Cloud Secret Manager *before* you deploy.

```bash
gcloud secrets versions add backend-env-file --data-file="secrets/.env"
```
*(If you only changed Python code and not the `.env` file, you can skip this step.)*

---

## 2. Rebuild the Docker Image

Google Cloud Run servers use Intel/AMD processors, so we must explicitly build the image for the `linux/amd64` platform (especially if you are building this on an Apple Silicon M1/M2/M3 Mac).

```bash
docker build --platform linux/amd64 -t us-central1-docker.pkg.dev/interviewramp-495402/backend-repo/interview-ramp-backend:latest .
```

---

## 3. Push the Image to Google Cloud Artifact Registry

Upload the newly built image to your Google Cloud project.

```bash
docker push us-central1-docker.pkg.dev/interviewramp-495402/backend-repo/interview-ramp-backend:latest
```

---

## 4. Deploy to Cloud Run

Deploy the new image to Cloud Run. This command uses `--set-secrets` to safely mount your Secret Manager variables to the `/secrets/.env` path, where `app/config.py` is configured to find them.

```bash
gcloud run deploy interview-ramp-backend \
  --image=us-central1-docker.pkg.dev/interviewramp-495402/backend-repo/interview-ramp-backend:latest \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-secrets=/secrets/.env=backend-env-file:latest
```

---

### Helpful Commands for Debugging

If the deployment succeeds but the container crashes, you can fetch the most recent logs using this command:

```bash
gcloud run services logs read interview-ramp-backend --region=us-central1 --limit=100
```
