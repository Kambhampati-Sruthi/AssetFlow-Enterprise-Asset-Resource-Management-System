# 🏢 AssetFlow — Enterprise Asset & Resource Management System

> A full-stack, single-page ERP web application for tracking, allocating, and maintaining physical assets across any organization — built with a Flask REST API backend and a responsive glassmorphic UI.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Roles & Permissions](#roles--permissions)
- [Database Schema](#database-schema)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**AssetFlow** is a centralized ERP platform designed to eliminate the inefficiencies of spreadsheets and paper logs. It provides structured asset lifecycles, real-time resource booking, and live visibility into who holds what, where it is, and its current condition.

Any organization with physical assets — offices, schools, hospitals, factories — can use AssetFlow to:

- Track every asset from procurement to disposal
- Allocate and return equipment across departments
- Book shared resources (rooms, vehicles) with conflict detection
- Raise and resolve maintenance tickets
- Conduct audit campaigns and close discrepancies
- Monitor real-time dashboards and generate reports

---

## ✨ Features

| Module | Capabilities |
|--------|-------------|
| **Dashboard** | Live KPI cards, category breakdown chart, recent activity timeline |
| **Asset Registry** | Add, edit, search, filter assets by category/status/department |
| **Allocations** | Assign/return assets with history tracking and condition notes |
| **Resource Booking** | Reserve shared spaces/equipment with overlap conflict detection |
| **Maintenance** | Log tickets, assign technicians, track repair status |
| **Audit Management** | Create audit campaigns, verify assets, close with discrepancy reports |
| **Reports** | Generate asset utilization, maintenance cost, and audit summary reports |
| **User Management** | Role-based access control with department assignments |
| **Settings** | System configuration, category management, department settings |

### 🔑 Key Technical Highlights

- **Live Flask REST API** — All CRUD operations persist in a real SQLite database
- **Offline Fallback** — Automatically switches to `localStorage` sandbox if the server is offline
- **Role-Based Authorization** — UI adapts dynamically to Admin / Asset Manager / Department Head / Employee roles
- **Input Validation** — Robust client-side validation with real-time error feedback
- **Booking Conflict Detection** — SQL-level overlap query prevents double bookings
- **Audit Lifecycle** — Closing an audit auto-marks unverified assets as "Lost"

---

## 🛠 Tech Stack

### Frontend
| Technology | Usage |
|-----------|-------|
| **HTML5** | Semantic SPA structure |
| **Vanilla CSS3** | Glassmorphic dark-mode design, CSS animations, responsive grid |
| **Vanilla JavaScript (ES6+)** | Async/Await fetch calls, DOM manipulation, localStorage fallback |

### Backend
| Technology | Usage |
|-----------|-------|
| **Python 3.x** | Server-side language |
| **Flask** | Lightweight REST API framework |
| **Flask-CORS** | Cross-Origin Resource Sharing for frontend–backend communication |
| **SQLite3** | Embedded relational database (zero configuration) |

---

## 📁 Project Structure

```
assetflow/
│
├── index.html          # Frontend SPA — contains all 10 screen containers
├── style.css           # Premium glassmorphic dark-mode CSS + animations
├── app.js              # Frontend logic: API calls, routing, fallback engine
├── data.js             # Seed constants for offline localStorage sandbox
│
├── server.py           # Flask REST API — schema setup, seeding, all endpoints
├── assetflow.db        # SQLite database (auto-created on first run)
│
├── .gitignore          # Ignores assetflow.db, __pycache__, IDE files
└── README.md           # This file
```

---

## 🚀 Getting Started

### Prerequisites

- Python **3.8+** installed
- pip (comes with Python)
- A modern browser (Chrome, Edge, Firefox)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/assetflow.git
cd assetflow
```

### 2. Install Python Dependencies

```bash
python -m pip install flask flask-cors
```

### 3. Start the Backend Server

```bash
python server.py
```

You should see:
```
Database is empty. Seeding initial ERP datasets...
Database seeding completed successfully.
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

> The `assetflow.db` SQLite file is created automatically on first run with pre-loaded demo data.

### 4. Open the Frontend

Open `index.html` in your browser (double-click or drag it into Chrome/Edge).

The **status badge** in the top header will show **🟢 Live Database** when connected to the Flask API.

---

## 📡 API Reference

Base URL: `http://127.0.0.1:5000/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | Authenticate a user by email + password |
| `GET` | `/assets` | List all assets (supports `?search=`, `?category=`, `?status=`) |
| `POST` | `/assets` | Create a new asset |
| `PUT` | `/assets/<id>` | Update an existing asset |
| `DELETE` | `/assets/<id>` | Delete an asset |
| `GET` | `/allocations` | List all allocation records |
| `POST` | `/allocations` | Allocate an asset to an employee |
| `PUT` | `/allocations/<id>/return` | Return an allocated asset |
| `GET` | `/bookings` | List all resource bookings |
| `POST` | `/bookings` | Create a new booking (checks overlap) |
| `DELETE` | `/bookings/<id>` | Cancel a booking |
| `GET` | `/maintenance` | List all maintenance tickets |
| `POST` | `/maintenance` | Create a maintenance ticket |
| `PUT` | `/maintenance/<id>` | Update ticket status / close ticket |
| `GET` | `/audits` | List audit campaigns |
| `POST` | `/audits` | Create a new audit campaign |
| `PUT` | `/audits/<id>/close` | Close an audit and generate discrepancy report |
| `GET` | `/reports` | Fetch aggregated statistics for reports page |
| `GET` | `/employees` | List all employees |
| `GET` | `/departments` | List all departments |
| `GET` | `/categories` | List all asset categories |
| `GET` | `/logs` | Fetch the system activity log |

---

## 👥 Roles & Permissions

AssetFlow implements a **4-tier Role-Based Access Control (RBAC)** system:

| Role | Access Level |
|------|-------------|
| **Admin** | Full system access — can create/edit/delete anything, manage users, view all reports |
| **Asset Manager** | Manage assets, allocations, maintenance, audits; cannot manage users |
| **Department Head** | View department assets, approve transfers, request maintenance |
| **Employee** | View assigned assets, request bookings, log maintenance issues |

Switch roles using the **User/Role switcher** in the top navigation header for testing purposes.

---

## 🗄 Database Schema

The SQLite database contains the following tables:

```
employees     — User accounts with roles and departments
departments   — Organizational units with hierarchy
categories    — Asset type templates with custom field definitions
assets        — Core asset records (lifecycle, status, location, condition)
allocations   — Assignment history (who holds what asset, when)
bookings      — Resource reservations with time ranges
maintenance   — Repair tickets with status tracking
audits        — Audit campaigns with asset verification records
logs          — Immutable system activity log
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "Add: your feature description"`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

> **Note**: All team members should create their own branches and submit pull requests. Committing directly to `main` is discouraged.

### Commit Message Convention

```
Add:      New feature or file
Fix:      Bug fix
Update:   Modifying existing functionality
Docs:     Documentation changes
Style:    CSS/UI-only changes
Refactor: Code restructuring without behavior change
```

---

## 👨‍💻 Team

Built with ❤️ for the Hackathon.

| Role | Responsibility |
|------|---------------|
| Backend Developer | Flask API, SQLite schema, REST endpoints |
| Frontend Developer | HTML/CSS/JS SPA, UI components, animations |
| Full-Stack / Integration | API integration, offline fallback, CORS config |
| QA / Design | Testing, responsive design, user validation |

---

> **AssetFlow** — *Simplifying how organizations see, track, and manage what they own.*
