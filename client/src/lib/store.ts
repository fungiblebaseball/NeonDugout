import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Player, Team, Lineup, LineupPositions, League } from './types';
import { generateMockLeagues } from './mockData';

interface GameState {
  walletAddress: string | null;
  teamId: string | null;
  league: League | null;
  
  // Local state
  lineup: Lineup;
  
  // Actions
  connectWallet: () => void;
  disconnectWallet: () => void;
  initializeLeague: () => void;
  assignToLineup: (position: LineupPositions, playerId: string | null) => void;
  
  // Selectors/Computed
  getMyTeam: () => Team | null;
  getMyPlayers: () => Player[];
}

const emptyLineup: Lineup = {
  'P': null, 'C': null, '1B': null, '2B': null, '3B': null, 'SS': null, 'LF': null, 'CF': null, 'RF': null
};

// Simple naive hash to associate players with a team for MVP since we flattened the structure
// In reality, players would have a teamId foreign key.
const getPlayersForTeam = (teamId: string, allPlayers: Record<string, Player>): Player[] => {
  // Mock logic: grab 20 deterministic players based on teamId to simulate roster
  const playersArr = Object.values(allPlayers);
  const teamIndex = teamId.charCodeAt(0) % (playersArr.length / 20);
  const startIndex = Math.floor(teamIndex) * 20;
  return playersArr.slice(startIndex, startIndex + 20);
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      walletAddress: null,
      teamId: null,
      league: null,
      lineup: emptyLineup,

      connectWallet: () => {
        const mockAddress = `mock_${Math.random().toString(36).substring(2, 10)}`;
        set({ walletAddress: mockAddress });
        
        const state = get();
        if (!state.league) {
          state.initializeLeague();
        }
        
        // Find an unowned team in Division B and assign it
        const currentLeague = get().league!;
        const divB = currentLeague.divisions['B'];
        const unownedTeam = divB.teams.find(t => t.ownerPubkey === null);
        
        if (unownedTeam) {
          // Update the team to be owned
          const updatedDivB = {
            ...divB,
            teams: divB.teams.map(t => t.id === unownedTeam.id ? { ...t, ownerPubkey: mockAddress } : t)
          };
          
          set({ 
            teamId: unownedTeam.id,
            league: {
              ...currentLeague,
              divisions: {
                ...currentLeague.divisions,
                'B': updatedDivB
              }
            }
          });
          
          // Auto-assign random lineup for preview
          const myPlayers = getPlayersForTeam(unownedTeam.id, currentLeague.players);
          const newLineup = { ...emptyLineup };
          const pitchers = myPlayers.filter(p => p.positions.includes('P'));
          const fielders = myPlayers.filter(p => !p.positions.includes('P'));
          
          if (pitchers.length > 0) newLineup['P'] = pitchers[0].id;
          
          const posKeys: LineupPositions[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
          posKeys.forEach((pos, i) => {
            if (fielders[i]) {
              newLineup[pos] = fielders[i].id;
            }
          });
          
          set({ lineup: newLineup });
        }
      },

      disconnectWallet: () => set({ walletAddress: null, teamId: null }),

      initializeLeague: () => {
        const mockLeague = generateMockLeagues();
        set({ league: mockLeague });
      },

      assignToLineup: (position, playerId) => {
        set(state => ({
          lineup: {
            ...state.lineup,
            [position]: playerId
          }
        }));
      },
      
      getMyTeam: () => {
        const { league, teamId } = get();
        if (!league || !teamId) return null;
        
        for (const div of Object.values(league.divisions)) {
          const team = div.teams.find(t => t.id === teamId);
          if (team) return team;
        }
        return null;
      },
      
      getMyPlayers: () => {
        const { league, teamId } = get();
        if (!league || !teamId) return [];
        return getPlayersForTeam(teamId, league.players);
      }
    }),
    {
      name: 'fantasy-baseball-storage-v2', // v2 to clear out v1 state
    }
  )
);
