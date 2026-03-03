import { Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

interface VerifyResult {
  valid: boolean;
  error?: string;
  payer?: string;
}

export async function verifySolanaPayment(
  signature: string,
  expectedLamports: bigint,
  expectedMemo: string,
  merchantAddress: string,
  expectedPayer?: string
): Promise<VerifyResult> {
  try {
    const tx = await connection.getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) return { valid: false, error: "Transaction not found or not confirmed" };
    if (tx.meta?.err) return { valid: false, error: "Transaction failed on-chain" };

    const blockTime = tx.blockTime;
    if (!blockTime) return { valid: false, error: "Transaction has no block time" };
    const ageSeconds = Math.floor(Date.now() / 1000) - blockTime;
    if (ageSeconds > 300) return { valid: false, error: "Transaction too old (>5 minutes)" };

    const feePayer = tx.transaction.message.accountKeys[0]?.pubkey?.toString();

    if (expectedPayer && feePayer !== expectedPayer) {
      return { valid: false, error: "Transaction payer does not match expected wallet" };
    }

    let transferFound = false;
    let transferSource: string | null = null;
    const instructions = tx.transaction.message.instructions;
    for (const ix of instructions) {
      if ("parsed" in ix && ix.program === "system" && ix.parsed?.type === "transfer") {
        const info = ix.parsed.info;
        if (
          info.destination === merchantAddress &&
          BigInt(info.lamports) >= expectedLamports
        ) {
          transferFound = true;
          transferSource = info.source;
          break;
        }
      }
    }
    if (!transferFound) {
      const innerInstructions = tx.meta?.innerInstructions || [];
      for (const inner of innerInstructions) {
        for (const ix of inner.instructions) {
          if ("parsed" in ix && ix.program === "system" && ix.parsed?.type === "transfer") {
            const info = ix.parsed.info;
            if (
              info.destination === merchantAddress &&
              BigInt(info.lamports) >= expectedLamports
            ) {
              transferFound = true;
              transferSource = info.source;
              break;
            }
          }
        }
        if (transferFound) break;
      }
    }
    if (!transferFound) return { valid: false, error: "No valid SOL transfer to merchant found" };

    if (expectedPayer && transferSource && transferSource !== expectedPayer) {
      return { valid: false, error: "SOL transfer source does not match expected wallet" };
    }

    let memoFound = false;
    const MEMO_PROGRAMS = [
      "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
      "Memo1UhkJBfCR6MNB5t2yMHSjxpniGAiesrDzGcczFg",
    ];

    for (const ix of instructions) {
      let isMemo = false;
      if ("program" in ix && ix.program === "spl-memo") isMemo = true;
      if ("programId" in ix && MEMO_PROGRAMS.includes(ix.programId.toString())) isMemo = true;

      if (isMemo) {
        if ("parsed" in ix && typeof ix.parsed === "string" && ix.parsed === expectedMemo) {
          memoFound = true;
          break;
        }
        if ("data" in ix && typeof ix.data === "string") {
          try {
            const decoded = Buffer.from(bs58.decode(ix.data)).toString("utf-8");
            if (decoded === expectedMemo) {
              memoFound = true;
              break;
            }
          } catch {}
          try {
            const decoded = Buffer.from(ix.data, "base64").toString("utf-8");
            if (decoded === expectedMemo) {
              memoFound = true;
              break;
            }
          } catch {}
        }
      }
    }
    if (!memoFound) return { valid: false, error: "Memo not found or does not match" };

    return { valid: true, payer: feePayer };
  } catch (err: any) {
    return { valid: false, error: `Verification error: ${err.message}` };
  }
}
