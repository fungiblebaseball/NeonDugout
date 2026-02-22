import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/Navigation";
import Home from "@/pages/Home";
import LineupPage from "@/pages/LineupPage";
import PitchersPage from "@/pages/PitchersPage";
import AttackPage from "@/pages/AttackPage";
import DefensePage from "@/pages/DefensePage";
import SimulationPage from "@/pages/SimulationPage";
import SchedulePage from "@/pages/SchedulePage";
import StandingsPage from "@/pages/StandingsPage";
import PlayerDetailPage from "@/pages/PlayerDetailPage";
import NotFound from "@/pages/not-found";
import { useGameStore } from "@/lib/store";

function Router() {
  const { walletAddress } = useGameStore();

  return (
    <>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/lineup" component={LineupPage} />
        <Route path="/pitchers" component={PitchersPage} />
        <Route path="/attack" component={AttackPage} />
        <Route path="/defense" component={DefensePage} />
        <Route path="/simulate" component={SimulationPage} />
        <Route path="/schedule" component={SchedulePage} />
        <Route path="/standings" component={StandingsPage} />
        <Route path="/player/:id" component={PlayerDetailPage} />
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
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
