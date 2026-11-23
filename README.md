
# Connectly – Social Media Web Application

Connectly is a full-stack social media web application where users can connect, share posts, communicate in real time, and interact with other users.

## Features

- User registration and login
- User profiles and profile picture uploads
- Create text and image posts
- Like and comment on posts
- Edit and delete posts
- Follow and unfollow users
- Suggested users
- Save posts
- Stories with viewing and viewer lists
- Reply to stories
- Real-time messaging using Socket.IO
- Online and offline status
- Typing indicators
- Message delivery and seen receipts
- Notifications

## Tech Stack

**Frontend**
- HTML
- CSS
- JavaScript

**Backend**
- Node.js
- Express.js
- Socket.IO

**Database**
- SQLite

**Other Tools**
- Git and GitHub
- npm
- Multer
- bcryptjs
- express-session
- Helmet
- dotenv

## Project Structure

```text
connectly-social-media/
│
├── server.js
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
├── README.md
│
├── database/
│
└── public/
    ├── index.html
    ├── dashboard.html
    ├── messages.html
    ├── profile.html
    │
    ├── css/
    │   ├── style.css
    │   ├── dashboard.css
    │   ├── messages.css
    │   └── profile.css
    │
    ├── js/
    │   ├── app.js
    │   ├── dashboard.js
    │   ├── messages.js
    │   └── profile.js
    │
    └── uploads/
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

### 2. Open the project folder

```bash
cd connectly-social-media
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the root directory.

Use the following configuration:

```env
PORT=3000
SESSION_SECRET=your_own_long_random_secret
```

Replace the placeholder with a strong, private random secret.

### 5. Start the application

```bash
npm start
```

### 6. Open in your browser

```text
http://localhost:3000
```

## Security and Privacy

- Environment variables and secrets should never be committed to GitHub.
- User-uploaded files and database files are excluded from the repository.
- Passwords are protected using bcryptjs.
- Session management is handled using express-session.

## Project Purpose

The purpose of Connectly is to demonstrate full-stack web development through user authentication, database management, social interactions, and real-time communication.

## Author

Developed as a full-stack web development project.
