# Code on the Go Backend

This is the backend server for the Code on the Go application, built with Node.js and Express.js.

## Setup

1. Create a `.env` file in the root directory with the following variables:
   ```
   GEMINI_API_KEY=your_api_key_here
   PORT=3000
   NODE_ENV=development
   ```

2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Health Check
- **GET** `/health`
- Returns the server status

### Code Analysis
- **POST** `/api/analyze`
- Analyzes code using Gemini AI
- Request body:
  ```json
  {
    "code": "your code here",
    "question": "your question here"
  }
  ```
- Response:
  ```json
  {
    "analysis": "AI analysis response"
  }
  ```

## Error Handling

The API returns appropriate HTTP status codes:
- 200: Success
- 400: Bad Request (missing required fields)
- 500: Server Error

## Development

- The server uses nodemon for development, which automatically restarts when files change
- CORS is enabled for development
- Morgan is used for logging HTTP requests 