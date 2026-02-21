# eSIM Monorepo

This is a monorepo containing the eSIM customer application and admin panel as separate deployable projects.

## 📁 Project Structure

```
esimmain/
├── packages/
│   ├── shared/              # Shared code (contexts, services, utils)
│   ├── customer-app/        # Customer-facing application (NO admin code)
│   └── admin-app/           # Admin panel application
├── package.json             # Root workspace configuration
└── README.md
```

## 🚀 Quick Start

### Install Dependencies

```bash
npm install
```

This will install dependencies for all packages in the monorepo.

### Development

Run customer app (port 3000):
```bash
npm run dev:customer
```

Run admin app (port 3001):
```bash
npm run dev:admin
```

### Build

Build customer app:
```bash
npm run build:customer
```

Build admin app:
```bash
npm run build:admin
```

Build all:
```bash
npm run build:all
```

## 📦 Packages

### @esim/shared
Shared utilities, services, contexts, and Supabase configuration used by both apps.

**Exports:**
- Supabase configuration
- Authentication context
- Admin context
- Services (admin, referral, etc.)
- Utilities
- Hooks
- Common components (Loading, Providers, etc.)

### @esim/customer-app
Customer-facing eSIM application.

**Features:**
- eSIM plans browsing and purchase
- User dashboard
- Multi-language support (EN, AR, RU, DE, FR, ES, HE)
- Blog
- Contact forms
- Referral system
- Stripe & Coinbase payments

**NO admin functionality included** - smaller bundle, faster performance.

### @esim/admin-app
Admin panel for managing the eSIM platform.

**Features:**
- User management
- eSIM plans management
- Country management
- Blog management
- Notifications management
- Contact requests
- Newsletter management
- Job applications
- API configuration
- Application logs

## 🌐 Deployment

### Vercel Setup

1. **Create two Vercel projects:**
   - Project 1: `esim-customer` (for customer app)
   - Project 2: `esim-admin` (for admin app)

2. **Configure each project:**

   **Customer App:**
   - Root Directory: `packages/customer-app`
   - Framework Preset: Next.js
   - Build Command: `cd ../.. && npm run build:customer`
   - Output Directory: `.next`
   - Install Command: `cd ../.. && npm install`

   **Admin App:**
   - Root Directory: `packages/admin-app`
   - Framework Preset: Next.js
   - Build Command: `cd ../.. && npm run build:admin`
   - Output Directory: `.next`
   - Install Command: `cd ../.. && npm install`

   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   STRIPE_SECRET_KEY
   STRIPE_WEBHOOK_SECRET
   COINBASE_API_KEY
   RESEND_API_KEY
   ```

4. **Configure Domains:**
   - Customer app: `simnetiq.com` (or your main domain)
   - Admin app: `admin.simnetiq.com` (subdomain)


## 📊 Performance Benefits

By separating the admin panel:

✅ **Customer app bundle size reduced by ~200-300KB**
✅ **Faster initial page load (no admin code)**
✅ **Better Core Web Vitals scores**
✅ **Improved SEO rankings**
✅ **Admin panel isolated from customer traffic**
✅ **Independent scaling and deployment**

## 🔒 Security

- Admin panel has `noindex, nofollow` robots meta tags
- Admin routes protected by `AdminGuard` component
- Role-based access control (RBAC)

- Admin domain can be IP-restricted if needed

## 🛠️ Development Tips

1. **Shared code changes:** When modifying shared code, both apps will need to be restarted
2. **Import paths:** Always use `@esim/shared/*` for shared imports
3. **Testing:** Test both apps after making changes to shared code
4. **Environment variables:** Keep `.env.local` in each package directory

## 📝 Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev:customer` | Start customer app dev server (port 3000) |
| `npm run dev:admin` | Start admin app dev server (port 3001) |
| `npm run build:customer` | Build customer app for production |
| `npm run build:admin` | Build admin app for production |
| `npm run build:all` | Build all packages |
| `npm run start:customer` | Start customer app production server |
| `npm run start:admin` | Start admin app production server |
| `npm run lint` | Lint all packages |
| `npm run clean` | Clean all node_modules and build artifacts |

## 🐛 Troubleshooting

### Module not found errors
```bash
npm run clean
npm install
```

### Build fails
- Check that shared package exports are correct
- Verify import paths use `@esim/shared/*`
- Ensure all environment variables are set

### Admin panel not accessible
- Verify user has `admin` or `super_admin` role in the `users` table

- Verify AdminGuard is working correctly

## 📄 License

ISC

