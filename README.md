# Interview Ramp

**Course:** CMPE 295 — Master's Project

Interview Ramp is a full-stack web application that enables software engineers to practice mock technical interviews with real peers or friends in a live, structured environment. Unlike passive LeetCode grinding, Interview Ramp replicates the *actual interview experience* — two participants, live video/audio, a shared code editor, a countdown timer, and post-session feedback from both a human partner and an AI coach.

## 🌟 Key Features

- **Live Peer-to-Peer Mock Interviews:** Real-time video, audio, and chat built on LiveKit.
- **Shared Workspace:** Real-time code syncing powered by Monaco Code Editor (supports Python, JS, TS, Java, C++, Go) via WebSockets.
- **Code Execution:** Run and test code against hidden test cases using Judge0 CE.
- **Structured Feedback:** AI-powered coaching (GPT-4o) and peer rubric grading.
- **Matchmaking & Scheduling:** Instantly match with peers based on track (DSA/Behavioral), difficulty, and availability. Or invite friends directly via email.
- **Analytics Dashboard:** Track your progress, interview history, and performance metrics over time.

## 🏗 Tech Stack

**Frontend:**
- Next.js 16 (App Router, SSR)
- React 19
- TypeScript
- Tailwind CSS
- Clerk (Authentication)
- LiveKit (WebRTC)
- Monaco Editor

**Backend:**
- FastAPI (Python)
- WebSockets for real-time code sync
- PostgreSQL (Neon.tech)
- MongoDB (Atlas)
- Judge0 CE (Code Execution Sandbox)
- OpenAI GPT-4o
- Docker & Google Cloud Run

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.11+)
- PostgreSQL (local or cloud)
- MongoDB (local or cloud)
- [Clerk Account](https://clerk.com/)
- [LiveKit Cloud Account](https://livekit.io/)
- [OpenAI API Key](https://openai.com/)

### 1. Clone the repository

```bash
git clone <repository_url>
cd CMPE-295-Final-Year-Project
```

### 2. Backend Setup

Navigate to the `backend` directory:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows use `.venv\Scripts\activate`
pip install -r requirements.txt
```

Create a `secrets/.env` file based on the environment variables defined in the documentation. 
Start the backend server:
```bash
uvicorn main:app --reload --port 4000
```

### 3. Frontend Setup

Navigate to the `client` directory:
```bash
cd client
npm install
```

Create a `.env.local` file with your frontend API keys (Clerk, LiveKit, API URL).
Start the frontend development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## 📚 Documentation

Detailed documentation on project architecture, database schemas, API references, and deployment can be found in the [`docs/`](./docs) directory:

- [Project Explanation](./docs/project_explanation.md)
- [Architecture & Design](./docs/project_architecture.md)
- [User Flow](./docs/user_flow.md)
- [Authentication](./docs/user_authentication.md)
- [Deployment Information](./docs/deployment_information.md)
- [API & WebSocket Routing](./docs/api-auth-scheduling.md)
