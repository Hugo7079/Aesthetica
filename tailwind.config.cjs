module.exports = {
  content: [
    './index.html',
    './*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'aesthetic-gold': '#d4af37',
        'aesthetic-accent': '#b78bff',
      },
    },
  },
  plugins: [],
};
