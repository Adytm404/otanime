/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#121214",
        card: "#19191d",
        accent: "#f43f5e",
        pill: "rgba(255, 255, 255, 0.08)",
        "pill-hover": "rgba(255, 255, 255, 0.16)",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      aspectRatio: {
        'poster': '2 / 3',
      }
    },
  },
  plugins: [],
}
