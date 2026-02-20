import type { Config } from 'tailwindcss';

const config: Config = {
    darkMode: 'class',
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            screens: {
                wallet: '1250px', // wallet bar: minimized below, full bar at 1250+
            },
            colors: {
                primary: '#6E9B8A',
                'background-light': '#f5f6f8',
                'background-dark': '#0E0F13',
                'background-subtle': '#0C0D11',
                'card-dark': '#16171D',
                surface: '#121318',
                'surface-alt': '#16171D',
                'surface-wallet': '#121318',
                'border-dark': '#262830',
                'border-alt': '#2E2C35',
                'text-primary': '#F5F2ED',
                'text-secondary': '#A8A3B0',
                'text-muted': '#5E5B66',
                'arcade-dark': '#0B1020',
                'arcade-card': '#161D33',
                'neon-cyan': '#4fd1ed',
                'neon-magenta': '#d16ba5',
            },
            fontFamily: {
                display: ['var(--font-inter)', 'sans-serif'],
                mono: ['var(--font-space-mono)', 'monospace'],
                arcade: ['var(--font-press-start-2p)', 'cursive'],
            },
            borderRadius: {
                DEFAULT: '0.5rem',
                lg: '1rem',
                xl: '1.5rem',
                '2xl': '2rem',
                '3xl': '1.5rem',
                full: '9999px',
            },
            boxShadow: {
                primary: '0 20px 40px rgba(0,0,0,0.45)',
                'primary-sm': 'shadow-lg shadow-primary/25',
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
    ],
};

export default config;
