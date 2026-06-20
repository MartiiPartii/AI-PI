// Tailwind CSS v4 ships its own PostCSS plugin and handles vendor prefixing
// internally, so the separate `autoprefixer` step is no longer needed.
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
