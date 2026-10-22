# Navigo

Navigo is an enterprise-grade, collaborative project and task management application (Kanban board) built with a secure, highly scalable, and decoupled full-stack architecture available at https://app.zland.in.

---

## 🚀 Features

- **Kanban Task Board:** Interactive and intuitive project boards for task tracking, categorization, and updates.
- **Project Workspaces:** Collaborate across different projects, invite members, and manage roles.
- **Robust RBAC & Security:** Advanced role-based access control secured via token authentication (RSA key pairs) and Amazon Cognito.
- **Analytics Dashboard:** Real-time summary and activity tracking.
- **Automated Invitations:** Seamless user onboarding with SendGrid-powered SMTP invitation flows.

---

## 🛠️ Tech Stack

### Backend
- **Framework:** [Spring Boot 3.2.5](https://spring.io/projects/spring-boot) (Java 21)
- **Database:** [MongoDB](https://www.mongodb.com/) (Spring Data MongoDB)
- **Security:** Spring Security (OAuth2 Resource Server with JWT/JWKS verification)
- **Mailer:** SendGrid SMTP Relay (Spring Mail)
- **Containerization:** Multi-stage Docker build

### Frontend
- **Framework/Build Tool:** [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **UI & Styling:** [Material UI (MUI)](https://mui.com/)
- **State Management:** Redux Toolkit (RTK) + Axios for API communication
- **Routing:** React Router 7

### Infrastructure & DevOps
- **Local Orchestration:** [Docker Compose](https://docs.docker.com/compose/)
- **Hosting (Frontend):** AWS S3 (Static Website Hosting) + Amazon CloudFront (CDN with OAC)
- **Hosting (Backend):** AWS EC2 + Nginx (Reverse proxy)
- **Authentication provider:** Amazon Cognito User Pool
- **CI/CD:** GitHub Actions pipelines (automated testing, image building, Docker Hub push, and AWS synchronization)

---

## 📁 Repository Structure

```text
├── .github/             # GitHub Actions CI/CD workflows
├── .bob/                # Assistant/tool-specific assets
├── backend/             # Spring Boot Maven backend application
│   ├── src/             # Java source code & configuration
│   └── Dockerfile       # Multi-stage Docker build config for backend
├── docs/                # Detailed deployment guides
│   ├── deploy-backend.md
│   └── deploy-frontend.md
├── frontend/            # Vite + React frontend SPA
│   ├── src/             # Components, pages, Redux slices, API layer
│   └── Dockerfile       # Production-ready Docker build with Nginx SPA routing
├── infra/               # CloudFront SPA rewriting routing rules
├── secrets/             # Directory for private/public RSA key PEMs
└── docker-compose.yml   # Multi-container orchestration spec
```

---

## ⚙️ Getting Started

### Prerequisites
Make sure you have the following installed locally:
- **Java 21** & **Maven 3.9+** (if running backend bare-metal)
- **Node.js 18+** & **npm** (if running frontend bare-metal)
- **Docker** & **Docker Compose**
- **MongoDB** instance (local or Atlas cluster)

---

### Setup & Configuration

#### 1. Generate RSA JWT Keys
The application uses RS256 (RSA with SHA-256) for token validation. Create a `secrets/` directory in the root folder and generate the PEM files:

```bash
mkdir secrets
openssl genrsa -out secrets/jwt_private.pem 2048
openssl rsa -pubout -in secrets/jwt_private.pem -out secrets/jwt_public.pem
```

#### 2. Configure Environment Variables
Create the respective local configuration files from the templates provided:

- **Backend:** Copy `backend/.env.example` to `backend/.env` and update details:
  ```properties
  PORT=4000
  MONGO_URI=mongodb://localhost:27017/navigo
  JWT_PRIVATE_KEY_PATH=/run/secrets/jwt_private.pem
  JWT_PUBLIC_KEY_PATH=/run/secrets/jwt_public.pem
  COGNITO_USER_POOL_ID=your_cognito_user_pool_id
  COGNITO_CLIENT_ID=your_cognito_client_id
  COGNITO_DOMAIN=your_cognito_domain
  APP_URL=http://localhost:2000
  ```
- **Frontend:** Copy `frontend/.env.example` to `frontend/.env` and update details:
  ```env
  VITE_API_BASE_URL=http://localhost:4000/api/v1
  VITE_APP_URL=http://localhost:2000
  VITE_COGNITO_CLIENT_ID=your_cognito_client_id
  VITE_COGNITO_DOMAIN=your_cognito_domain
  ```

---

### Running the Application

#### Option A: Running Locally with Docker Compose (Recommended)
You can launch both the frontend and backend simultaneously using the preconfigured `docker-compose.yml`:

```bash
docker-compose up --build
```
- **Frontend:** Accessible at [http://localhost:2000](http://localhost:2000)
- **Backend:** Accessible at [http://localhost:4000](http://localhost:4000)

#### Option B: Running Bare-Metal / Individually

##### Run Backend:
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Run using Maven:
   ```bash
   mvn spring-boot:run
   ```

##### Run Frontend:
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```