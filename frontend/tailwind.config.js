/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#050b1f',
          card: '#0a1330',
          dark: '#0a0a0a',
        },
        cyan: {
          DEFAULT: '#00e5ff',
          button: '#00b8d4',
          glow: 'rgba(0,229,255,0.3)',
        },
        safe: '#4ade80',
        danger: '#ef4444',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        grotesk: ['Space Grotesk', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0px 0px 15px rgba(0,229,255,0.2)',
        'glow-lg': '0px 0px 50px rgba(0,229,255,0.1)',
        'glow-btn': '0px 0px 7.5px rgba(0,229,255,0.4)',
        'glow-sos': '0px 0px 10px rgba(239,68,68,0.5)',
        phone: '0px 0px 0px 12px #171717, 0px 0px 50px rgba(0,229,255,0.1), 0px 0px 0px 1px rgba(255,255,255,0.1)',
      },
      borderRadius: {
        phone: '48px',
      },
      backdropBlur: {
        glass: '12px',
      },
    },
  },
  plugins: [],
};
