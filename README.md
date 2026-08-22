# Quotio

An AI-powered vehicle insight platform. Quotio provides many services such as an AI hybrid RAG based reliability summary for a given make, model, year. Additionally, it returns recall information from NHTSA and can give generic monthly cost estimator based on avg insurance, fuel, and mainteanance (with hybrid RAG breakdown at different mileage intervals) cost. 



## Tech Stack

- **Frontend**: React 19 + Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express 5, MongoDB (Mongoose)
- **Auth**: JWT with `jsonwebtoken` and `bcryptjs`
- **AI / RAG**: Groq calls openai/gpt-oss-120b, FastAPI Python service endpoints for mileage and reliability summaries
- **External data**: EPA FuelEconomy, NHTSA recall data, EIA gas price data, Tavily for RAG

## Prerequisites

- Node.js 18+
- Python 3.10+
- A MongoDB instance — either [MongoDB Atlas](https://cloud.mongodb.com) (free tier) or a local `mongod` on port 27017

## Getting Started Locally (Fresh Machine)

### 1. Clone this repository


### 2. Install Node dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string (Atlas URI or `mongodb://localhost:27017/quotio`) |
| `JWT_SECRET` | Long random string used to sign auth tokens — change before deploying |
| `PORT` | Express server port (default: `3000`) |
| `EIA_API_KEY` | Optional key for live gas price lookups |
| `GROQ_API_KEY` | Optional key for the RAG service |
| `TAVILY_API_KEY` | Optional key for the RAG service |

### 4. Seed the database

Populates car makes and synthetic user accounts:

```bash
npm run seed
```

Synthetic accounts created for testing:

| Email | Password |
|---|---|
| alice@example.com | password123 |
| bob@example.com | securepass1 |
| charlie@example.com | mypassword9 |

### 5. Install Python dependencies for the RAG service (more details in RAG_README under src/rag_ai_service)

```bash
cd src/rag_ai_service
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 6. Start the RAG service 

In a separate terminal:

```bash
cd src/rag_ai_service
python -m uvicorn main_rag:app --host 127.0.0.1 --port 9000
```

### 7. Start the backend

In a separate terminal:

```bash
npm run server
```

### 8. Start the frontend

In another terminal:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`. The Vite dev server proxies `/api` requests to the Express backend on port `3000`, while the RAG service listens on port `9000`.

### 9. Build for production

```bash
npm run build
```

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite frontend with hot reload |
| `npm run server` | Start the Express backend |
| `npm run seed` | Seed MongoDB with car makes and synthetic users |
| `npm run ragseed` | Seed the RAG dataset / supporting data |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

## Deployment

The repository includes a deployment helper script at `deploy.sh` for publishing the app to the configured remote server.

To deploy from the project root:

```bash
./deploy.sh
```

What the script does:

- runs a local production build
- uploads the app files to the remote host over SSH
- excludes `.git`, `node_modules`, and `.env` from the transfer
- installs production dependencies on the server with `npm ci --omit=dev`
- restarts the `capstone` system service

This script assumes you already have SSH access configured for the target server and that the private key path is available at `~/.ssh/quotio.pem`.

While Node.js packages are automatically updated by the deployment script, Python dependencies are intentionally left manual. Because this application runs on an EC2 instance with only 1 GB of RAM, automated pip installations of massive machine learning libraries (like PyTorch) will max out the system's temporary memory (tmpfs) and crash the server. If you add new packages to the Python requirements.txt, you must SSH into the server, activate the .venv, and install them manually by routing the extraction process to the main hard drive:

```bash
mkdir ~/pip_tmp
TMPDIR=~/pip_tmp pip install -r requirements.txt --no-cache-dir
rm -rf ~/pip_tmp
```

To update the remote environment file after changing local settings, run:

```bash
scp -i ~/.ssh/quotio.pem .env.production ec2-user@3.23.70.178:/var/www/app/.env
ssh -i ~/.ssh/quotio.pem ec2-user@3.23.70.178 "sudo systemctl restart capstone"
```
Make sure that the .env changes are in .env.production before running the above commands.

## Testing Implemented Functionalities

Both `npm run server` and `npm run dev` must be running before testing.

### Authentication — Login / Signup

1. Go to `http://localhost:5173/login`
2. Click **Sign up**, enter any email and a password of 8+ characters, submit
3. You are redirected home; your email appears in the navbar
4. Click **Log out** — you return to the unauthenticated state
5. Return to `/login` and sign back in using the same credentials or a seeded account (`alice@example.com` / `password123`)

### User Session Persistence

1. Log in, then close the browser tab
2. Reopen `http://localhost:5173` — your email still appears in the navbar without re-logging in
3. The JWT is stored in `localStorage` and validated against `GET /api/users/me` on every page load

### Community Forums — CRUD

> You must be logged in to create, edit, or delete posts.

**Create:** Log in → `/forums` → **Create Post** → fill in a title (3+ chars) and content (10+ chars) → **Create**

**Read:** Click any post card in `/forums` to open the full post at `/post/:id`

**Update / Delete:** Open a post you authored — edit the title/content and click **Update**, or click **Delete** to remove it

**Data persistence test:** Stop and restart `npm run server`, then reload `/forums` — posts survive the restart because they are stored in MongoDB.

### Car Details — EPA Fuel Economy Lookup

1. Go to `/car-details`
2. Select a **Year**, **Make**, **Model**, and **Trim** — each dropdown fetches live data from the EPA FuelEconomy API
3. A card displays engine specs and fuel efficiency (city/highway/combined mpg, estimated annual fuel cost)

### NHTSA Recall Lookup

1. Go to `/recalls`
2. Select a make, model, and year
3. Any active NHTSA recalls for that vehicle are listed

## Features

Quotio now covers the core workflows below:

- **Monthly cost calculator** — selects a state, vehicle year/make/model, weekly mileage, and returns a monthly fuel/insurance/maintenance estimate using EPA data, EIA gas prices, and an AI-generated explanation.
- **Reliability analysis** — accepts a year, make, and model and returns an AI reliability summary alongside a ProblemsByVin reliability snapshot.
- **Recall lookup** — searches NHTSA recall data by year, make, and model.
- **Car details lookup** — pulls EPA vehicle data for years, makes, models, trims, and vehicle specs.
- **Community forums** — lets authenticated users create, read, update, and delete posts.
- **Authentication and sessions** — supports signup/login and JWT-backed session persistence in the browser.



## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Create account and return a JWT |
| POST | `/api/auth/login` | No | Login and return a JWT |
| GET | `/api/cars/makes` | No | List all car makes from MongoDB |
| GET | `/api/users/me` | Bearer JWT | Get the current user profile |
| GET | `/api/car-details/years` | No | EPA: list model years |
| GET | `/api/car-details/makes?year=` | No | EPA: list makes for a year |
| GET | `/api/car-details/models?year=&make=` | No | EPA: list models |
| GET | `/api/car-details/options?year=&make=&model=` | No | EPA: list trims |
| GET | `/api/car-details?id=&variant=` | No | EPA: full vehicle specs |
| POST | `/api/estimate` | No | Estimate monthly fuel / insurance / maintenance costs |
| GET | `/api/recalls/years` | No | NHTSA: list years with recall data |
| GET | `/api/recalls/makes?year=` | No | NHTSA: list makes for a year |
| GET | `/api/recalls/models?year=&make=` | No | NHTSA: list models for a year and make |
| GET | `/api/recalls?year=&make=&model=` | No | Lookup recalls for a vehicle |
| POST | `/api/rag-mileage-estimator` | No | RAG summary for monthly cost estimates |
| POST | `/api/rag-reliability` | No | RAG summary for reliability analysis |
| GET | `/api/posts/` | No | Get all forum posts |
| GET | `/api/posts/:id` | No | Get one forum post |
| POST | `/api/posts/` | Bearer JWT | Create a forum post |
| PUT | `/api/posts/:id` | Bearer JWT + owner | Update a post you own |
| DELETE | `/api/posts/:id` | Bearer JWT + owner | Delete a post you own |

## External APIs

- **NHTSA VPIC** — fetches vehicle models for a given make
- **NHTSA Recalls** — recall lookup by make, model, and year
- **EPA FuelEconomy.gov** — year/make/model/trim lookup and fuel efficiency data (`fueleconomy.gov/ws/rest`)


## AI Usage
Claude AI was used extensively for this project. Specifically for difficult features such as the hybrid RAG. Examples include: formula for reliability/estimation, logarithmic solution to normalize popular vehicles, clustering, tavily source extraction web signaling rating, etc.

Claude was also used for styling the application and returning data such as recall/car-details in an organized manner.


## Additional Notes
UNCC capstone group project


| Name | Responsibility |
|---|---|
| Jerry (me) | Hybrid RAG desing/implementation, CRUD forum feature, setup project skeleton (server, routes, middleware, frontend pages) and overall architecture |
| Jayant  | Deployment on AWS, design and handled mongodb/node backend server |
| Ben  | Designed entire UI; added additional components like about, policy and logo. Fixed bugs in the frontend |
| Kasper  | Implemented monthly cost estimator formula, recall page, added car-details, use external along with testing validity of API data |
| Thomas  | Implemented Login, session and persistance functionality, modified nav/app bar to work better with login or logout |


### Note (Limitations): Groq/Tavily are using the free tier version with strict rate limits. To avoid hitting this limit do not make too many requests in quick succession. Due to free mongodb storage limit; the NHTSA recall/investigation data for the RAG is manually inserted via heavily modified FLAT text files for popular car brands in the USA only - with no automatic pull or refresh. This makes the RAG outdated for newer recall/inv data after July 2026. 