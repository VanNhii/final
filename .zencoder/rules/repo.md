---
description: Repository Information Overview
alwaysApply: true
---

# Job Portal Repository Information

## Repository Summary
A full-stack job portal application with AI capabilities, consisting of a React frontend, Node.js backend, and two Python-based AI services for chat and recommendations.

## Repository Structure
- **fe/**: Frontend application (React, Vite).
- **be/**: Backend API (Node.js, Express).
- **ai_service/**: AI Chatbot service (Python, Flask, Transformers).
- **ai_service_recommend/**: AI Recommendation service (Python, Flask, Scikit-learn).

## Projects

### Frontend (fe)
**Configuration File**: `package.json`, `vite.config.js`

#### Language & Runtime
**Language**: JavaScript/JSX
**Runtime**: Node.js
**Build System**: Vite
**Package Manager**: npm/yarn (implied)

#### Dependencies
**Main Dependencies**:
- react, react-dom, react-router (v7)
- @reduxjs/toolkit, react-redux
- tailwindcss, @tailwindcss/vite
- socket.io-client
- axios (likely used, though not in main deps, possibly in sub-deps or util)
- chart.js, react-chartjs-2

**Development Dependencies**:
- vite, eslint

#### Build & Installation
```bash
npm install
npm run dev   # Start dev server
npm run build # Build for production
```

### Backend (be)
**Configuration File**: `package.json`

#### Language & Runtime
**Language**: JavaScript
**Runtime**: Node.js (>=16.0.0)
**Framework**: Express

#### Dependencies
**Main Dependencies**:
- express, mongoose, socket.io
- jsonwebtoken, bcryptjs
- nodemailer, multer, cloudinary
- node-cron

**Development Dependencies**:
- jest, supertest, nodemon, eslint

#### Build & Installation
```bash
npm install
npm run dev   # Start with nodemon
npm start     # Start production server
```

#### Testing
**Framework**: Jest
**Run Command**:
```bash
npm test
```

### AI Service (ai_service)
**Configuration File**: `requirements.txt`

#### Language & Runtime
**Language**: Python
**Version**: 3.11.x
**Framework**: Flask

#### Dependencies
**Main Dependencies**:
- tensorflow, torch, transformers (AI/ML)
- nltk, gensim (NLP)
- pymongo (Database)
- flask, flask-restful (API)

#### Testing
**Framework**: Pytest
**Run Command**:
```bash
pytest
```

### AI Recommendation Service (ai_service_recommend)
**Configuration File**: `requirements.txt`

#### Language & Runtime
**Language**: Python
**Version**: 3.12.x
**Framework**: Flask

#### Dependencies
**Main Dependencies**:
- scikit-learn, pandas, numpy (ML/Data)
- tensorflow, torch (DL)
- pymongo (Database)
- flask, flask-restful (API)

#### Testing
**Framework**: Pytest
**Run Command**:
```bash
pytest
```
