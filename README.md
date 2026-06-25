# Safthoo — Premium B2C Storefront

Safthoo is a high-end, serverless, and cost-optimized B2C e-commerce platform designed for premium footwear and apparel. Drawing inspiration from modern editorial fashion aesthetics (such as Nike, Adidas, and Y-3), Safthoo features a stark black-and-white minimalist design, ultra-smooth micro-animations, and a highly secure, serverless architecture that runs entirely on a $0 budget.

---

## 🛡️ Security Architecture & Hardening (Priority #1)

Safthoo is engineered with a **zero-server attack surface** and strict data isolation models to guarantee top-tier transactional and user data security.

### 1. Zero-Server Attack Surface
By eliminating a traditional dedicated backend API server (e.g., Node.js/Express, PHP), Safthoo communicates directly and securely with Firebase services. This completely removes vulnerabilities associated with server OS management, open ports, SSH exploits, and custom API endpoint injection.

### 2. Locked-Down Firestore Security Rules (`firestore.rules`)
Our database access is guarded by server-side Firebase Security Rules, ensuring that all client requests are strictly validated:
* **Product Catalog Protection:** The `products` collection is public for reading, but updates are strictly restricted. Only authenticated users can perform updates, and the update is validated to **only** allow modifications to the `stock_qty` field (using `request.resource.data.diff(resource.data).changedKeys().hasOnly(['stock_qty'])`). This mathematically prevents unauthorized price, name, or description tampering during checkout.
* **Strict User Isolation:** User profiles (`users`), wishlists (`wishlists`), and orders (`orders`) are secured by validating that the document owner matches the authenticated user ID (`request.auth.uid == userId`). No user can read, write, or modify another user's personal data.
* **Authenticated Order Intake:** Creating items in `order_items` and simulated payments in `payments` strictly requires a verified, active user session.

### 3. Safe Client Transactions
Deducting stock during checkout uses atomic **Firestore Transactions** (`runTransaction`). If the stock of any item is insufficient, the transaction immediately rolls back on the server side, preventing race conditions, double-spending, or negative inventory.

---

## ⚡ Tech Stack

* **Frontend:** React, Vite, TypeScript, Tailwind CSS v4, Framer Motion (for physics-based spring animations).
* **Database & Services:** Google Cloud Firestore (Serverless NoSQL), Firebase Auth.
* **Design System:** Geist Sans typography, Phosphor Icons, B&W editorial contrast.
* **Toast Notification:** custom `goey-toast` for fluid, morphing blob micro-animations.

---

## 🌟 Key Features

1. **Editorial Bento Grid Catalog:** Dynamic product display, real-time search, and smooth category filter tabs.
2. **Interactive Zoom Magnifier:** Desktop cursor hover zooms into footwear details seamlessly.
3. **Advanced Reviews & Size Fit Indicator:**
   * Dynamic **Rating Distribution** bar chart calculated in real-time.
   * **Size Fit Slider** which aggregates user feedback (`Kekecilan` | `Pas` | `Kebesaran`) to show size tendencies dynamically.
4. **Seamless Address Book:** Autofill chips loaded directly from Firestore with an option to save new addresses instantly.
5. **Checkout & Billing Ledger:** Real-time coupon validation (`SAFTHOO10`, `FREEPRIORITY`, `STREETMOVEMENT`), dynamic shipping method adjustments, and robust billing calculations.
6. **Simulated QRIS Payment (Safthoo Pay):** Generates a simulated QRIS payload and updates payment status in real-time via Firestore listeners.
7. **Printable Invoice:** A physical-style, professional invoice layout that is automatically optimized for paper printing.

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18 or higher)
* A Firebase Project with Firestore and Authentication enabled

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/theclipperss1-create/Safthoo.git
   cd Safthoo/front-end
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables. Create a `.env.local` file in the `front-end` directory:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. Run the local development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

---

## ☁️ Deployment

### Database Rules
To deploy the secure Firestore rules to your live database, run:
```bash
npx firebase deploy --only firestore:rules
```

### Frontend Hosting
Since the frontend compiles into static assets, you can host it for free on **Vercel**, **Cloudflare Pages**, or **Firebase Hosting**.
Make sure to add your Firebase config environment variables to your hosting provider's dashboard before deploying.
