/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        gold: "#C9A020",
        dark: "#0D0D0D"
      },
      fontFamily: {
        palatino: ["Palatino Linotype", "Palatino", "Book Antiqua", "Georgia", "serif"]
      },
      animation: {
        pulseGlow: "pulseGlow 8s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        cardFloat: "cardFloat 0.6s ease-out backwards",
        slideInLeft: "slideInLeft 0.6s ease-out",
        fadeInUp: "fadeInUp 0.5s ease-out",
        rowFade: "rowFade 0.3s ease backwards",
        countUp: "countUp 0.8s ease-out",
        glowPulse: "glowPulse 2s infinite"
      }
    }
  },
  plugins: []
};
