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
  user: UserData | null;
  team: TeamData | null;
  players: PlayerData[];
  loading: boolean;

  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      walletAddress: null,
      user: null,
      team: null,
      players: [],
      loading: false,

      connectWallet: async () => {
        set({ loading: true });
        const mockAddress = `mock_${Math.random().toString(36).substring(2, 10)}`;

        try {
          const res = await fetch('/api/auth/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress: mockAddress }),
          });
          const data = await res.json();

          set({
            walletAddress: mockAddress,
            user: data.user,
            team: data.team,
            players: data.players || [],
            loading: false,
          });
        } catch (err) {
          console.error('Connect failed:', err);
          set({ loading: false });
        }
      },

      disconnectWallet: () => set({
        walletAddress: null,
        user: null,
        team: null,
        players: [],
      }),
    }),
    {
      name: 'gridiron-ghosts-v3',
    }
  )
);
