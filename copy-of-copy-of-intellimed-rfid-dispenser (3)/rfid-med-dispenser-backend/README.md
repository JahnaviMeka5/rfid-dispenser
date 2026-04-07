# RFID Medical Dispenser Backend

Simple Node/Express + Mongoose backend for your RFID-based medical dispenser.

## What is included
- `server.js` - single-file Express app exposing REST endpoints:
  - `POST /api/patients` (multipart form: name, rfid, photo) register patient
  - `POST /api/login` ({ rfid }) login by RFID
  - `POST /api/patients/:id/medications` add medication
  - `POST /api/dispense` record dispense events
  - `GET /api/patients/:id/photo` serve patient photo
- `package.json`
- `.env.example`

## Quick start (locally)
1. Copy `.env.example` to `.env` and set `MONGODB_URI`.
2. `npm install`
3. `npm start`

## Deploying to Google AI Studio (instructions provided in companion doc)
