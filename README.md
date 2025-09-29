# ACNC Project Documentation
## ระบบจัดการความปลอดภัย Mena Safety

### ภาพรวมโปรเจค
โปรเจค ACNC (Accident & Non-Conformance) เป็นระบบจัดการความปลอดภัยสำหรับบริษัท Mena Transport ที่พัฒนาด้วย Next.js 15 และ TypeScript เพื่อจัดการกับเหตุการณ์อุบัติเหตุ (Accident Cases) และเหตุการณ์ไม่สอดคล้องตามมาตรฐาน (Non-Conformance Cases)

---

## โครงสร้างโปรเจค

### 📁 Root Directory
```
acnc-project/
├── 📁 app/           # Next.js App Router
├── 📁 components/    # React Components
├── 📁 lib/          # Utility functions & Types
├── 📁 public/       # Static assets
├── 📁 types/        # TypeScript type definitions
└── 📄 Config files  # Configuration files
```

### 🔧 Technology Stack
- **Framework**: Next.js 15.5.3 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4.1.12 + DaisyUI 5.0.50
- **UI Components**: Radix UI + Custom components
- **Forms**: React Hook Form + Zod validation
- **Notifications**: SweetAlert2 + Sonner
- **Icons**: Lucide React + Lord Icon animations

---

## 📁 Directory Structure Detail

### `/app` - Application Routes
```
app/
├── favicon.ico
├── globals.css       # Global styles
├── layout.tsx        # Root layout
├── page.tsx          # Home page (redirects to /login)
├── ac-form/          # Accident Case form page
├── ac-records/       # Accident Cases records page
├── api/              # API routes
│   ├── auth/
│   │   ├── login/    # Authentication login
│   │   └── register/ # User registration
│   ├── document/     # Document management
│   └── list/         # Data listing
├── login/            # Login page
├── nc-form/          # Non-Conformance form page
├── nc-records/       # Non-Conformance records page
├── overview/         # Dashboard overview
└── settings/         # Application settings
```

### `/components` - React Components
```
components/
├── ACForm.tsx        # Accident Case form component
├── ACRecords.tsx     # Accident Cases records display
├── Dashboard.tsx     # Main dashboard component
├── Login.tsx         # Login form component
├── LordIcon.tsx      # Animated icon component
├── Navbar.tsx        # Navigation bar
├── NCForm.tsx        # Non-Conformance form component
├── NCRecords.tsx     # Non-Conformance records display
├── picture.tsx       # Image/picture component
├── Settings.tsx      # Settings component
└── ui/               # Reusable UI components
    ├── button.tsx
    ├── calendar.tsx
    ├── datetime-picker.tsx
    ├── input.tsx
    ├── popover.tsx
    ├── scroll-area.tsx
    └── searchable-select.tsx
```

### `/lib` - Utilities & Types
```
lib/
├── caseReport.ts     # Case report interface & types
└── utils.ts          # Utility functions
```

---

## 🔐 Authentication System
- **Login Endpoint**: `/api/auth/login`
- **External API**: `https://api-ncac.onrender.com/auth/login`
- **Features**: 
  - Username/Password authentication
  - "Remember me" functionality
  - Local storage for session management
  - Welcome notification after successful login

---

## 📊 Core Features

### 1. **Accident Cases (AC)**
- 📝 **Form Entry**: `/ac-form` - บันทึกเหตุการณ์อุบัติเหตุ
- 📋 **Records View**: `/ac-records` - แสดงรายการเหตุการณ์อุบัติเหตุ
- 🔍 **Features**: Search, Filter, Pagination

### 2. **Non-Conformance Cases (NC)**
- 📝 **Form Entry**: `/nc-form` - บันทึกเหตุการณ์ไม่สอดคล้องมาตรฐาน
- 📋 **Records View**: `/nc-records` - แสดงรายการเหตุการณ์ไม่สอดคล้อง
- 🔍 **Features**: Search, Filter, Pagination

### 3. **Dashboard Overview**
- 📈 **Statistics**: Total cases, Pending cases
- 🎯 **Quick Access**: Navigation to main features
- 📊 **Visual Indicators**: Status cards and metrics

### 4. **Settings & Configuration**
- ⚙️ **User Settings**: Profile management
- 🔧 **System Configuration**: Application preferences

---

## 🎨 UI/UX Design

### Color Scheme
- **Primary Background**: `#eef8ef` (Light green)
- **Card Background**: `#ffffff` (White)
- **Text**: Gray scale (`text-gray-800`, `text-gray-600`)

### Design System
- **Framework**: Tailwind CSS + DaisyUI
- **Components**: Shadcn/ui compatible
- **Icons**: Lucide React + Lord Icon animations
- **Typography**: Geist Sans + Geist Mono fonts
- **Responsive**: Mobile-first approach

---

## 🔌 API Integration

### Internal APIs (`/api`)
```
/api/auth/login     # User authentication
/api/auth/register  # User registration
/api/document       # Document management
/api/list          # Data listing
```

### External API
- **Base URL**: `https://api-ncac.onrender.com`
- **Authentication**: POST `/auth/login`

---

## 📦 Dependencies Overview

### Production Dependencies
- **Next.js 15.5.3**: React framework
- **React 19.1.1**: UI library
- **TypeScript 5**: Type safety
- **Tailwind CSS**: Styling framework
- **React Hook Form**: Form management
- **Zod**: Schema validation
- **SweetAlert2**: Beautiful alerts
- **Date-fns**: Date utilities
- **Radix UI**: Accessible components

### Development Dependencies
- **ESLint**: Code linting
- **DaisyUI**: UI component library
- **@types/***: TypeScript definitions


## 📁 File Naming Conventions

### Components
- **PascalCase**: `ACForm.tsx`, `Dashboard.tsx`
- **Client Components**: Include `"use client"` directive
- **Server Components**: Default (no directive)

### Pages (App Router)
- **page.tsx**: Route component
- **layout.tsx**: Layout component
- **route.ts**: API route handler

### Utilities
- **camelCase**: `caseReport.ts`, `utils.ts`
- **kebab-case**: For multi-word files

---

## 🔍 Code Structure Patterns

### State Management
- **useState**: Local component state
- **useEffect**: Side effects & lifecycle
- **localStorage**: Client-side persistence
- **sessionStorage**: Temporary session data

### Styling Approach
- **Tailwind Classes**: Utility-first CSS
- **DaisyUI Components**: Pre-built components
- **Responsive Design**: Mobile-first breakpoints
- **Dark Mode**: Not currently implemented

### Type Safety
- **Interface Definitions**: `caseReport.ts`
- **Strict TypeScript**: Full type coverage
- **Zod Validation**: Runtime type checking

