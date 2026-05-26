# Prompt-RKN

Prompt-RKN is a modular and flexible application designed to manage and organize AI prompts efficiently. The system offers advanced integration of the Gemini API, allowing stable and interactive AI prompt execution.

## Features
- Flexible AI prompt management
- Support for Gemini models
- Organized structure for scalability
- APIs for prompt validation and chat functionality

---

## Setup and Installation

### Prerequisites
Make sure the following are installed:
- Node.js (16 or later)
- Firebase account for database integration
- Gemini API key

### Steps
1. Clone the repository:
```bash
$ git clone https://github.com/mimr5445-dev/Prompt-RKN.git
```

2. Navigate to the project directory:
```bash
$ cd Prompt-RKN
```

3. Install dependencies:
```bash
$ npm install
```

4. Set up environment variables:
Create a `.env` file in the root directory with the following keys:
```bash
GEMINI_API_KEY=your-gemini-api-key
NODE_ENV=development
```

5. Run in development mode:
```bash
$ npm run dev
```

6. Build for production:
```bash
$ npm run build
$ npm start
```

---

## Directory Structure
```plaintext
src
├── config/           # App configuration files
├── middleware/       # Express middlewares
├── prompts/          # System and default instructions
├── routes/           # API route handlers
├── services/         # Business logic (e.g., Gemini service)
```

---

## Firebase and Gemini API Setup
- **Firebase**: Add your Firebase project's configuration to the `/config/firebase.ts` or environment variables.
- **Gemini API**: Ensure `GEMINI_API_KEY` is secured and added to the `.env` file.

---

## Contribution
We welcome contributions! Report issues or create pull requests to help improve Prompt-RKN.
