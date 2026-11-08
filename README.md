# HSE Hazard & Near Miss Reporting Portal - Full Rebuild Technical Manual

This is a professional-grade, full-stack, enterprise-ready HSE (Health, Safety, and Environment) Hazard & Near Miss Reporting Portal, designed to coordinate workplace safety (K3) and incident mitigation at the university level.

---

## 📐 System Architecture Diagram

```
         [ Employee / Student ]
                   │ (Scans K3 QR Code / Clicks Link)
                   ▼
       [ Microsoft Forms Entry ]
                   │
                   ▼ (Autosaved Row)
       [ Excel Online Spreadsheet ]
                   │
                   ▼ (Triggers Event Flow)
      [ Power Automate / Zapier Hub ]
                   │
                   ▼ (Secure HTTPS POST JSON)
       [ Express Backend Webhook ] ───▶ [ /api/hazard-report ]
                   │
                   ▼ (Real-time DB Insert)
     [ Firebase Firestore Database ]
                   │
                   ▼ (Real-time onSnapshot Synchronization)
      [ HSE Portal Client WebApp ]
      ├───▶ [ KPI Dashboards & Charts (Recharts) ]
      ├───▶ [ Audit Trail (Immutable Log Book) ]
      └───▶ [ Notification Alerts Center ]
```

---

## ⚙️ Real-Time Synchronization & Webhook Specifications

To establish real-time synchronization between **Microsoft Forms** and this **HSE Portal**, configure an automated event flow through **Power Automate** (or Zapier / Make.com):

### 1. Webhook Endpoint Specification
- **Method:** `POST`
- **Path:** `/api/hazard-report`
- **Headers:** `Content-Type: application/json`

### 2. Request Body Payload (JSON)
```json
{
  "title": "Boiler Room Valve Leakage",
  "description": "Pressure valve exhibiting audible whistle and high-temperature steam leaks.",
  "department": "Maintenance & Facilities",
  "area": "Boiler Room Annex B",
  "reporterName": "Wawan Setiawan",
  "reporterEmail": "wawan.prod@university.edu",
  "employeeId": "EMP-9021"
}
```

### 3. Power Automate Integration Setup Steps
1. Create a flow: **Automated cloud flow**.
2. Trigger: Select **"When a new response is submitted"** in Microsoft Forms.
3. Action 1: Add **"Get response details"** to retrieve form parameters.
4. Action 2: Add **"HTTP"** connector.
   - **Method:** `POST`
   - **URI:** `https://your-development-app-url/api/hazard-report`
   - **Headers:** `Content-Type` : `application/json`
   - **Body:** Map dynamic fields retrieved in Action 1 using the JSON format specified in Step 2.
5. Save and enable. Every new submission will now appear on the portal instantly without reloading!

---

## 🧠 DFA Validation State Machine Engine

Status transitions on reported hazards follow strict Deterministic Finite Automaton (DFA) logic, guaranteeing compliance tracking. Unauthorized state-skips are rejected.

### Formal DFA Specification:
- **Alphabet of States (Q):**
  1. `Pending Validation` (Starting state)
  2. `New Report`
  3. `Under Review`
  4. `Sedang Didiskusikan`
  5. `Dalam Pengecekkan Kerusakan`
  6. `Dalam Proses Pengajuan Dana`
  7. `Sedang Dikerjakan`
  8. `Menunggu Verifikasi`
  9. `Selesai` (Final Accepting State)

- **Starting State (q0):** `Pending Validation`
- **Accepting State (F):** `Selesai`

### Transition Matrix (Permitted Pathways):
```
[Pending Validation]  ──▶ [New Report]
[New Report]          ──▶ [Under Review]
[Under Review]        ──▶ [Sedang Didiskusikan]
[Sedang Didiskusikan] ──▶ [Dalam Pengecekkan Kerusakan]
[Dalam Pengecekkan Kerusakan] ──▶ [Dalam Proses Pengajuan Dana] OR [Sedang Dikerjakan]
[Dalam Proses Pengajuan Dana] ──▶ [Sedang Dikerjakan]
[Sedang Dikerjakan]   ──▶ [Menunggu Verifikasi]
[Menunggu Verifikasi] ──▶ [Selesai]
```

---

## 🏷️ Hazard Categorization Keyword Engine

When reports are received via webhook, they are run through a safety classifier:
* **Category A (Personal Protective Equipment - APD):**
  - **Keywords:** `apd`, `helm`, `masker`, `sarung tangan`, `safety helmet`, `safety shoes`, `sepatu safety`.
  - **Recipients:** Supervisor, HSE Team, CEO, Procurement.
* **Category B (Waste, Fluids, Transport Logistics):**
  - **Keywords:** `limbah`, `sampah`, `driver`, `bus`, `kendaraan`, `transport`, `oli`, `solar`.
  - **Recipients:** Supervisor, HSE Team, CEO, Transport PIC.
* **Category C (Structural, General Campus Safety):**
  - **Keywords:** *Default (if no Category A or B keywords are matched).*
  - **Recipients:** Supervisor, HSE Team, CEO.

---

## 🔒 Row Level & Security Credentials (Approved Users)

The Officer Panel is protected by Authentication. Default pre-hashed accounts are pre-seeded on database startup:

1. **HSE Coordinator (Admin Role):**
   - **Email:** `admin@hseportal.com`
   - **Password:** `HseAdmin123!`
   - **Capabilities:** Advance DFA states, assign PIC, post compliance notes, view raw audit log, view charts.
2. **Operations Director (Management Role):**
   - **Email:** `management@hseportal.com`
   - **Password:** `HseMgmt123!`
   - **Capabilities:** Read-only charts, compile and export Friday K3 weekly summaries to Excel or PDF.

---

## 🚀 Running locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
```bash
npm run dev
```

### 3. Build & Run in Production Mode
```bash
npm run build
npm run start
```
