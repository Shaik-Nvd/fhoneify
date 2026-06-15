# Fhoneify User Manual: B2B & D2C Features

Welcome to the **Fhoneify** platform. This document serves as a comprehensive guide outlining the various features available for both Direct-to-Consumer (D2C) and Business-to-Business (B2B) users, along with an overview of how to use and manage them.

---

## 1. Direct-to-Consumer (D2C) Features

The D2C portal is designed to provide retail customers with a seamless experience for buying refurbished devices, selling their old phones, and accessing repair services.

### 1.1 Buying Refurbished Phones (`/buy`)
- **Feature**: Browse a premium catalog of verified, refurbished smartphones (Apple, Samsung, etc.).
- **How to Use**:
  1. Navigate to the **Buy** section from the navigation bar.
  2. Filter devices by brand, condition (e.g., Fair, Good, Excellent), and price.
  3. View detailed specifications and the device grading report.
  4. Add the desired device to your cart.

### 1.2 Selling Your Device (`/quote` & `/sell`)
- **Feature**: Get an instant valuation for your old device and schedule a free doorstep pickup.
- **How to Use**:
  1. Click on **Get Quote** or **Sell** in the navigation bar.
  2. Answer a few questions about your device's condition (screen, battery, physical damage).
  3. The system's algorithm will generate an instant quote.
  4. Accept the quote to schedule a pickup. Once the device is verified at your doorstep, you get paid instantly via UPI.

### 1.3 Shopping Cart & Checkout (`/cart`)
- **Feature**: Manage items you intend to purchase and proceed to secure checkout.
- **How to Use**: Click the Cart icon to review items, apply promo codes, and complete the transaction using integrated payment gateways.

### 1.4 Repair Services (`/repair`)
- **Feature**: Book professional repair services for your smartphone.
- **How to Use**: Select your device model and the issue (e.g., Screen Replacement, Battery Issue) to get a repair estimate and schedule a technician visit or mail-in repair.

### 1.5 Fhoneify Wallet (`/wallet`)
- **Feature**: A digital wallet to store refunds, promotional credits, and proceeds from selling devices.
- **How to Use**: Users can choose to receive payment for sold phones into their Fhoneify Wallet for an extra bonus percentage, which can then be used to purchase upgraded devices.

### 1.6 Authentication & Profile (`/auth`)
- **Feature**: Secure user registration and login.
- **How to Use**: Users log in via email or phone number (OTP). Once logged in, they can track orders, view past sales, and manage their wallet balance.

### 1.7 Offline Stores Finder (`/stores`)
- **Feature**: Locate physical Fhoneify retail or partner stores.
- **How to Use**: Access the **Stores** page to see an interactive map and list of nearby verified locations for in-person buying, selling, or repair drop-offs.

---

## 2. Business-to-Business (B2B) Features

Fhoneify’s B2B offerings cater to corporate clients, wholesale buyers, and partners looking for bulk operations and asset disposition.

### 2.1 IT Asset Disposition - ITAD (`/itad`)
- **Feature**: Secure and sustainable retirement of corporate IT assets (smartphones, tablets).
- **How to Use**:
  1. Corporate clients navigate to the **ITAD** portal.
  2. Submit a manifest of devices to be retired.
  3. Fhoneify handles secure data wiping (with compliance certificates), grading, and bulk purchasing.
  4. Reduces corporate e-waste and maximizes asset recovery value.

### 2.2 Partner Program (`/partner`)
- **Feature**: A portal for wholesale buyers, repair shops, and resellers to buy refurbished devices in bulk at discounted rates.
- **How to Use**:
  1. Apply for a Partner Account on the **Partner** page.
  2. Once approved, gain access to wholesale pricing and bulk inventory sheets.
  3. Place bulk orders with dedicated account management and logistics support.

### 2.3 Admin & Operations Dashboard (`/admin`)
- **Feature**: A comprehensive backend portal for Fhoneify staff to manage the entire platform ecosystem.
- **How to Use**:
  1. **Inventory Management**: Add, grade, and price incoming devices. Track stock levels in real-time.
  2. **Order Fulfillment**: Process incoming D2C purchases and B2B bulk orders. Generate shipping labels and track logistics.
  3. **Quote Management**: Review automated quotes, handle discrepancies after physical inspection, and authorize payouts.
  4. **User Management**: Manage D2C user accounts, partner approvals, and handle support tickets.

---

## 3. Technology & Implementation Overview

For the technical team, here is a brief overview of how these features are implemented and maintained:

### 3.1 Frontend Stack
- **Next.js (App Router)**: Handles all routing and Server-Side Rendering (SSR) for fast page loads and SEO optimization.
- **Tailwind CSS**: Used for styling the entire application with a premium, responsive design system.
- **Zustand**: Manages global state such as Authentication (`authStore.ts`) and Shopping Cart (`cartStore.ts`).
- **Framer Motion**: Powers the smooth page transitions and micro-animations that give the site its premium feel.

### 3.2 Backend API & Database
- **Express Server**: Located in `server/server.ts`, handling API routes for authentication, inventory fetching, and quote processing.
- **Database (Prisma/PostgreSQL)**: Manages persistent storage for Users, Inventory Items, Quotes, and Orders. The schema is defined in `prisma/schema.prisma`.
- **Data Fetching**: The Next.js frontend communicates with the Express backend via `axios` and standard `fetch` API calls.

### 3.3 Security & Performance
- **Authentication**: JWT-based authentication secures both the frontend routes and backend API endpoints.
- **Performance**: Optimized font loading via `next/font`, GPU-accelerated CSS animations, and Next.js Image optimization ensure a lightning-fast experience.

---
*Generated by Antigravity AI for Fhoneify.*
