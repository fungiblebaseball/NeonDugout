import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Player, Team, Lineup, LineupPositions } from './types';
import { generateRandomTeam, generateRandomPlayers } from './mockData';

interface GameState {
  walletAddress: string | null;
  team: Team | null;
  players: Player[];
  lineup: Lineup;
  connectWallet: () => void;
  disconnectWallet: () => void;
  initializeTeam: () => void;
  assignToLineup: (position: LineupPositions, playerId: string | null) => void;
}

const emptyLineup: Lineup = {
  'P': null, 'C': null, '1B': null, '2B': null, '3B': null, 'SS': null, 'LF': null, 'CF': null, 'RF': null
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      walletAddress: null,
      team: null,
      players: [],
      lineup: emptyLineup,

      connectWallet: () => {
        // Mock wallet connection
        const mockAddress = `mock_${Math.random().toString(36).substring(2, 10)}`;
        set({ walletAddress: mockAddress });
        
        // If they don't have a team, initialize one
        if (!get().team) {
          get().initializeTeam();
        }
      },

      disconnectWallet: () => set({ walletAddress: null }),

      initializeTeam: () => {
        const team = generateRandomTeam();
        const players = generateRandomPlayers(20);
        
        // Auto-assign random lineup just for initial preview
        const lineup = { ...emptyLineup };
        const pitchers = players.filter(p => p.positions.includes('P'));
        const fielders = players.filter(p => !p.positions.includes('P'));
        
        if (pitchers.length > 0) lineup['P'] = pitchers[0].id;
        
        const posKeys: LineupPositions[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
        posKeys.forEach((pos, i) => {
          if (fielders[i]) {
            lineup[pos] = fielders[i].id;
          }
        });

        set({ team, players, lineup });
      },

      assignToLineup: (position, playerId) => {
        set(state => ({
          lineup: {
            ...state.lineup,
            [position]: playerId
          }
        }));
      }
    }),
    {
      name: 'fantasy-baseball-storage',
    }
  )
);
