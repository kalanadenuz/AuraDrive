/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Poppins', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        cream: '#f0e7db',
        upform: {
          bg: '#f0e7db',
          text: '#4a5568',
          card: 'rgba(249, 249, 249, 0.85)',
          red: '#F56565',
          pink: '#ED64A6',
          orange: '#ED8936',
          yellow: '#ECC94B',
          green: '#48BB78',
          blue: '#4299E1',
          grayText: '#555555',
          inputBg: '#f7fafc',
          btnGray: '#edf2f7',
        },
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'upform': '0 20px 40px -15px rgba(237, 100, 166, 0.15), 0 0 1px 1px rgba(255, 255, 255, 0.6)',
        'upform-hover': '0 25px 50px -12px rgba(245, 101, 101, 0.25)',
      },
    },
  },
  plugins: [],
};
