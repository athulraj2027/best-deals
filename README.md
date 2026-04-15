# E-Commerce Platform

This repository contains a full-featured e-commerce application built with Node.js, Express, MongoDB, and EJS. It is structured to support both customer-facing storefront workflows and administrative management.

## Overview

The application provides a complete shopping experience for users, including product browsing, cart and wishlist handling, checkout, and order tracking. The admin panel supports product management, order processing, user management, coupon and offer configuration, and sales reporting.

## Features

### User Experience
- Customer registration and login with email/password and Google OAuth
- Browse products by category and search terms
- Add items to cart and wishlist
- Manage shipping addresses and profile data
- Apply coupons and view active product offers
- Checkout with Razorpay payment integration
- Track orders, request returns, and review wallet transactions

### Admin Experience
- Secure admin login and dashboard access
- Manage products, categories, coupons, and offers
- Process orders and update order statuses
- Block or unblock customers
- View sales reports and analytics
- Manage inventory and product listings

## Technology Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- EJS templating
- Passport.js for authentication
- Razorpay for payment processing
- Cloudinary for image storage
- Nodemailer for email functionality
- express-session for session handling

## Prerequisites

- Node.js v14 or higher
- MongoDB instance (local or hosted)
- npm

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd ecommerce3rdFeb
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root. If a template is available, copy it:

```bash
copy .env.example .env
```

4. Configure the `.env` file with the required values:

```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/ecommerce
SESSION_SECRET=your_session_secret
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET_KEY=your_cloudinary_secret_key
EMAIL=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
```

5. Start MongoDB if using a local database:

```bash
mongod
```

6. Run the application:

```bash
npm run dev
```

7. Open the application in your browser:

```text
http://localhost:3000
```

## Project Structure

```text
ecommerce3rdFeb/
├── config/            # Database, passport, Cloudinary, and session configuration
├── controllers/       # Request handlers for admin and user routes
│   ├── admin/
│   └── user/
├── middlewares/       # Authentication and application middleware
├── models/            # MongoDB data models
├── routes/            # Route definitions for admin and user flows
│   ├── adminRoutes/
│   └── userRoutes/
├── services/          # Business logic helpers
├── views/             # EJS templates for UI rendering
│   ├── adminPages/
│   └── userPages/
├── public/            # Static files (CSS, JS, images)
├── jobs/              # Scheduled tasks and background jobs
└── index.js           # Application entry point
```

## Run Commands

- Development mode with automatic reload:

```bash
npm run dev
```

- Production mode:

```bash
npm start
```

## Notes

- Verify the MongoDB connection string and environment variables before running the application.
- Ensure Razorpay and Google OAuth credentials are configured if those features are enabled.
- Cloudinary credentials are required for product image upload.

## Contact

Review configuration files and update credentials before deploying or sharing this application.
