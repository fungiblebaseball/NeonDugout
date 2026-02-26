import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/Navigation";
import WalletProvider from "@/components/WalletProvider";
import Home from "@/pages/Home";
import LoginPage from "@/pages/LoginPage";
import LineupPage from "@/pages/LineupPage";
import PitchersPage from "@/pages/PitchersPage";
import AttackPage from "@/pages/AttackPage";
import DefensePage from "@/pages/DefensePage";
import SimulationPage from "@/pages/SimulationPage";
import SchedulePage from "@/pages/SchedulePage";
import StandingsPage from "@/pages/StandingsPage";
import PlayerDetailPage from "@/pages/PlayerDetailPage";
import MatchDetailPage from "@/pages/MatchDetailPage";
import PlayLogPage from "@/pages/PlayLogPage";
import TrainingPage from "@/pages/TrainingPage";
import EyeDrillGame from "@/pages/minigames/EyeDrillGame";
import BattingPracticeGame from "@/pages/minigames/BattingPracticeGame";
import PitchControlGame from "@/pages/minigames/PitchControlGame";
import AdminPage from "@/pages/AdminPage";
import NotFound from "@/pages/not-found";
import { useGameStore } from "@/lib/store";
import { useEffect } from "react";

function Router() {
  const { walletAddress, restoreSession } = useGameStore();

  useEffect(() => {
    if (!walletAddress) {
      restoreSession();
    }
  }, []);

  return (
    <>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/" component={Home} />
        <Route path="/lineup" component={LineupPage} />
        <Route path="/pitchers" component={PitchersPage} />
        <Route path="/attack" component={AttackPage} />
        <Route path="/defense" component={DefensePage} />
        <Route path="/simulate" component={SimulationPage} />
        <Route path="/schedule" component={SchedulePage} />
        <Route path="/standings" component={StandingsPage} />
        <Route path="/player/:id" component={PlayerDetailPage} />
        <Route path="/match/:id" component={MatchDetailPage} />
        <Route path="/play-log" component={PlayLogPage} />
        <Route path="/training" component={TrainingPage} />
        <Route path="/training/eye-drill" component={EyeDrillGame} />
        <Route path="/training/batting" component={BattingPracticeGame} />
        <Route path="/training/pitch-control" component={PitchControlGame} />
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
      {walletAddress && <Navigation />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WalletProvider>
          <Toaster />
          <Router />
        </WalletProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
