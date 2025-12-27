# Restooo API - TODO & Roadmap

This document tracks planned features, improvements, and technical debt for the Restooo Restaurant Management API.

---

## 🔐 Authentication & Authorization

### High Priority

- [ ] **Environment-Based Error Messages**
  - Make error messages configurable based on `NODE_ENV`
  - Development: Specific errors ("Token expired", "Invalid signature")
  - Production: Generic errors ("Unauthorized") for security
  - File: `src/middleware/authMiddleware.ts`

- [ ] **Token Refresh Mechanism**
  - Implement short-lived access tokens (15 minutes)
  - Implement long-lived refresh tokens (7 days)
  - Create endpoint: `POST /api/v1/auth/refresh`
  - Store refresh tokens in database or Redis
  - Rotate refresh tokens on each use
  - File: `src/controllers/authController.ts`, `src/routes/authRoutes.ts`

- [ ] **Token Blacklist/Revocation**
  - Implement proper server-side logout
  - Store revoked tokens in Redis with TTL
  - Check blacklist in `authMiddleware` before verifying
  - Create endpoint: `POST /api/v1/auth/logout` (server-side)
  - File: `src/middleware/authMiddleware.ts`

- [T] **Implement /me and /logout Endpoints**
  - Uncomment routes in `src/routes/authRoutes.ts`
  - Create `authController.me` method (return current user info)
  - Create `authController.logout` method (blacklist token)
  - File: `src/controllers/authController.ts`

### Medium Priority

- [ ] **Permission-Based Authorization**
  - Move beyond simple roles to fine-grained permissions
  - Define permissions: `'menu:create'`, `'order:delete'`, `'analytics:view'`
  - Store permissions in database (new table: `permissions`)
  - Link permissions to roles (many-to-many)
  - Create middleware: `requirePermission(['menu:create'])`
  - Update Prisma schema
  - File: `src/middleware/authMiddleware.ts`, `prisma/schema.prisma`

- [ ] **Rate Limiting Per User**
  - Implement user-specific rate limits based on role
  - Example: STAFF (100 requests/hour), ADMIN (unlimited)
  - Track by `userId` from JWT token
  - Use Redis for distributed rate limiting
  - Library: `express-rate-limit` + custom store
  - File: `src/middleware/rateLimiter.ts`

- [ ] **Password Reset Flow**
  - Create endpoint: `POST /api/v1/auth/forgot-password`
  - Create endpoint: `POST /api/v1/auth/reset-password`
  - Generate time-limited reset tokens (1 hour expiry)
  - Send reset email with link
  - Validate reset token before allowing password change
  - Hash new passwords with bcrypt
  - Integrate email service (SendGrid, AWS SES, or Nodemailer)
  - Files: `src/controllers/authController.ts`, `src/services/emailService.ts`

- [ ] **Account Lockout After Failed Attempts**
  - Lock account after 5 consecutive failed login attempts
  - Store failed attempt count in database or Redis
  - Auto-unlock after 30 minutes
  - Send email notification on lockout
  - Require email verification to manually unlock
  - Add `lockedUntil` field to User model
  - File: `src/services/authService.ts`, `prisma/schema.prisma`

### Low Priority

- [ ] **Two-Factor Authentication (2FA)**
  - Implement TOTP (Time-based One-Time Password)
  - Library: `speakeasy` for TOTP generation
  - Add `twoFactorSecret` and `twoFactorEnabled` to User model
  - Create endpoints:
    - `POST /api/v1/auth/2fa/enable` - Generate QR code
    - `POST /api/v1/auth/2fa/verify` - Verify TOTP code
    - `POST /api/v1/auth/2fa/disable` - Disable 2FA
  - Modify login flow to check for 2FA
  - Files: `src/controllers/authController.ts`, `src/services/authService.ts`

- [ ] **Email Verification**
  - Send verification email on registration
  - Add `emailVerified` boolean field to User model
  - Generate verification token (store in DB with expiry)
  - Create endpoint: `POST /api/v1/auth/verify-email`
  - Require verification for sensitive operations
  - Resend verification email option
  - Files: `src/services/authService.ts`, `src/services/emailService.ts`

