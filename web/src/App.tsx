import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';

import { CommandCenter } from './pages/CommandCenter';
import { Alerts } from './pages/Alerts';
import { Workspace } from './pages/Workspace';
import { FreezeTracker } from './pages/FreezeTracker';
import { Cases } from './pages/Cases';
import { HeistReplay } from './pages/HeistReplay';
import { RulesLab } from './pages/RulesLab';
import { Performance } from './pages/Performance';
import { Audit } from './pages/Audit';
import { Upload } from './pages/Upload';
import { DataHub } from './pages/DataHub';
import { PatternsGuide } from './pages/PatternsGuide';
import { Landing } from './pages/Landing';
import { MobileOnCall } from './pages/MobileOnCall';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/welcome" element={<Landing />} />
      <Route path="/m/alert/:ringId" element={<MobileOnCall />} />

      {/* Main Application Shell Routes */}
      <Route element={<AppShell />}>
        <Route path="/" element={<CommandCenter />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/workspace/:accountId" element={<Workspace />} />
        <Route path="/freezes" element={<FreezeTracker />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/:ringId" element={<Cases />} />
        <Route path="/replay" element={<HeistReplay />} />
        <Route path="/replay/:ringId" element={<HeistReplay />} />
        <Route path="/rules" element={<RulesLab />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/data" element={<DataHub />} />
        <Route path="/upload" element={<DataHub />} />
        <Route path="/patterns" element={<PatternsGuide />} />
      </Route>

      {/* Fallback to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
