SUGGERIMENTO GROSSOLANO SU COME ORGANIZZARE UN ACQUISTO RAPIDAMENTE IK SICUREZZA PROGRAMMANDO UNA TRANSAZIONE VERSO UN INDIRIZZO WALLET DEFINITO.

Lo scopo è di permettere l'acquisto di **token di gioco** (chiamiamoli "crediti team") tramite pagamento in SOL su Solana.

**Obiettivo principale**: nella pagina "/team" (o simile) c'è una sezione che mostra il credito attuale del team (es. "Crediti team: 450"). Aggiungi un bottone "Ricarica crediti" che apre un flusso per comprare token in-game pagando in SOL.

**Flusso corretto e sicuro da implementare esattamente così (client-side transaction building):**

1. **Frontend (React con wallet-adapter):**
   - Usa @solana/wallet-adapter-react (e relativi pacchetti: @solana/wallet-adapter-react-ui, @solana/wallet-adapter-base, @solana/web3.js) per connettere wallet (supporta Phantom, Backpack, Solflare ecc.).
   - Nella pagina /team mostra:
     - Credito attuale del team (per ora valore fisso o da localStorage/mock, poi potrai collegare DB).
     - Bottone "Ricarica crediti".
   - Quando si clicca il bottone:
     - Mostra opzioni semplici (es. pacchetti: 100 crediti → 0.2 SOL | 500 crediti → 0.9 SOL | 1000 crediti → 1.7 SOL).
     - L'utente sceglie un pacchetto → clicca "Paga con Solana".
     - Genera un **orderId** unico (es. UUID corto tipo "abc123").
     - Prepara una transazione Solana **completa ma non firmata**:
       - Instruction: SystemProgram.transfer → invia l'importo esatto in lamports al tuo indirizzo merchant fisso.
       - Instruction: Memo Program → memo = `ricarica:${orderId}-crediti:${quantitaCrediti}` (es. "ricarica:abc123-crediti:500").
       - (opzionale ma consigliato) Aggiungi Compute Budget / priority fee per transazione veloce.
     - Passa la transazione al wallet usando wallet.sendTransaction(tx, connection).
     - Il wallet mostra all'utente chiaramente:
       - Importo SOL da inviare
       - Destinatario = tuo merchant address
       - Memo visibile = "ricarica:abc123-crediti:500"
       - Totale con fee
     - L'utente approva/firma → wallet trasmette → restituisce la signature.
   - Frontend riceve la signature → mostra "Pagamento inviato, verifica in corso..." → invia immediatamente al backend: POST con { signature, orderId, creditiAcquistati, prezzoPagatoLamports }

2. **Backend (Express/Node.js su Replit):**
   - Riceve la richiesta di verifica.
   - Connette a RPC Solana (usa .env per RPC_URL, es. Helius o QuickNode o public mainnet).
   - Usa getParsedTransaction(signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 })
   - Verifica rigorosamente:
     - Transazione esiste ed è confermata.
     - C'è un transfer SOL (System Program) verso esattamente il tuo MERCHANT_ADDRESS (da .env).
     - Importo trasferito ≥ prezzo atteso per quel pacchetto.
     - C'è un'istruzione Memo con testo **esattamente** `ricarica:${orderId}-crediti:${creditiAcquistati}`.
     - Transazione recente (es. blockTime negli ultimi 10 minuti).
   - Se tutti i check passano:
     - Considera pagamento valido.
     - Aggiungi i crediti al team (per ora aggiorna una variabile globale/mock o localStorage simulato; in futuro DB).
     - Restituisce { success: true, nuoviCrediti: ..., message: "Ricarica completata!" }
   - Se fallisce qualsiasi check → restituisci errore chiaro (es. "Memo non valido", "Importo insufficiente", "Transazione non confermata").

**Requisiti generali:**
- .env con: MERCHANT_ADDRESS=... e RPC_URL=...
- CORS abilitato.
- Frontend e backend nello stesso Repl (backend su porta 3000, frontend servito da Vite o static).
- Usa versioni recenti: @solana/web3.js ~1.98.x, wallet-adapter pacchetti aggiornati.
- Codice pulito, con commenti, error handling decente.
- Per ora non serve DB reale: usa stato in memoria o localStorage per simulare il credito team.
- Aggiungi un bottone "Connetti Wallet" in alto se non connesso.
- Dopo verifica riuscita, aggiorna la UI mostrando i nuovi crediti (usa polling o setInterval leggero per refresh credito).

Implementa **tutto** questo flusso end-to-end in Replit: frontend con bottone ricarica nella pagina team + backend verifica pagamenti SOL con memo.

---