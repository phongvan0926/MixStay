// PostCSS cho Tailwind: `tailwindcss` biên dịch các directive @tailwind trong app/globals.css,
// `autoprefixer` tự thêm tiền tố trình duyệt (cần cho Safari iOS — phần lớn khách vào bằng iPhone).
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