- [ ] **Social Authentication (OAuth)**
  - Implement Google OAuth 2.0
  - Implement GitHub OAuth
  - Implement Facebook OAuth
  - Link social accounts to existing users
  - Store provider + providerId in User model
  - Library: `passport` + `passport-google-oauth20`, etc.
  - Files: `src/config/passport.ts`, `src/routes/authRoutes.ts`

- [ ] **Multi-Device Session Management**
  - Track active sessions per user across devices
  - Store sessions in database (new table: `sessions`)
  - Include: device info, IP address, last active
  - Create endpoints:
    - `GET /api/v1/auth/sessions` - List active sessions
    - `DELETE /api/v1/auth/sessions/:id` - Revoke specific session
    - `DELETE /api/v1/auth/sessions/all` - Revoke all sessions (except current)
  - Files: `src/models/Session.ts`, `src/controllers/authController.ts`

- [ ] **Audit Logging**
  - Log all authentication events to database
  - Events: login success/failure, logout, token refresh, password change
  - Store: timestamp, userId, IP address, user agent, event type
  - Create audit log table in database
  - Create endpoint: `GET /api/v1/auth/audit-logs` (ADMIN only)
  - Files: `prisma/schema.prisma`, `src/services/auditService.ts`

- [ ] **IP Whitelist/Blacklist**
  - Restrict ADMIN access to specific IP addresses
  - Block known malicious IPs
  - Store in database or config file
  - Middleware to check IP before authentication
  - File: `src/middleware/ipFilter.ts`

- [ ] **Token Renewal on Activity (Sliding Session)**
  - Extend token expiration on each authenticated request
  - Keep active users logged in automatically
  - Set maximum session duration (e.g., 30 days)
  - Balance: security vs user experience
  - File: `src/middleware/authMiddleware.ts`

---

## 📝 Menu Management

### High Priority

- [ ] **Implement Menu CRUD Operations**
  - Create `menuService.ts` with business logic
  - Create `menuController.ts` with HTTP handlers
  - Create `menuRoutes.ts` with endpoints:
    - `GET /api/v1/menu` - List all menu items (with filters)
    - `GET /api/v1/menu/:id` - Get single menu item
    - `POST /api/v1/menu` - Create menu item (ADMIN, MANAGER)
    - `PUT /api/v1/menu/:id` - Update menu item (ADMIN, MANAGER)
    - `DELETE /api/v1/menu/:id` - Delete menu item (ADMIN)
  - Add validation schemas with Zod
  - Implement filtering (category, available, price range)
  - Implement pagination
  - Files: `src/services/menuService.ts`, `src/controllers/menuController.ts`, `src/routes/menuRoutes.ts`

### Medium Priority

- [ ] **Image Upload for Menu Items**
  - Implement file upload with `multer`
  - Store images in cloud storage (AWS S3, Cloudinary)
  - Generate thumbnails for optimization
  - Add `imageUrl` and `thumbnailUrl` to MenuItem model
  - Validate image types and sizes
  - File: `src/middleware/uploadMiddleware.ts`

- [ ] **Menu Item Availability Scheduling**
  - Add schedule fields to MenuItem (e.g., available Mon-Fri, 9am-5pm)
  - Auto-update availability based on schedule
  - Cron job or scheduler to check availability
  - File: `src/services/menuService.ts`

- [ ] **Dietary Information & Allergens**
  - Already in schema, ensure proper implementation
  - Add validation for allergen list
  - Create filter endpoint: `GET /menu?allergen=dairy,gluten`
  - File: `src/validators/menuValidator.ts`

---

## 🛒 Order Management

### High Priority

- [ ] **Implement Order CRUD Operations**
  - Create `orderService.ts` with business logic
  - Create `orderController.ts` with HTTP handlers
  - Create `orderRoutes.ts` with endpoints:
    - `GET /api/v1/orders` - List all orders (with filters)
    - `GET /api/v1/orders/:id` - Get single order
    - `POST /api/v1/orders` - Create new order
    - `PATCH /api/v1/orders/:id/status` - Update order status
    - `DELETE /api/v1/orders/:id` - Cancel order
  - Implement order number generation
  - Calculate totals (subtotal, tax, tip, total)
  - Validate menu items exist and are available
  - Files: `src/services/orderService.ts`, `src/controllers/orderController.ts`, `src/routes/orderRoutes.ts`

