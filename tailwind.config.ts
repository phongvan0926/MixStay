import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand = xanh rêu đậm (deep forest green) — khớp logo MixStay.
        // 600 là sắc độ chủ lực (nút chính), 700 hover/links, 900 nền dải tối/footer.
        brand: {
          50: '#f0f6f1',
          100: '#dcebe0',
          200: '#bbd8c2',
          300: '#8fbd9b',
          400: '#5d9b6e',
          500: '#3d7e50',
          600: '#2f6440',
          700: '#275234',
          800: '#21412b',
          900: '#1b3624',
          950: '#0e1f15',
        },
        // Gold accent — CHỈ dùng điểm nhấn (CTA/badge/highlight, nền tối), không nền diện rộng.
        // An toàn WCAG: chữ tối trên gold-400 (badge), gold-300 trên nền brand tối, gold-700 làm chữ trên nền sáng.
        gold: {
          50: '#fdf8ec',
          100: '#f9edc7',
          200: '#f2d98a',
          300: '#ebc24d',
          400: '#e2ad27',
          500: '#c8901c',
          600: '#a8741a',
          700: '#855818',
          800: '#6e4818',
          900: '#5d3d18',
          950: '#36210a',
        },
        surface: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
