/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
	extend: {
		fontFamily: {
			sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
		},
		borderRadius: {
			lg: 'var(--radius)',
			md: 'calc(var(--radius) - 2px)',
			sm: 'calc(var(--radius) - 4px)'
		},
		colors: {
			/* FlowDesk brand palette */
			brand: {
				navy: '#0A0F1A',
				electric: '#378ADD',
				steel: '#185FA5',
				sky: '#85B7EB',
				platinum: '#B4B2A9',
				arctic: '#F4F6FA',
			},
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
			primary: {
				DEFAULT: 'hsl(var(--primary))',
				foreground: 'hsl(var(--primary-foreground))'
			},
			secondary: {
				DEFAULT: 'hsl(var(--secondary))',
				foreground: 'hsl(var(--secondary-foreground))'
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
			sidebar: {
				DEFAULT: 'hsl(var(--sidebar-background))',
				foreground: 'hsl(var(--sidebar-foreground))',
				primary: 'hsl(var(--sidebar-primary))',
				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
				accent: 'hsl(var(--sidebar-accent))',
				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
				border: 'hsl(var(--sidebar-border))',
				ring: 'hsl(var(--sidebar-ring))'
			}
		},
		keyframes: {
			'accordion-down': {
				from: {
					height: '0'
				},
				to: {
					height: 'var(--radix-accordion-content-height)'
				}
			},
			'accordion-up': {
				from: {
					height: 'var(--radix-accordion-content-height)'
				},
				to: {
					height: '0'
				}
			}
		},
		animation: {
			'accordion-down': 'accordion-down 0.2s ease-out',
			'accordion-up': 'accordion-up 0.2s ease-out'
		}
	}
  },
  safelist: [
    // Brand backgrounds
    'bg-brand-electric', 'bg-brand-navy', 'bg-brand-steel', 'bg-brand-sky',
    'bg-brand-electric/5', 'bg-brand-electric/10', 'bg-brand-electric/15', 'bg-brand-electric/20',
    'bg-brand-steel/5', 'bg-brand-steel/10', 'bg-brand-steel/15',
    'bg-brand-sky/10', 'bg-brand-sky/15',
    // Brand text
    'text-brand-electric', 'text-brand-navy', 'text-brand-steel', 'text-brand-sky',
    // Brand borders
    'border-brand-electric', 'border-brand-steel',
    'border-brand-electric/10', 'border-brand-electric/15', 'border-brand-electric/20',
    'border-brand-electric/25', 'border-brand-electric/30',
    'border-brand-steel/20', 'border-brand-steel/40',
    'border-brand-sky/30',
    // Destructive
    'bg-destructive/5', 'bg-destructive/10', 'border-destructive/20', 'border-destructive/30',
    // Shadows
    'shadow-brand-electric/20', 'shadow-brand-electric/25', 'shadow-brand-electric/30',
    // Rings
    'ring-brand-electric', 'ring-brand-electric/40', 'ring-brand-electric/50',
  ],
  plugins: [require("tailwindcss-animate")],
}