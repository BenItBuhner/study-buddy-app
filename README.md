# Study Buddy - Smart Flashcard App

Study Buddy is a modern web application designed to help users learn and retain information through interactive quizzes. Built with Next.js and leveraging AI for content generation, it offers a flexible and engaging study experience.

![Study Buddy Screenshot](<placeholder_for_screenshot.png>) <!-- TODO: Add a screenshot -->

## Features

*   **Interactive Quizzes:** Engage with study material through multiple-choice or text-input questions.
*   **Rich Content Support:** Display complex mathematical or scientific notation seamlessly with integrated LaTeX rendering (`react-katex`).
*   **Instant Feedback:** Receive immediate feedback on answers, including explanations for incorrect responses.
*   **AI Study Set Generation:** Automatically generate study sets on any topic using the Google Generative AI SDK. Simply provide a topic and let the AI create the questions and answers for you!
*   **Manual JSON Input:** Create or load study sets using a simple JSON format for precise control over content.
*   **Session Persistence:** Your study progress is automatically saved in your browser's cookies, allowing you to pick up where you left off.
*   **Progress Tracking:** Monitor your performance with statistics like accuracy and completion percentage.
*   **Responsive Design:** Enjoy a seamless experience across desktop and mobile devices, built with Tailwind CSS and Shadcn UI.
*   **Smooth Animations:** Interactive elements are enhanced with subtle animations using Framer Motion.
*   **Dark Mode:** Automatically adapts to your system's preferred color scheme.

## Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **UI Library:** [React](https://reactjs.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components:** [Shadcn UI](https://ui.shadcn.com/)
*   **State Management:** React Context API
*   **Animations:** [Framer Motion](https://www.framer.com/motion/)
*   **LaTeX Rendering:** [react-katex](https://github.com/talyssonoc/react-katex)
*   **AI Integration:** [Google Generative AI SDK](https://ai.google.dev/docs) (Gemini)
*   **Persistence:** Browser Cookies

## Getting Started

Follow these steps to get the Study Buddy application running locally on your machine.

**Prerequisites:**

*   [Node.js](https://nodejs.org/) (Version 18.x or later recommended)
*   [npm](https://www.npmjs.com/), [yarn](https://yarnpkg.com/), or [pnpm](https://pnpm.io/)

**Installation:**

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone <your-repository-url>
    cd study-buddy-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```
    *Note: You might encounter peer dependency issues with `react-katex` if using React 19+. If so, you may need to use the `--legacy-peer-deps` flag:*
    ```bash
    npm install --legacy-peer-deps
    ```

3.  **Set up Environment Variables:**
    *   Create a file named `.env.local` in the `study-buddy-app` directory.
    *   Add your Google Generative AI API key:
        ```
        GOOGLE_GENERATIVE_AI_API_KEY=YOUR_API_KEY_HERE
        ```
    *   You can obtain an API key from the [Google AI Studio](https://aistudio.google.com/app/apikey).

**Running the Development Server:**

1.  **Start the server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```

2.  **Open the application:**
    Open [http://localhost:3000](http://localhost:3000) in your web browser.

You can now start using the application! Changes you make to the code (e.g., in `src/app/page.tsx` or components in `src/components/`) will automatically reload the page.

## How to Use

1.  **Load a Study Set:**
    *   **AI Generation:** Click the "AI Generate" button, enter a topic (e.g., "JavaScript Array Methods", "Photosynthesis"), and click "Generate". The AI will create a study set for you.
    *   **Manual JSON:** Click the "New Set" button, paste your JSON formatted study set into the text area, and click "Load JSON". See `public/sample-*.json` for examples of the expected format.
    *   **Sample Sets:** Click on the pre-loaded sample quizzes (like Math or Physics) on the home page.
2.  **Start Studying:** Once a set is loaded, click "Start Studying" or "Continue Studying".
3.  **Answer Questions:**
    *   **Multiple Choice:** Click the option you think is correct.
    *   **Text Input:** Type your answer and click "Submit Answer".
4.  **Navigate:** Use the "Previous" and "Next" buttons to move between questions.
5.  **Give Up/Try Again:** If stuck, click "Give Up" to see the answer and explanation. Click "Try Again" to clear your attempt and answer again.
6.  **Review:** After completing or exiting a quiz, you'll see a summary page with your results.

## Deployment

The easiest way to deploy your Study Buddy app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Ensure you set the `GOOGLE_GENERATIVE_AI_API_KEY` environment variable in your Vercel project settings.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