### Medium Priority

- [ ] **Real-time Order Updates**
  - Implement WebSocket for live order updates
  - Notify kitchen when new order arrives
  - Notify customer when order status changes
  - Library: `socket.io`
  - File: `src/sockets/orderSocket.ts`

- [ ] **Order History & Analytics**
  - Track order history per customer
  - Calculate average order value
  - Track popular items
  - Revenue reports by date range
  - File: `src/services/analyticsService.ts`

- [ ] **Kitchen Display System (KDS)**
  - Separate view for kitchen staff
  - Show orders by preparation time
  - Mark items as complete
  - Real-time updates
  - Files: `src/routes/kitchenRoutes.ts`, frontend integration

---

## 📅 Reservation Management

### High Priority

- [ ] **Implement Reservation CRUD Operations**
  - Create `reservationService.ts` with business logic
  - Create `reservationController.ts` with HTTP handlers
  - Create `reservationRoutes.ts` with endpoints:
    - `GET /api/v1/reservations` - List all reservations
    - `GET /api/v1/reservations/availability` - Check availability
    - `GET /api/v1/reservations/:id` - Get single reservation
    - `POST /api/v1/reservations` - Create reservation
    - `PATCH /api/v1/reservations/:id` - Update reservation
    - `DELETE /api/v1/reservations/:id` - Cancel reservation
  - Validate date/time
  - Check table availability
  - Prevent double-booking
  - Files: `src/services/reservationService.ts`, `src/controllers/reservationController.ts`, `src/routes/reservationRoutes.ts`

### Medium Priority

- [ ] **Reservation Confirmation Emails**
  - Send confirmation email on reservation creation
  - Send reminder email 24 hours before
  - Send cancellation email
  - File: `src/services/emailService.ts`

- [ ] **Waitlist Management**
  - Add customers to waitlist when no tables available
  - Notify when table becomes available
  - Auto-remove from waitlist after time limit
  - File: `src/services/reservationService.ts`

---

## 👥 Customer Management

### High Priority

- [ ] **Implement Customer CRUD Operations**
  - Create `customerService.ts` with business logic
  - Create `customerController.ts` with HTTP handlers
  - Create `customerRoutes.ts` with endpoints:
    - `GET /api/v1/customers` - List all customers
    - `GET /api/v1/customers/:id` - Get single customer
    - `POST /api/v1/customers` - Create customer
    - `PUT /api/v1/customers/:id` - Update customer
    - `DELETE /api/v1/customers/:id` - Delete customer
    - `GET /api/v1/customers/:id/orders` - Get order history
  - Files: `src/services/customerService.ts`, `src/controllers/customerController.ts`, `src/routes/customerRoutes.ts`

### Medium Priority

- [ ] **Loyalty Points System**
  - Calculate points based on order total
  - Redeem points for discounts
  - Track points history
  - Add points expiration
  - File: `src/services/loyaltyService.ts`

- [ ] **Customer Preferences**
  - Store dietary restrictions
  - Store favorite menu items
  - Store seating preferences
  - Use for personalized recommendations
  - Update Prisma schema

---

## 🪑 Table Management

### High Priority

- [ ] **Implement Table CRUD Operations**
  - Create `tableService.ts` with business logic
  - Create `tableController.ts` with HTTP handlers
  - Create `tableRoutes.ts` with endpoints:
    - `GET /api/v1/tables` - List all tables
    - `GET /api/v1/tables/:id` - Get single table
    - `POST /api/v1/tables` - Create table (ADMIN, MANAGER)
    - `PUT /api/v1/tables/:id` - Update table (ADMIN, MANAGER)
    - `PATCH /api/v1/tables/:id/status` - Update table status
    - `DELETE /api/v1/tables/:id` - Delete table (ADMIN)
  - Files: `src/services/tableService.ts`, `src/controllers/tableController.ts`, `src/routes/tableRoutes.ts`

### Medium Priority

- [ ] **Table Availability View**
  - Real-time table status dashboard
  - Show occupied, available, reserved tables
  - Visual floor plan (future frontend feature)
  - File: `src/controllers/tableController.ts`

---

## 👨‍🍳 Staff Management

### High Priority

