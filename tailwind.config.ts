module.exports = {
  content: [
    '.src/pages/**/*.{js,ts,jsx,tsx}',
    '.src/components/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        dyslexic: ['OpenDyslexic', 'sans-serif'],
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
