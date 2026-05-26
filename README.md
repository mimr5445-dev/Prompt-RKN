# Prompt-RKN

Prompt-RKN is an advanced system for managing and organizing AI prompt workflows. The application offers safe and efficient integration with the Gemini API and supports Firebase for data storage.

---

## 🔥 Features
- Modular architecture for scalability
- Advanced AI integration with Gemini API
- Fully-configurable `systemPrompt`
- Rate-limited and secure API endpoints
- Dedicated error handling and input validation

---

## ⚙️ Project Setup

### Prerequisites
- **Install Node.js**: Version `16` or later is required.
- **Install npm packages**: Run `npm install` in the project root.

### Adding Configurations
- **Firebase setup**:
  Modify `src/config/firebase.ts` with your Firebase project credentials.
- **`.env` file**:
  Copy `.env.example` into a new file named `.env` and fill in required values:
  ```env
  GEMINI_API_KEY=<your-gemini-api-key>
  GEMINI_DEFAULT_MODEL=gemini-2.5-flash
  NODE_ENV=development
  ```

---

## 🌳 Project Structure
```plaintext
src/
 ├── config/         # Configuration files (env, Firebase setup)
 ├── middleware/     # Middleware containing error handling
 ├── prompts/        # Prompt systems
 ├── routes/         # API route modules
 ├── services/       # Handle business logic (e.g., Gemini interactions)
 ├── utils/          # Utility/helper functions
 ├── types/          # Shared TypeScript types
```

---

## 🚀 Running the Application

1. **Start the Dev Server**:
   ```bash
   npm run dev
   ```

2. **Build for Production**:
   ```bash
   npm run build && npm start
   ```

---

## 🛡️ Security Enhancements
- **Rate limiting**: To prevent abuse.
- **Helmet headers**: Improved HTTP security.
- **Environment-based API keys**: Never expose sensitive data.
- **Validation enforcement**: All API payloads are validated.

---

## ⚠️ Contributing

You're welcome to contribute by:
- Suggesting features or fixes
- Reporting bugs
- Improving documentation
  
Submit issues and PRs via the [GitHub repository](https://github.com/mimr5445-dev/Prompt-RKN).

---

## 📜 License
This project is under the MIT License.
