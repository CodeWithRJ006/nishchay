# Deployment Guide

## Local Development
Run the stack locally using:
```bash
npm install
npm run demo:setup
npm run dev
```
By default, this runs on SQLite and stores files in the local filesystem.

## Docker Option
A `Dockerfile` is provided in the repository to build the monolith for containerized environments.
```bash
docker build -t nishchay .
docker run -p 3000:3000 -e DATABASE_URL="file:./data.db" nishchay
```

## Production Path

For full-scale production deployment, the following architecture is required:

1. **Database:** Migrate from SQLite to **PostgreSQL**. Update the Prisma schema `provider` and the `DATABASE_URL`.
2. **Storage:** Migrate the local upload directory to an **S3-compatible object storage** bucket.
3. **Key Management:** The `HMAC_SECRET` currently stored in `.env` must be rotated and delegated to a hardware security module (HSM) or a Cloud KMS.
4. **NIC MeghRaj Integration:** As specified in the project mandate, the production infrastructure is intended to be hosted within the NIC MeghRaj (GI Cloud) environment ensuring sovereign data residency.
