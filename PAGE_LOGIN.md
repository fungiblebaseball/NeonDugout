# PAGE_LOGIN - Wallet Authentication

## Route
`/login`

## Purpose
Authenticate users via Solana wallet signature. Users connect their preferred wallet, sign a challenge message, and the backend verifies the ed25519 signature to create/resume a session.

## Supported Wallets
1. **Phantom** - Most popular Solana wallet (desktop + mobile)
2. **Solflare** - Full-featured Solana wallet with staking
3. **Backpack** - xNFT-native wallet by Coral/Anchor
4. **Seeker** - Solana Mobile native wallet (primary target device)

Wallets implementing the Solana Wallet Standard are auto-detected by `@solana/wallet-adapter-react`.

## Authentication Flow

### 1. Connect Wallet
- User taps a wallet button (or "Select Wallet" modal)
- Wallet extension/app prompts connection approval
- On success: `publicKey` is available in the app

### 2. Request Challenge
- Frontend sends `POST /api/auth/challenge` with `{ walletAddress: publicKey.toBase58() }`
- Backend generates a unique nonce (UUID v4) and stores it temporarily (5-minute TTL)
- Returns `{ message: "Sign this message to login to Gridiron Ghosts: <nonce>" }`

### 3. Sign Message
- Frontend encodes the challenge message as `Uint8Array`
- Calls `wallet.signMessage(encodedMessage)`
- Wallet prompts user to approve the signature
- Returns `signature: Uint8Array`

### 4. Verify & Authenticate
- Frontend sends `POST /api/auth/verify` with:
  ```json
  {
    "walletAddress": "base58-public-key",
    "signature": "base64-encoded-signature",
    "message": "original-challenge-message"
  }
  ```
- Backend verifies:
  1. The nonce exists and hasn't expired
  2. The ed25519 signature is valid for the message + publicKey
  3. Consumes the nonce (one-time use)
- On success:
  - Creates user record if first login (wallet_address → new user)
  - Assigns an unowned team to the user
  - If no unowned teams exist → triggers Dynamic League Expansion
  - Returns `{ user, team }` with session token

### 5. Session Management
- JWT token stored in localStorage
- Token included in `Authorization: Bearer <token>` header for API calls
- Token expiry: 7 days
- On expiry or invalid token → redirect to /login

## UI Layout

### Mobile-First Design (Solana Seeker optimized)
```
┌──────────────────────────────┐
│                              │
│     ⚾ GRIDIRON GHOSTS      │
│     [glitch effect logo]     │
│                              │
│   "Connect your wallet to    │
│    enter the league"         │
│                              │
│  ┌──────────────────────┐    │
│  │  👻 Phantom          │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │  🌟 Solflare         │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │  🎒 Backpack         │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │  📱 Seeker           │    │
│  └──────────────────────┘    │
│                              │
│   [Signing status overlay]   │
│   "Waiting for signature..." │
│                              │
└──────────────────────────────┘
```

### Visual Style
- Background: dark gradient (#0a0a1a → #1a0a2e) with subtle grid lines
- Wallet buttons: neon-bordered cards with hover glow effects
- Logo: "GRIDIRON GHOSTS" in Orbitron font with cyan/pink neon glow
- Status messages: VT323 font, green for success, red for errors
- Loading: pulsing neon animation during signature wait

### States
1. **Disconnected** - Show wallet selection buttons
2. **Connecting** - Pulse animation on selected wallet button
3. **Connected, Awaiting Signature** - Show "Sign to verify" prompt with wallet address
4. **Signing** - "Waiting for wallet approval..." overlay
5. **Verified** - "Welcome, Commander!" → redirect to Home (/)
6. **Error** - Red neon error message with retry button

## Data Test IDs
- `login-title` - Main heading
- `btn-wallet-phantom` - Phantom wallet button
- `btn-wallet-solflare` - Solflare wallet button
- `btn-wallet-backpack` - Backpack wallet button
- `btn-wallet-seeker` - Seeker wallet button
- `btn-sign-message` - Sign challenge button (after connect)
- `text-wallet-address` - Connected wallet address display
- `text-login-status` - Status message area
- `text-login-error` - Error message display

## API Endpoints

### POST /api/auth/challenge
**Request:** `{ walletAddress: string }`
**Response:** `{ message: string, nonce: string }`

### POST /api/auth/verify
**Request:** `{ walletAddress: string, signature: string, message: string }`
**Response:** `{ token: string, user: User, team: Team }`

## Error Handling
- Wallet not installed → "Please install [wallet name] to continue"
- User rejects connection → "Connection cancelled. Try again."
- User rejects signature → "Signature cancelled. Try again."
- Invalid signature → "Verification failed. Please try again."
- Network error → "Network error. Check your connection."
- No teams available → Triggers dynamic league expansion, then retries assignment

## Dynamic League Expansion Trigger
When a new user verifies and no unowned teams exist:
1. Backend counts existing leagues (L1, L2, ...)
2. Creates next league (L3, L4, etc.) with SerieA + SerieB (20 teams)
3. Generates 400 players (20 per team)
4. Creates 14-day match schedule (228 matches)
5. Assigns first available team from new league to user
6. Returns normally with the assigned team