- [ ] **Implement Staff CRUD Operations**
  - Create `staffService.ts` with business logic
  - Create `staffController.ts` with HTTP handlers
  - Create `staffRoutes.ts` with endpoints:
    - `GET /api/v1/staff` - List all staff (ADMIN, MANAGER)
    - `GET /api/v1/staff/:id` - Get single staff member
    - `POST /api/v1/staff` - Create staff member (ADMIN)
    - `PUT /api/v1/staff/:id` - Update staff member (ADMIN, MANAGER)
    - `DELETE /api/v1/staff/:id` - Delete staff member (ADMIN)
  - Files: `src/services/staffService.ts`, `src/controllers/staffController.ts`, `src/routes/staffRoutes.ts`

### Medium Priority

- [ ] **Shift Scheduling**
  - Assign shifts to staff members
  - Track working hours
  - Prevent scheduling conflicts
  - Create new table: `shifts`
  - Files: `prisma/schema.prisma`, `src/services/shiftService.ts`

---

## 📊 Analytics & Reports

### High Priority

- [ ] **Implement Basic Analytics**
  - Create `analyticsService.ts` with calculations
  - Create `analyticsController.ts` with HTTP handlers
  - Create `analyticsRoutes.ts` with endpoints:
    - `GET /api/v1/analytics/sales` - Sales by date range
    - `GET /api/v1/analytics/popular-items` - Most ordered items
    - `GET /api/v1/analytics/revenue` - Revenue reports
    - `GET /api/v1/analytics/reservations` - Reservation statistics
  - Require ADMIN or MANAGER role
  - Files: `src/services/analyticsService.ts`, `src/controllers/analyticsController.ts`, `src/routes/analyticsRoutes.ts`

### Medium Priority

- [ ] **Advanced Reporting**
  - Export reports as PDF or CSV
  - Email scheduled reports
  - Dashboard with charts (frontend)
  - Profit margins calculation
  - Library: `pdfkit` or `puppeteer` for PDF
  - File: `src/services/reportService.ts`

---

## 🧪 Testing

### High Priority

- [ ] **Unit Tests**
  - Test services (authService, menuService, etc.)
  - Test middleware (authMiddleware, validation)
  - Test utility functions
  - Library: Jest
  - Target: 80% code coverage
  - Files: `src/**/*.test.ts`

- [ ] **Integration Tests**
  - Test API endpoints end-to-end
  - Test authentication flow
  - Test CRUD operations
  - Use test database
  - Library: Jest + Supertest
  - Files: `tests/integration/**/*.test.ts`

### Medium Priority

- [ ] **E2E Tests**
  - Test complete user flows
  - Test with real browser (if frontend exists)
  - Library: Playwright or Cypress
  - Files: `tests/e2e/**/*.test.ts`

---

## 📚 Documentation

### High Priority

- [ ] **API Documentation**
  - Generate OpenAPI/Swagger docs
  - Library: `swagger-jsdoc` + `swagger-ui-express`
  - Endpoint: `GET /api/v1/docs`
  - Document all endpoints, request/response formats
  - File: `src/config/swagger.ts`

- [ ] **README Improvements**
  - Installation instructions
  - Environment setup guide
  - API usage examples
  - Architecture diagram
  - File: `README.md`

### Medium Priority

- [ ] **Code Documentation**
  - Add JSDoc comments to all public functions
  - Explain complex logic
  - Document business rules
  - Generate docs with TypeDoc

---

## 🚀 DevOps & Infrastructure

### High Priority

- [ ] **Environment Configuration**
  - Separate configs for dev, staging, production
  - Validate all required env vars on startup
  - Document all env vars in README
  - File: `src/config/env.ts`

- [ ] **Error Handling**
  - Global error handler middleware
  - Standardize error responses
  - Log errors to file or service
  - File: `src/middleware/errorHandler.ts`

- [ ] **Logging**
  - Structured logging (Winston or Pino)
  - Log levels (debug, info, warn, error)
  - Log rotation
  - Send logs to monitoring service (Datadog, Sentry)
  - File: `src/config/logger.ts`

### Medium Priority

- [ ] **Docker Setup**
  - Dockerfile for API
  - docker-compose for full stack (API + DB + Redis)
  - Multi-stage builds for optimization
  - Files: `Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml`

