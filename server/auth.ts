import jwt from "jsonwebtoken";
import nacl from "tweetnacl";
import { v4 as uuidv4 } from "uuid";

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production"
  ? (() => { throw new Error("JWT_SECRET must be set in production"); })()
  : "neon-dugout-dev-secret-change-in-production") as string;
const TOKEN_EXPIRY = "7d";

const challengeStore = new Map<string, { nonce: string; createdAt: number }>();
const CHALLENGE_TTL = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  challengeStore.forEach((val, key) => {
    if (now - val.createdAt > CHALLENGE_TTL) {
      challengeStore.delete(key);
    }
  });
}, 60 * 1000);

export function generateChallenge(walletAddress: string): { message: string; nonce: string } {
  const nonce = uuidv4();
  const message = `Sign this message to login to Neon Dugout: ${nonce}`;
  challengeStore.set(walletAddress, { nonce, createdAt: Date.now() });
  return { message, nonce };
}

export function verifySignature(walletAddress: string, signature: string, message: string): boolean {
  const stored = challengeStore.get(walletAddress);
  if (!stored) return false;

  const now = Date.now();
  if (now - stored.createdAt > CHALLENGE_TTL) {
    challengeStore.delete(walletAddress);
    return false;
  }

  if (!message.includes(stored.nonce)) return false;

  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = Buffer.from(signature, "base64");
    const publicKeyBytes = decodeBase58(walletAddress);

    const valid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

    if (valid) {
      challengeStore.delete(walletAddress);
    }

    return valid;
  } catch (err) {
    console.error("Signature verification failed:", err);
    return false;
  }
}

export function createToken(userId: number, walletAddress: string): string {
  return jwt.sign({ userId, walletAddress }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): { userId: number; walletAddress: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; walletAddress: string };
    return decoded;
  } catch {
    return null;
  }
}

const claimChallengeStore = new Map<string, { nonce: string; createdAt: number }>();

setInterval(() => {
  const now = Date.now();
  claimChallengeStore.forEach((val, key) => {
    if (now - val.createdAt > CHALLENGE_TTL) {
      claimChallengeStore.delete(key);
    }
  });
}, 60 * 1000);

export function generateClaimChallenge(walletAddress: string): { message: string; nonce: string } {
  const nonce = uuidv4();
  const message = `Claim tokens in Neon Dugout: ${nonce}`;
  claimChallengeStore.set(walletAddress, { nonce, createdAt: Date.now() });
  return { message, nonce };
}

export function verifyClaimSignature(walletAddress: string, signature: string, message: string): boolean {
  const stored = claimChallengeStore.get(walletAddress);
  if (!stored) return false;

  const now = Date.now();
  if (now - stored.createdAt > CHALLENGE_TTL) {
    claimChallengeStore.delete(walletAddress);
    return false;
  }

  if (!message.includes(stored.nonce)) return false;

  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = Buffer.from(signature, "base64");
    const publicKeyBytes = decodeBase58(walletAddress);

    const valid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

    if (valid) {
      claimChallengeStore.delete(walletAddress);
    }

    return valid;
  } catch (err) {
    console.error("Claim signature verification failed:", err);
    return false;
  }
}

function decodeBase58(str: string): Uint8Array {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const bytes: number[] = [0];
  for (const char of str) {
    const idx = ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base58 character: ${char}`);
    let carry = idx;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const char of str) {
    if (char !== "1") break;
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}
