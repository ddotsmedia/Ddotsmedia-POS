import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563EB', foreground: '#ffffff' },
        secondary: { DEFAULT: '#f1f5f9', foreground: '#0f172a' },
        destructive: { DEFAULT: '#ef4444', foreground: '#ffffff' },
        muted: { DEFAULT: '#f8fafc', foreground: '#64748b' },
        accent: { DEFAULT: '#f1f5f9', foreground: '#0f172a' },
        border: '#e2e8f0',
        background: '#ffffff',
        foreground: '#0f172a',
      },
      borderRadius: {
        lg: '0.5rem',
        md: 'calc(0.5rem - 2px)',
        sm: 'calc(0.5rem - 4px)',
      },
    },
  },
  plugins: [],
};

export default config;
