# AI Study Material Organizer (MVP)

An intelligent web application that automatically organizes a student's study material into 3rd-semester subject folders using AI classification.

---

## 1. The Annoyance

Students accumulate dozens of PDF lecture notes, C/C++/Java/Python source code snippets, and Markdown/TXT files throughout the semester. These files end up scattered in downloads folders or messy directories. Searching for study materials right before exams or assignments becomes frustrating and time-consuming.

---

## 2. The Constraint (No Mouse)

This application was engineered specifically under a strict **No Mouse** accessibility constraint. 
- The entire user interface is **100% usable with only a keyboard** (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Arrow Keys`, `Escape`).
- Incorporates high-contrast visible focus indicators (`:focus-visible`), semantic HTML5 elements (`<header>`, `<main>`, `<nav>`, `<section>`, `<button>`, `<label>`), and screen reader live regions (`aria-live="polite"`).

---

## 3. The Great Part

> **Drop mixed study material → AI automatically extracts text, analyzes content, and sorts it into the correct semester subject folder.**

---

## 4. Current Supported 3rd-Semester Subjects

The MVP classifies study materials into **exactly ONE** of these 5 core subjects:

1. **Discrete Mathematics** (Logic, set theory, combinatorics, graph theory, proofs)
2. **DSA** (Data Structures & Algorithms: arrays, trees, graphs, sorting, searching, recursion)
3. **OOP** (Object-Oriented Programming: classes, inheritance, polymorphism, encapsulation)
4. **DBMS** (Database Management Systems: SQL, normalization, ER diagrams, transactions)
5. **LDM** (Logic Design & Microprocessors: Boolean algebra, K-maps, logic gates, flip-flops, 8086)

---

## 5. Testers Log

### Tester 1
- **Where they got stuck**: Attempted to upload a file using keyboard navigation but missed focus visibility on custom label controls.
- **What was changed**: Added explicit high-contrast focus rings (`outline: 3px solid var(--focus-ring)`), ARIA labels, and added an interactive **Keyboard Guide** modal in the header.

### Tester 2
- **Where they got stuck**: Uploaded an image-only scanned PDF with no readable text, leading to unhandled backend errors.
- **What was changed**: Implemented text extraction validation in `services/extractor.py`. Now returns an explicit, user-friendly message: *"We couldn't extract readable text from this PDF. OCR support is not included in this MVP."*

---

## 6. AI Usage Documentation

- **What AI was used for**: Automatic text extraction analysis and subject classification using structured LLM prompts.
- **AI-assisted components**: Backend AI classifier module (`services/classifier.py`) and prompt schema design.
- **Development Mistake & Fix**:
  - *Mistake*: During early testing, the AI model returned arbitrary subject names outside the curriculum (e.g. `Computer Networks` or `Software Engineering`).
  - *Fix*: Implemented strict server-side validation in `services/classifier.py` and `routes/upload.py` against the `ALLOWED_SUBJECTS` array. If an invalid subject is returned or confidence is below 65%, the system prompts the user to confirm or select the subject manually.

---

## 7. Scope & Not Done Yet

- **Topic-wise classification is NOT implemented yet.**
  - *Current MVP behavior*: `OOP` ➔ `inheritance.cpp`
  - *Future feature*: `OOP` ➔ `Inheritance` ➔ `inheritance.cpp`

---

## 8. Technology Stack

- **Frontend**: React, Vite, JavaScript, Custom Accessible CSS, Lucide React icons.
- **Backend**: Python 3.13, FastAPI, Uvicorn, SQLAlchemy.
- **Database**: SQLite (`study_organizer.db`).
- **File Extraction**: PyMuPDF (`fitz`) for PDFs, standard UTF-8 text reading for source code (`.cpp`, `.py`, `.java`, etc.).
- **AI Classification**: OpenRouter LLM API (with heuristic keyword fallback for offline execution).

---

## 9. Environment Variables

Create a `.env` file in the project root or backend folder based on `.env.example`:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
DATABASE_URL=sqlite:///./study_organizer.db
OPENROUTER_MODEL=google/gemini-2.5-flash
```

*(Note: If `OPENROUTER_API_KEY` is omitted, the application seamlessly uses built-in keyword heuristic classification).*

---

## 10. Running Locally

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Backend running at: `http://127.0.0.1:8000`  
Health check endpoint: `http://127.0.0.1:8000/health`

### Frontend Setup

```bash
cd frontend
npm install
npx vite --host 127.0.0.1 --port 5173
```
Frontend running at: `http://127.0.0.1:5173`

---

## 11. Definition of Done Checklist

- [x] PDF text extraction and source code reading implemented.
- [x] AI subject classification into 5 exact subjects with validation.
- [x] Low confidence confirmation flow (< 65% confidence).
- [x] SQLite database storage of metadata (`materials` table).
- [x] Full keyboard navigation (`Tab`, `Space`, `Enter`, `Arrows`, `Escape`).
- [x] Visible focus indicators & screen reader support (`aria-live`).
- [x] Responsive layout for Laptop and Mobile.
- [x] Material viewing, downloading, and deletion with confirmation dialog.
- [x] Health check endpoint `GET /health` returning `{"status": "ok"}`.
