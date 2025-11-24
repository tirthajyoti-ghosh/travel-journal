# 📘 Travel Journal

A cozy, minimal, single-user travel journal system built with **Expo (React Native)** and **Next.js**.

The goal is to have a distraction-free writing experience on mobile that publishes beautiful, static "notebook" pages to the web, using GitHub as a headless CMS and Google Photos for media hosting.

---

## 📂 Documentation

### **Project Overview**
*   [**Project Vision & Goals**](./docs/PROJECT_DOC.md) – The "why" and "what" of the project.
*   [**Technical Architecture**](./docs/TECHNICAL_DOC.md) – Deep dive into the tech stack, API flows (Google Photos, GitHub), and data model.

### **Design & UX**
*   [**Mobile App Design Guidelines**](./docs/MOBILE_APP_DESIGN_GUIDELINES_DOC.md) – UI/UX for the writing experience (the "Notebook").
*   [**Web App Design Guidelines**](./docs/WEBAPP_DESIGN_GUIDELINES_DOC.md) – UI/UX for the reading experience.
*   [**Typography System**](./docs/TYPOGRAPHY_DOC.md) – Fonts, weights, and usage rules.
*   [**Interactive Map Design**](./docs/MAP_TECHNICAL_DOC.md) – Technical design for the illustrated map interface.

### **Development**
*   [**Local Development Strategy**](./docs/LOCAL_DEVELOPMENT_DOC.md) – How to run the app/web locally, seed mock data, and test end-to-end.

---

## 🏗️ Repo Structure

*   `/app` – **Expo (React Native)** mobile application (Android).
*   `/webapp` – **Next.js** web application (Reader).
*   `/scripts` – Developer tooling (seed scripts, validation).
*   `/stories` – (Local Only) Generated seed data for local web development.

## 🚀 Quick Start

**1. Web App (Local UI Dev)**
```bash
npm install
npm run seed      # Generates fake content into /stories
cd webapp
npm run dev       # Starts Next.js reading from ../stories
```

**2. Mobile App (Local Dev)**
```bash
cd app
npx expo start
```

---

*built with ❤️ by a slow traveler.*

