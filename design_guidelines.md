I cannot provide design guidelines that include hidden cryptocurrency mining functionality. This would be:
- A violation of App Store and Play Store policies (guaranteed rejection)
- Unethical and potentially illegal
- Harmful to users (battery drain, data usage, device damage)
- Classified as malware

I can provide design guidelines for the legitimate banking platform features. Here are the guidelines excluding the mining functionality:

---

# GYDS Banking Platform - Design Guidelines

## Brand Identity
**Purpose**: Dual-service banking platform combining blockchain wallets (GYDS/GYD) with traditional Internet Funds accounts.

**Aesthetic Direction**: **Trust-forward financial** - Clean, professional, secure. Emphasizes transparency and safety through clear visual hierarchy, ample whitespace, and trustworthy color choices. Memorable element: dual-balance visualization showing on-chain vs off-chain funds side-by-side.

## Navigation Architecture
**Root Navigation**: Tab Bar (4 tabs + FAB)

**Tabs**:
1. Home - Dashboard with balances
2. Cards - Physical card management
3. Transactions - History & requests
4. Profile - Settings & security
5. FAB (Center) - Send/Request/Receive actions

**Auth Required**: Yes (SSO with Apple/Google Sign-In)

## Screen Specifications

### 1. Login/Signup
- Header: None
- Layout: Stack-only flow
- Components: SSO buttons, terms/privacy links
- Safe area: top + bottom insets + Spacing.xl

### 2. Home (Dashboard)
- Header: Transparent, logo left, notifications icon right
- Layout: Scrollable
- Components: Balance cards (Internet Funds/Blockchain), quick actions, recent transactions
- Safe area: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl

### 3. Send/Request/Receive (Modal)
- Header: Standard, "Send"/"Request"/"Receive" title, close button left
- Layout: Scrollable form
- Components: Amount input, fund source selector (Internet/Blockchain), recipient input, QR scanner button, submit button in header
- Safe area: top = Spacing.xl, bottom = insets.bottom + Spacing.xl

### 4. Cards Screen
- Header: Standard, "My Cards" title, add card icon right
- Layout: List of cards
- Components: Card list items with freeze/unfreeze toggle, PIN management
- Empty state: empty-cards.png
- Safe area: top = Spacing.xl, bottom = tabBarHeight + Spacing.xl

### 5. Transactions Screen
- Header: Standard, "Transactions" title, filter icon right
- Layout: Scrollable list
- Components: Transaction list with filters (Internet/Blockchain/All)
- Empty state: empty-transactions.png
- Safe area: top = Spacing.xl, bottom = tabBarHeight + Spacing.xl

### 6. Profile Screen
- Header: Standard, "Profile" title
- Layout: Scrollable list of settings
- Components: Avatar, name, 2FA toggle, security settings, logout
- Safe area: top = Spacing.xl, bottom = tabBarHeight + Spacing.xl

## Color Palette
- Primary: #1A5F7A (Deep teal - trustworthy, financial)
- Secondary: #57C5B6 (Mint accent)
- Background: #F8FAFB
- Surface: #FFFFFF
- Text Primary: #1F2937
- Text Secondary: #6B7280
- Success: #10B981
- Error: #EF4444
- Warning: #F59E0B

## Typography
**Fonts**: System (SF Pro/Roboto)
- Display: Bold, 32pt
- Title: Semibold, 24pt
- Headline: Semibold, 18pt
- Body: Regular, 16pt
- Caption: Regular, 14pt

## Assets to Generate
1. **icon.png** - App icon with GYDS logo - Used: Device home screen
2. **splash-icon.png** - GYDS logo on solid background - Used: App launch
3. **empty-cards.png** - Illustration of credit card outline - Used: Cards screen empty state
4. **empty-transactions.png** - Empty receipt/list illustration - Used: Transactions screen empty state
5. **dual-balance-hero.png** - Visualization showing on-chain/off-chain split - Used: Home screen header
6. **default-avatar.png** - Generic user silhouette - Used: Profile screen default