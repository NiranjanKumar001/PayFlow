# PayFlow: Beginner-Friendly Explainer

Welcome to **PayFlow**! This document explains what this project is, how it works under the hood, and how to run it in a very simple, beginner-friendly way.

---

## 🌟 What is this project?

Imagine you run an online store. To get more customers, you pay **Affiliates** (promoters) a commission whenever they refer a sale to your store. 

However, paying promoters can be tricky:
1. Promoters want their money fast.
2. But some customers might return items or cancel their orders later, meaning the promoter's commission shouldn't actually be paid.

**PayFlow solves this** by implementing a smart, safe, automated payout lifecycle.

---

## 💸 The 4 Core Rules of PayFlow (With Simple Math)

Let's trace what happens when an affiliate named **John** makes a sale:

### 1. The 10% Advance Payout
When John registers a sale where he earned **₹100**:
* The sale status is **Pending**.
* The system automatically pays John a **10% advance** immediately (₹10).
* John's withdrawable balance becomes **₹10**.

### 2. Reconciliation (Approval or Rejection)
An admin later reviews the sale and decides if it is valid:
* **If Approved:** John gets the remaining 90% (₹90). His new balance is ₹10 (advance) + ₹90 = **₹100**.
* **If Rejected:** (e.g., the customer refunded). The system **claws back** the ₹10 advance. His new balance is ₹10 (advance) - ₹10 (clawback) = **₹0**.
* *Note: If John already withdrew the ₹10 advance, his balance will go negative (-₹10) until he makes another sale. This protects the store owner!*

### 3. Rate-Limited Withdrawals
To protect against fraud and server overload, John can only withdraw his balance **once every 24 hours**. If he tries to withdraw twice in the same day, the system blocks him.

### 4. Failed Withdrawal Recovery
If John withdraws ₹100, his balance becomes ₹0, and his 24-hour rate limit timer starts.
If the bank or payout gateway fails:
* The system automatically **returns the ₹100** to John's balance.
* It **clears the 24-hour rate limit**, so John doesn't have to wait a day to try again.

---

## 📁 Why are there files like `node_modules` and `package.json` in the root?

You might notice these files in the main folder:
* `package.json`
* `package-lock.json`
* `node_modules/`

### Are they required?
**Yes, for convenience!** 
This project is a **monorepo** (it contains two sub-projects: `server` for the backend, and `client` for the React user interface). 

Normally, to run this app, you would have to:
1. Open terminal 1, type `cd server && npm run dev`
2. Open terminal 2, type `cd client && npm run dev`

By keeping `package.json` and `node_modules` in the root, we installed a tool called `concurrently`. This allows you to start **both** the backend and frontend at the same time with **one single command**!

---

## 🚀 How to Run the Project

Follow these simple steps:

### Step 1: Install Dependencies (Only needed once)
From the root folder, run:
```bash
npm install
```
This automatically installs the helper tools at the root, the backend server dependencies, and the frontend user interface packages.

### Step 2: Configure the Database
The project uses **MongoDB Atlas** (a database in the cloud) to keep your data safe.
1. Open the file `server/.env` (if it doesn't exist, duplicate `server/.env.example` and rename it to `.env`).
2. Verify the `MONGODB_URI` environment variable matches your MongoDB Atlas connection string.

### Step 3: Run the Application
In your terminal, run:
```bash
npm run dev
```

* **React Frontend Dashboard** will open at: **`http://localhost:5173`**
* **Express Backend Server** will run at: **`http://localhost:3001`**

Now, open your browser to **`http://localhost:5173`** to interact with the premium dashboard!
