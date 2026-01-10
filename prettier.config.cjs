/** @type {import("prettier").Options} */
module.exports = {
  singleQuote: true,
  trailingComma: 'all',
  arrowParens: 'avoid',
  htmlWhitespaceSensitivity: 'strict',
  plugins: ['prettier-plugin-motoko', 'prettier-plugin-tailwindcss'],
};
