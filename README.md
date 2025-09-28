# ACNC Project - Mena Safety Management System

ระบบจัดการความปลอดภัยสำหรับการจัดการกรณีอุบัติเหตุ (Accident Cases) และกรณีไม่สอดคล้องตามมาตรฐาน (Non-Conformance Cases)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Installation
```bash
# Clone repository
git clone https://github.com/menatransport/mena-safety-ncac.git
cd acnc-project

# Install dependencies
npm install

# Run development server
npm run dev
```

### Available Scripts
```bash
npm run dev        # Start development server with Turbopack
npm run build      # Build for production with Turbopack
npm start          # Start production server
npm run lint       # Run ESLint
```

## 🏗️ Project Structure

```
acnc-project/
├── 📁 app/           # Next.js App Router pages & API routes
├── 📁 components/    # React components
├── 📁 lib/          # Utility functions & types
├── 📁 public/       # Static assets
├── 📁 types/        # TypeScript definitions
└── 📄 Config files  # Various configuration files
```

## 🎯 Core Features

- **🔐 Authentication System** - Secure login with remember me functionality
- **📊 Dashboard Overview** - Statistics and navigation hub
- **📝 Accident Case Management** - Form entry and records management
- **📋 Non-Conformance Cases** - Standards compliance tracking
- **⚙️ Settings & Configuration** - User and system preferences

## 🛠️ Technology Stack

- **Framework**: Next.js 15.5.3 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + DaisyUI 5
- **UI Components**: Radix UI + Custom components
- **Forms**: React Hook Form + Zod validation
- **Notifications**: SweetAlert2
- **Icons**: Lucide React + Lord Icon

## 📚 Documentation

For detailed information about the project:

- **[📖 Complete Documentation](./DOCUMENTATION.md)** - Full project overview and structure
- **[🏗️ Code Architecture Guide](./CODE_ARCHITECTURE.md)** - Technical architecture and patterns
- **[🧩 Component Guide](./COMPONENT_GUIDE.md)** - Component development and analysis

## 🌐 API Integration

The application integrates with external API:
- **Base URL**: `https://api-ncac.onrender.com`
- **Authentication**: `/auth/login`

Internal API routes are available at `/api/*` endpoints.

## 🎨 Design System

- **Color Scheme**: Light green theme (`#eef8ef` background)
- **Components**: Tailwind utility classes + DaisyUI components
- **Typography**: Geist Sans & Geist Mono fonts
- **Responsive**: Mobile-first design approach

## 🔧 Development

### Project Configuration
- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js configuration
- **Turbopack**: Fast bundling for dev & build
- **PostCSS**: With Tailwind CSS processing

### Environment Setup
```bash
# Development with Turbopack (faster builds)
npm run dev --turbopack

# Production build
npm run build --turbopack
```

## 🚀 Deployment

The application is designed to work with:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Docker containers**
- **Traditional web servers**

## 🧪 Testing

Testing setup is ready for implementation:
- Jest + React Testing Library (to be configured)
- Cypress for E2E testing (to be configured)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software owned by Mena Transport.

## 📞 Support

For technical support or questions:
- **Repository**: [mena-safety-ncac](https://github.com/menatransport/mena-safety-ncac)
- **Owner**: menatransport
- **Current Branch**: main

---

**Mena Safety Management System** - Ensuring safety through effective incident management and compliance tracking.