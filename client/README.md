# PayFlow Client Dashboard

The modern, highly responsive frontend client for the **PayFlow User Payout Management System**, built as a Single Page Application (SPA) using React 19 and Vite.

## 🚀 Features

*   **Premium Theme**: Styled with a dark-mode glassmorphic aesthetic built with CSS variables.
*   **Custom Form Controls**: Custom dropdown inputs (`CustomSelect`) matching Shadcn UI's look and feel, and clean styling that hides browser defaults like numeric spinners.
*   **State Coordination**: Automatically refreshes metrics, balances, sales records, and payout logs upon any mutation.
*   **Bulk Actions**: Easily select multiple pending affiliate sales to batch approve/reject them in a single transaction.
*   **Failure Simulation**: Built-in simulator controls to fail or cancel withdrawals to test payment gateway failure and automatic balance recovery workflows.

## 📁 Component Directory

All UI components are modularized under `src/components/`:
*   `CustomSelect.jsx` - Reusable dropdown selector.
*   `Toast.jsx` - Success/error popup notifications.
*   `Header.jsx` - App logo and navigation tab bar.
*   `StatsCards.jsx` - Display panels for system-wide stats and user balances.
*   `SalesTable.jsx` - List of sales, bulk action selectors, and filter headers.
*   `UsersTable.jsx` - Directory of registered users and their current withdrawable balance.
*   `PayoutsTable.jsx` - Ledger of payouts, transaction references, and simulated fail controls.
*   `RegisterSaleForm.jsx` - Form to create a new pending affiliate sale.
*   `WithdrawForm.jsx` - Form to request payouts for affiliate balances.

## 🛠️ Development & Commands

Run commands from the `client/` subdirectory:

*   `npm run dev` - Run Vite development server on `http://localhost:5173/`
*   `npm run build` - Generate production build static assets in the `dist` directory
*   `npm run preview` - Locally preview the compiled production build
