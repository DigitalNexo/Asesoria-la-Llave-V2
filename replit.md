# Asesoría La Llave - Sistema de Gestión Profesional

## Overview

Asesoría La Llave is a comprehensive management system for consultancies, designed to streamline operations and improve efficiency. It provides robust control over critical business processes through modules for client management, tax processing, task management, and advanced internal manuals. The system features authentication, detailed client and tax management, dynamic task tracking, an advanced knowledge base, and real-time notifications, aiming to be a complete digital solution for professional service firms.

## User Preferences

I prefer simple language in explanations.
I want iterative development.
Ask before making major changes.
Do not make changes to the folder `Z`.
Do not make changes to the file `Y`.

## System Architecture

The system employs a client-server architecture with a clear separation between frontend and backend.

**UI/UX Decisions:**
- **Color Palette:** Primary (Navy Blue #1E3A8A), Accent (Orange #F97316), Text (Dark Gray #374151), Background (White #FFFFFF).
- **Typography:** Inter (General), Plus Jakarta Sans (Titles).
- **Design Features:** Dark/light mode, responsive design, Shadcn UI components, smooth animations, and an elevation system for interactive elements.

**Technical Implementations:**
- **Authentication & Authorization:** JWT for secure login, bcrypt for password hashing, and a robust Role-Based Access Control (RBAC) system with granular permissions. Initial administrator creation is automated on first startup.
- **Data Management:** Full CRUD operations with validation across modules.
- **File Management:** Handles file uploads (PDFs, Word, Excel, images, max 10MB) for taxes and manuals with configurable storage providers, AES-256-GCM encrypted credentials, automatic migration, and WebSocket progress tracking.
- **Content Creation:** An advanced internal manuals module features a rich text editor (TipTap v3.7.0) with comprehensive formatting tools, drag & drop image support, versioning, automatic table of contents, templates, tags, and PDF export.
- **Notifications:** Nodemailer sends email notifications, and Socket.IO provides real-time notifications and user presence. A multi-account notification system with encrypted SMTP accounts, template editor, dynamic variable insertion, and scheduled sending is production-ready.
- **Auditing:** Comprehensive logging of all CREATE/UPDATE/DELETE operations with before/after values and a visual diff viewer.
- **Search:** Global real-time search (⌘K / Ctrl+K) across clients, tasks, taxes, and manuals.
- **Reporting:** Dashboard displays visual metrics using Recharts for active clients, tax status, task distribution, and published manuals.
- **Admin Panel:** Centralized control for user management, roles, activity logs, SMTP configuration, user registration, and GitHub configuration for auto-updates.
- **Automatic Tax Generation:** Generates `ClientTax` records for all periods of selected models when tax models are assigned to a client.
- **Backup Configuration System:** Configurable backup naming patterns with dynamic variables, stored in SystemConfig, and managed via admin panel UI.
- **Auto-Update System with Backup/Restore:** Complete self-update system that checks GitHub for new versions, creates automatic backups (database, code zip, file uploads) before updates, and provides rollback capability. Real-time WebSocket logging provides live progress feedback.

**Feature Specifications:**
- **Client Management:** Tracks autonomous and enterprise clients with a many-to-many employee assignment system allowing primary employee designation, filtering, CSV export, and a complete REST API.
- **Tax Management:** Complete tax control system based on AEAT specifications including master catalog of tax models, official tax calendar synchronization, client-specific tax assignments with periodicidad, and individual tax declarations tracking. Full CRUD REST API endpoints for all entities with audit logging and proper RBAC authorization.
- **Task System:** Supports general and personal tasks with priorities, states (PENDIENTE, EN_PROGRESO, COMPLETADA), Kanban view with drag & drop, and user assignment.

**System Design Choices:**
- **Modularity:** Distinct modules for maintainability and scalability.
- **Database Schema:** MariaDB managed via Prisma ORM.
- **Frontend Routing:** Wouter.
- **State Management:** TanStack Query (React Query) for data fetching and caching, React Context for global state.

## External Dependencies

- **Backend:**
    - **Node.js + Express + TypeScript:** Core server.
    - **JWT:** Authentication.
    - **Bcrypt:** Password hashing.
    - **Multer:** File uploads.
    - **Nodemailer:** Email sending.
    - **express-validator:** Request validation.
    - **express-rate-limit:** Rate limiting.
    - **Helmet + CORS:** Security and CORS handling.
    - **Socket.IO:** Real-time communication.
- **Frontend:**
    - **React 18 + Vite + TypeScript:** Core frontend.
    - **TailwindCSS + Shadcn UI:** Styling and UI components.
    - **TanStack Query v5 (React Query):** Server state management.
    - **React Hook Form + Zod:** Form management and validation.
    - **Wouter:** Routing.
    - **TipTap:** Rich text editor.
    - **Recharts:** Charting and data visualization.
- **Database:**
    - **MariaDB:** Relational database.
    - **Prisma ORM:** ORM for Node.js and TypeScript.