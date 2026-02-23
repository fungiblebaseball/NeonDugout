import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PlayerData {
  id: number;
  name: string;
  teamId: number;
  positions: string[];
  pow: number;
  con: number;
  spd: number;
  eye: number;
  vel: number;
  ctl: number;
  mov: number;
  sta: number;
  def: number;
}

interface TeamData {
  id: number;
  name: string;
  primaryColor: string;
  league: string;
  series: string;
  division: string;
  ownerWallet: string | null;
  seasonId: number;
}

interface UserData {
  id: number;
  walletAddress: string;
  teamId: number | null;
}

interface GameState {
  walletAddress: string | null;
  token: string | null;
  user: UserData | null;
  team: TeamData | null;
  players: PlayerData[];
  loading: boolean;

  loginWithSignature: (walletAddress: string, signature: string, message: string) => Promise<{ success: boolean; error?: string }>;
  restoreSession: () => Promise<boolean>;
  disconnectWallet: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      walletAddress: null,
      token: null,
      user: null,
      team: null,
      players: [],
      loading: false,

      loginWithSignature: async (walletAddress: string, signature: string, message: string) => {
        set({ loading: true });

        try {
          const res = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress, signature, message }),
          });

          if (!res.ok) {
            const err = await res.json();
            set({ loading: false });
            return { success: false, error: err.message || 'Verification failed' };
          }

          const data = await res.json();

          set({
            walletAddress,
            token: data.token,
            user: data.user,
            team: data.team,
            players: data.players || [],
            loading: false,
          });

          return { success: true };
        } catch (err: any) {
          console.error('Login failed:', err);
          set({ loading: false });
          return { success: false, error: err?.message || 'Network error' };
        }
      },

      restoreSession: async () => {
        const { token } = get();
        if (!token) return false;

        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (!res.ok) {
            set({ walletAddress: null, token: null, user: null, team: null, players: [] });
            return false;
          }

          const data = await res.json();
          set({
            walletAddress: data.user.walletAddress,
            user: data.user,
            team: data.team,
            players: data.players || [],
          });
          return true;
        } catch {
          set({ walletAddress: null, token: null, user: null, team: null, players: [] });
          return false;
        }
      },

      disconnectWallet: () => set({
        walletAddress: null,
        token: null,
        user: null,
        team: null,
        players: [],
      }),
    }),
    {
      name: 'gridiron-ghosts-v5',
      partialize: (state) => ({
        walletAddress: state.walletAddress,
        token: state.token,
        user: state.user,
        team: state.team,
      }),
    }
  )
);
