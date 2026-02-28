# BetZone — Betting & Casino Frontend

Modern SPA for sports betting and online casino built with React, TypeScript, Vite, and Tailwind CSS.

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build**: Vite 7
- **Styling**: Tailwind CSS 4 (dark theme by default)
- **Routing**: React Router 7
- **State**: Zustand (auth, bet slip, UI)
- **Data fetching**: TanStack React Query
- **Forms**: React Hook Form + Zod
- **Animations**: Framer Motion
- **Charts**: Recharts
- **i18n**: react-i18next (ru/en)
- **Real-time**: WebSocket service

## Quick Start

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── ui/          # Design system (Button, Input, Modal, Card, etc.)
│   ├── layout/      # Header, Footer, MainLayout, AdminLayout
│   ├── betting/     # BetSlip, OddsButton
│   ├── common/      # AgeGate, CookieBanner, ErrorBoundary, ProtectedRoute
│   └── ...
├── pages/
│   ├── public/      # Home, Casino, Sports, Auth, Legal, Support
│   ├── private/     # Profile, Wallet, Bets, Bonuses, KYC, Limits
│   └── admin/       # Dashboard, Users, Transactions, Content, Logs
├── stores/          # Zustand stores (auth, betSlip, ui)
├── services/        # API client, WebSocket service
├── hooks/           # useDebounce, useWebSocket, useSessionTimer
├── types/           # TypeScript type definitions
├── locales/         # i18n translations (ru, en)
├── styles/          # Global styles, design tokens
└── utils/           # i18n config, analytics, formatting
```

## Key Features

### Public Pages
- **Home** — Hero, popular games, top events, promotions, advantages
- **Casino** — Game catalog with filters, search, providers, pagination
- **Sports** — Sports feed, live/prematch, odds buttons, virtual list
- **Promotions** — Bonus cards, promo codes

### Betting
- **Bet Slip** — Single/Express/System bets, odds tracking, stake management
- **Live odds** — Real-time updates via WebSocket, change animations
- **Event page** — All markets, collapsible sections

### User Account
- **Profile** — Edit info, 2FA, sessions, preferences
- **Wallet** — Balance, deposit, withdraw, transaction history
- **Bet History** — Filters, cashout, detailed selections
- **Bonuses** — Active/available/completed, wager progress, promo codes
- **KYC** — Document upload, verification status
- **Limits** — Deposit/bet/loss limits, timeout, self-exclusion

### Auth
- Login, Register, OTP/2FA, Forgot/Reset password
- Protected routes with auth guard

### Responsible Gambling
- Age gate modal, session timer, gambling limits, self-exclusion

### Admin Panel
- Dashboard with charts, user/transaction/bonus management, RBAC, audit logs

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API URL | `/api` |
| `VITE_WS_URL` | WebSocket URL | `ws://localhost:3001/ws` |
| `VITE_APP_NAME` | App name | `BetZone` |
| `VITE_ENABLE_LIVE_BETTING` | Enable live betting | `true` |
| `VITE_ENABLE_CASINO` | Enable casino | `true` |
| `VITE_ENABLE_BONUSES` | Enable bonuses | `true` |
| `VITE_DEFAULT_LOCALE` | Default locale | `ru` |
| `VITE_DEFAULT_CURRENCY` | Default currency | `RUB` |

## API Contract

The frontend expects a REST API with endpoints:
`/auth`, `/user`, `/wallet`, `/kyc`, `/casino`, `/betting`, `/bonuses`, `/responsible`, `/support`, `/cms`, `/admin`

See `src/services/api.ts` for complete API method definitions.
