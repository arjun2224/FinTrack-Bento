# FinTrack-Bento 🍱

**FinTrack-Bento** is a high-performance, privacy-focused multi-asset portfolio tracker built for modern investors. It unifies tracking for **Indian Stocks**, **US Equities**, **Mutual Funds**, **Crypto**, **Gold (SGB)**, and **Cash** into a single, beautiful dashboard.

Designed with a **Glassmorphism** UI and **Bento Grid** layout, it offers a premium, reliable, and "wow" user experience.

![Dashboard Preview](/dashboard_preview.png)
*(Note: Replace with actual screenshot)*

## 🚀 Key Features

### 📊 Portfolio Management
-   **Multi-Asset Support**: Track diverse assets including INR/USD stocks, mutual funds, crypto, and fixed deposits.
-   **Real-Time Data**: Live price updates via Yahoo Finance and MFAPI.in (for Indian Mutual Funds).
-   **Performance Metrics**: accurate **XIRR** (Internal Rate of Return) calculation alongside absolute profit/loss.
-   **Currency Handling**: Unified view in preferred currency (INR/USD) with live forex conversion.
-   **Tax Harvesting**: Smart insights for tax-loss harvesting opportunities.

### 🎨 Modern UI/UX
-   **Bento Grid Layout**: Draggable and customizable widgets for Net Worth, Asset Allocation, Holdings, etc.
-   **Glassmorphism Design**: Sleek, translucent cards with dynamic backdrops using `oklch` colors.
-   **Dark Mode First**: Optimized for visual comfort.
-   **Interactive Charts**: Powered by `lightweight-charts` for TradingView-like experience.

### 🔐 Security & Admin
-   **Authentication**: Secure login system powered by **NextAuth v5**.
-   **Role-Based Access**: Dedicated **Admin Panel** for user management.
-   **Privacy Focused**: Self-hosted database (SQLite) ensures your financial data stays with you.

## 🛠️ Tech Stack

-   **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS v4, Shadcn/UI, `tw-animate-css`
-   **Database**: SQLite (via LibSQL), Prisma ORM
-   **Auth**: NextAuth.js v5 (Beta)
-   **State Management**: Zustand (Persisted)
-   **Charts**: Lightweight Charts
-   **Financial Utils**: `xirr`, `yahoo-finance2`

## 🏁 Getting Started

### Prerequisites
-   Node.js 18+ (LTS recommended)
-   `npm` or `pnpm`

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/fintrack-bento.git
    cd fintrack-bento
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory:
    ```env
    DATABASE_URL="file:./prisma/dev.db"
    AUTH_SECRET="your_generated_secret_here" # Generate via `openssl rand -base64 32`
    ```

4.  **Database Setup**
    Initialize the SQLite database and seed the default admin user:
    ```bash
    npx prisma migrate dev --name init
    npm run seed # Seeds admin@example.com / admin123
    ```
    *(Note: If `seed` script fails, check `package.json` setup or run `npx prisma db seed`)*

5.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Access the app at `http://localhost:3000`.

## 🛡️ Usage

### Default Admin Credentials
-   **Email**: `admin@example.com`
-   **Password**: `admin123`

*Important: Login immediately and change your password or create a new admin user via Settings.*

### Admin Panel
Navigate to **Settings** -> **User Management**. visible only to Admin users.
-   Create new users
-   Reset passwords
-   Delete users

### Importing Data
Use the **Import** feature (top header) to bulk add transactions via CSV. Supports formats from:
-   Zerodha / Groww (Indian Stocks)
-   Vested / INDmoney (US Stocks)
-   CoinDCX / Binance (Crypto)

## 📂 Project Structure

```
src/
├── app/                # Next.js App Router pages & layouts
│   ├── actions/        # Server Actions (Auth, Users, Transactions)
│   ├── api/            # API Routes (NextAuth, Search, Portfolio)
│   ├── login/          # Login Page
│   └── settings/       # Settings & Admin Panel
├── components/         # React Components
│   ├── ui/             # Reusable UI elements (Shadcn)
│   ├── tiles/          # Dashboard Widgets (Net Worth, Allocation)
│   └── transaction-form.tsx
├── lib/                # Utilities & Logic
│   ├── db.ts           # Prisma Client singleton
│   ├── store.ts        # Zustand State (Settings, UI)
│   └── market-data.ts  # Price fetching logic
└── auth.ts             # NextAuth Configuration
```

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
