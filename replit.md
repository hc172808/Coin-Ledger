# GYDS Banking Platform

## Overview

GYDS Banking is a dual-service mobile banking platform built with Expo/React Native for the frontend and Express.js for the backend. The platform combines blockchain wallet functionality with traditional "Internet Funds" banking, featuring two native coins (GYDS for fees/gas and GYD as stablecoin) alongside off-chain fiat-style balances stored in PostgreSQL.

The application supports cross-platform deployment (iOS, Android, Web) and includes features like QR code scanning, card management, transaction history, and secure authentication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React Native + Expo)
- **Framework**: Expo SDK 54 with React Native 0.81
- **Navigation**: React Navigation v7 with native stack and bottom tab navigators
- **State Management**: TanStack React Query for server state, React Context for auth state
- **Styling**: StyleSheet with custom theming system (light/dark mode support)
- **Animations**: React Native Reanimated for smooth micro-interactions
- **Path Aliases**: `@/` maps to `./client/`, `@shared/` maps to `./shared/`

### Backend (Express.js)
- **Runtime**: Node.js with TypeScript (tsx for development, esbuild for production)
- **API Design**: RESTful endpoints under `/api/` prefix
- **Authentication**: Token-based auth with secure storage on client, SHA-256 password hashing
- **Database**: PostgreSQL via Drizzle ORM with schema in `shared/schema.ts`

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL adapter
- **Schema Location**: `shared/schema.ts` (shared between client types and server)
- **Key Tables**: users, wallets, transactions, cards, paymentRequests, auditLogs
- **Migrations**: Managed via `drizzle-kit push`

### Authentication Flow
- Registration creates user + wallet with generated address
- Login returns auth token stored in SecureStore (native) or AsyncStorage (web)
- Auth context manages session state and wallet data refresh

### Fund Types
1. **Internet Funds**: Off-chain GYD balances in PostgreSQL (instant, reversible)
2. **GYD**: On-chain stablecoin for blockchain transactions
3. **GYDS**: On-chain gas token for fees and staking

## External Dependencies

### Database
- **PostgreSQL**: Primary data store (requires `DATABASE_URL` environment variable)
- **Drizzle ORM**: Database toolkit for TypeScript

### Mobile/Native Features
- **expo-secure-store**: Secure credential storage on native platforms
- **expo-camera**: QR code scanning functionality
- **expo-local-authentication**: Biometric authentication support
- **expo-haptics**: Tactile feedback on supported devices

### UI Libraries
- **expo-blur**: Glass effect backgrounds for iOS
- **expo-linear-gradient**: Gradient backgrounds for cards
- **expo-image**: Optimized image loading

### Development Environment
- **Replit Integration**: Uses `REPLIT_DEV_DOMAIN` and `REPLIT_DOMAINS` for CORS configuration
- **Environment Variables**: `DATABASE_URL`, `EXPO_PUBLIC_DOMAIN` required