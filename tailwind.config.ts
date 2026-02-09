import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        /* ===== PALETTE "PERFORMANCE" ===== */
        blue: {
          DEFAULT: '#2D5BFF',
          hover: '#2451E6',
          light: '#DBEAFE',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2D5BFF',
          700: '#2451E6',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        orange: {
          DEFAULT: '#FF6B4A',
          hover: '#E55F42',
          dark: '#E55F42',
          light: '#FF8A6F',
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#FF6B4A',
          600: '#E55F42',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        interface: '#F8FAFC',
        navy: {
          DEFAULT: '#0F172A',
          light: '#1E293B',
          100: '#CBD5E1',
          200: '#94A3B8',
          300: '#64748B',
          600: '#334155',
          700: '#1E293B',
          800: '#0F172A',
        },
        primary: {
          DEFAULT: '#0F172A',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#64748B',
          foreground: '#0F172A',
        },
        success: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
          dark: '#059669',
        },
        gray: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        /* ===== COULEURS SEMANTIQUES SHADCN ===== */
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
      },
      borderRadius: {
        'xl': '12px',
        'lg': '8px',
        'md': '6px',
        'sm': '4px',
        'full': '9999px',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'card-hover': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'button': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'sidebar': '4px 0 6px -1px rgb(0 0 0 / 0.1)',
        'orange': '0 4px 14px -3px rgba(255, 107, 74, 0.4)',
        'blue': '0 4px 14px -3px rgba(45, 91, 255, 0.3)',
      },
      backgroundImage: {
        'gradient-blue': 'linear-gradient(180deg, #2D5BFF 0%, #1E40AF 100%)',
        'gradient-orange': 'linear-gradient(135deg, #FF6B4A 0%, #F97316 100%)',
        'gradient-hero': 'linear-gradient(135deg, #2D5BFF 0%, #0F172A 100%)',
        'gradient-runner': 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
      },
    }
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
