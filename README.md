# CodeOnTheGo – Gamified Mobile Coding App

**CodeOnTheGo** is a Duolingo-style app for learning to code through fun, structured, and competitive practice. Built with [Expo](https://expo.dev) and React Native.

---

## Features

### Login / Signup  
Create an account to track your progress, history, and friends.

### Questions Module  
Practice through:
- **Roadmap**: Topic-wise path  
- **Questions**: Random/Selected question
Includes model solutions, examples, and difficulty levels.

### Smart Marking  
- Keyword-based checks  
- AI hints & feedback powered by Google's Gemini AI
- Reveal ideal or similar solutions

### 1v1 Code Duel  
Real-time competitive coding with scoring based on accuracy and speed.

### Tournaments  
Bracket or knockout-style events with leaderboard tracking.

### Quiz Mode  
Quick quizzes:
- By topic  
- Personalized from past mistakes

### Social Features  
- Add friends and view activity  
- Global leaderboard for XP and wins

### Profile System  
Gamified stats:
- XP, streaks, trophies  
- Topic progress, skill map

### Settings  
Manage personal details and notifications.

## Setup Instructions

### Frontend Setup
1. Install dependencies
   ```bash
   npm install
   ```

2. Start the app
   ```bash
   npx expo start
   ```

### Backend Setup (Required for AI Analysis)
1. Navigate to the backend directory
   ```bash
   cd backend
   ```

2. Install backend dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory with the following variables:
   ```env
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   You can get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

4. Start the backend server
   ```bash
   npm run dev
   ```

5. Verify backend is running
   - Health check: `http://localhost:3000/health`
   - Analysis endpoint: `http://localhost:3000/analyze`

The backend uses Google's Gemini AI to provide intelligent code analysis and feedback. Make sure the backend is running for the AI features to work.

## Development

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
