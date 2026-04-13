# E-Commerce Website

A full-featured e-commerce platform built with Node.js, Express, MongoDB, and EJS.

## Features

### User Features
- User authentication (Email/Password and Google OAuth)
- Product browsing and search
- Shopping cart management
- Wishlist functionality
- Order management
- Wallet system with transactions
- Referral program
- Coupon code application
- Product offers and discounts
- Address management
- Order tracking
- Payment integration (Razorpay)
- Return/Refund requests

### Admin Features
- Admin dashboard with analytics
- Product management (CRUD operations)
- Category management
- Order management and status updates
- User management (block/unblock users)
- Coupon management
- Offer management
- Sales reports and analytics
- Inventory management

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

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

3. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

4. Configure your `.env` file with the following variables:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
MONGO_URI=mongodb://localhost:27017/ecommerce

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Razorpay Payment Gateway
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Cloudinary Image Storage
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET_KEY=your_cloudinary_secret_key

# Email Configuration (for OTP)
EMAIL=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
```

5. Start the MongoDB server (if using local MongoDB):
```bash
mongod
```

6. Run the application:
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

7. Open your browser and navigate to:
```
http://localhost:3000
```

## Project Structure

```
ecommerce3rdFeb/
├── config/              # Configuration files (DB, Passport, Cloudinary, Session)
├── controllers/          # Route controllers
│   ├── admin/           # Admin controllers
│   └── user/            # User controllers
├── middlewares/         # Custom middleware functions
├── models/              # Mongoose models
├── routes/              # Route definitions
│   ├── adminRoutes/     # Admin routes
│   └── userRoutes/      # User routes
├── services/            # Business logic services
├── views/               # EJS templates
│   ├── adminPages/      # Admin views
│   └── userPages/       # User views
├── public/              # Static files (CSS, JS, images)
├── jobs/                # Scheduled jobs (cron jobs)
└── index.js             # Application entry point
```

## Key Technologies

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: Passport.js (Local & Google OAuth)
- **Payment**: Razorpay
- **Image Storage**: Cloudinary
- **Email**: Nodemailer
- **Template Engine**: EJS
- **Session Management**: express-session

## API Endpoints

### User Routes
- `GET /` - Home page
- `GET /signin` - Sign in page
- `POST /signin` - Sign in
- `GET /signup` - Sign up page
- `POST /signup` - Sign up
- `GET /shop` - Shop page with filters
- `GET /product/:id` - Product details
- `GET /cart` - Cart page
- `GET /checkout` - Checkout page
- `POST /order/create-razorpay` - Create Razorpay order
- `POST /verify-payment` - Verify payment
- `GET /profile` - User profile
- `GET /profile/orders` - User orders

### Admin Routes
- `GET /admin` - Admin login
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/products` - Product management
- `GET /admin/orders` - Order management
- `GET /admin/customers` - User management
- `GET /admin/categories` - Category management
- `GET /admin/coupons` - Coupon management
- `GET /admin/offers` - Offer management
- `GET /admin/sales-report` - Sales reports

## Features in Detail

### Payment Integration
- Razorpay integration for secure payments
- Payment verification
- Refund processing

### Order Management
- Order creation with multiple items
- Order status tracking
- Return/refund requests
- Order history

### Product Management
- Product variants (size, color)
- Inventory management
- Product images
- Category-based organization
- Search and filter functionality

### User Management
- User registration and authentication
- Profile management
- Address management
- Wallet system
- Referral program

### Admin Panel
- Comprehensive dashboard
- Sales analytics
- User management
- Product and inventory management
- Order processing

## Security Features

- Password hashing with bcrypt
- Session-based authentication
- CSRF protection
- Input validation
- Secure payment processing

## Development

### Running in Development Mode
```bash
npm run dev
```

This will start the server with nodemon for automatic restarts on file changes.

### Environment Variables
Make sure to set all required environment variables in your `.env` file before running the application.

## Troubleshooting

### Database Connection Issues
- Ensure MongoDB is running
- Check your `MONGO_URI` in `.env` file
- Verify network connectivity if using cloud MongoDB

### Payment Issues
- Verify Razorpay credentials in `.env`
- Check Razorpay dashboard for API keys

### Email Issues
- For Gmail, use App-Specific Password
- Verify email credentials in `.env`
- Check email service configuration

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For support, email your-email@example.com or create an issue in the repository.