- [ ] **CI/CD Pipeline**
  - GitHub Actions or GitLab CI
  - Automated testing on push
  - Automated deployment to staging
  - Manual approval for production
  - File: `.github/workflows/ci.yml`

- [ ] **Database Migrations**
  - Version control for schema changes
  - Rollback capability
  - Already using Prisma Migrate (good!)
  - Document migration process
  - File: `docs/migrations.md`

### Low Priority

- [ ] **Monitoring & Alerting**
  - Health check endpoint (already exists!)
  - CPU/Memory monitoring
  - API response time tracking
  - Alert on errors or high load
  - Service: Datadog, New Relic, or Prometheus

- [ ] **Rate Limiting (Global)**
  - Protect API from abuse
  - Global rate limit: 100 requests/minute per IP
  - Different limits for authenticated users
  - Library: `express-rate-limit`
  - File: `src/middleware/rateLimiter.ts`

- [ ] **Caching**
  - Cache frequently accessed data (menu items, etc.)
  - Redis for distributed caching
  - Cache invalidation on updates
  - Library: `ioredis`
  - File: `src/config/redis.ts`

---

## 🔒 Security

### High Priority

- [ ] **Input Sanitization**
  - Already using Zod validation ✅
  - Add XSS protection
  - SQL injection protection (Prisma handles this ✅)
  - Library: `xss-clean`, `express-mongo-sanitize`

- [ ] **CORS Configuration**
  - Restrict allowed origins in production
  - Currently allows all origins (okay for dev)
  - Update CORS config based on frontend URL
  - File: `src/app.ts`

- [ ] **Security Headers**
  - Already using Helmet ✅
  - Review and customize Helmet config
  - Add CSP (Content Security Policy)
  - File: `src/app.ts`

### Medium Priority

- [ ] **HTTPS Only**
  - Force HTTPS in production
  - Redirect HTTP to HTTPS
  - HSTS header
  - File: `src/middleware/httpsRedirect.ts`

- [ ] **SQL Injection Prevention**
  - Already protected by Prisma ✅
  - Never use raw SQL queries without parameterization
  - Review any raw queries

---

## 🎨 Code Quality

### High Priority

- [ ] **Linting**
  - ESLint configuration
  - Prettier for code formatting
  - Pre-commit hooks (Husky + lint-staged)
  - Files: `.eslintrc.js`, `.prettierrc`

- [ ] **TypeScript Strict Mode**
  - Already enabled ✅
  - Review any `any` types
  - Remove unnecessary type assertions

### Medium Priority

- [ ] **Code Review Guidelines**
  - Document PR process
  - Code review checklist
  - File: `docs/contributing.md`

---

## 📱 Future Features

### Long-term Ideas

- [ ] **Mobile App Support**
  - RESTful API is mobile-ready ✅
  - Consider GraphQL for mobile efficiency
  - Push notifications for order updates

- [ ] **Multi-language Support (i18n)**
  - Internationalization for error messages
  - Support multiple languages for menu items
  - Library: `i18next`

- [ ] **Multi-tenant Support**
  - Support multiple restaurants in one system
  - Tenant isolation at database level
  - Subdomain or path-based routing

- [ ] **Payment Integration**
  - Stripe or PayPal integration
  - Process online payments
  - Split bills
  - Tip calculation
  - Files: `src/services/paymentService.ts`

- [ ] **Inventory Management**
  - Track ingredient stock
  - Auto-order ingredients
  - Recipe management
  - Cost calculation
  - New tables: `ingredients`, `recipes`

- [ ] **Delivery Integration**
  - Integrate with DoorDash, UberEats APIs
  - Track delivery drivers
  - Real-time delivery tracking

---

## 📝 Notes

- **Priority Levels:**
  - **High:** Should be implemented soon (1-2 months)
  - **Medium:** Important but can wait (3-6 months)
  - **Low:** Nice to have (6+ months)

- **Estimated Effort:**
  - Each high-priority item: 1-3 days
  - Each medium-priority item: 3-7 days
  - Each low-priority item: 1-2 weeks

- **Dependencies:**
  - Some items depend on others (e.g., logout needs token blacklist)
  - Prioritize dependencies first

---

**Last Updated:** December 2024
