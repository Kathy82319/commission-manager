// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { ArtistLayout } from './layouts/ArtistLayout';
import { ClientLayout } from './layouts/ClientLayout';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Onboarding } from './pages/auth/Onboarding';

// Artist Pages
import { Queue } from './pages/artist/Queue';
import { Notebook } from './pages/artist/Notebook';
import { Records } from './pages/artist/Records';
import { Settings } from './pages/artist/Settings';
import { Customers } from './pages/artist/Customers'; 
import { CustomerDetail } from './pages/artist/CustomerDetail'; 


// Client Pages
import { ClientForm } from './pages/client/ClientForm'; 
import { ClientOrders } from './pages/client/ClientOrders';
import { ClientSettings } from './pages/client/ClientSettings';
import { ArtistManager } from './pages/client/ArtistManager';

// Public & Common Pages
import { PublicProfile } from './PublicProfile';
import { Home } from './pages/public/Home';
import { Announcements } from './pages/public/Announcements';
import { Guide } from './pages/public/Guide';
import { Feedback } from './pages/public/Feedback';
import { Wishboard } from './pages/public/Wishboard';
import { Workspace } from './pages/Workspace';
import { InquiryWorkspace } from './pages/InquiryWorkspace';
import { Inbox } from './pages/Inbox';
import { Portal } from './pages/Portal';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { RefundPolicy } from './pages/RefundPolicy';

// Admin Pages
import { Dashboard } from './pages/admin/Dashboard';

import { OCCardPage } from './pages/client/OCCardPage';
import { OCSharePage } from './pages/public/OCSharePage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        
        <Route path="/artist" element={<ArtistLayout />}>
          <Route index element={<Navigate to="queue" replace />} />
          <Route path="queue" element={<Queue />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customer/:id" element={<CustomerDetail />} />
          <Route path="notebook" element={<Notebook />} />
          <Route path="records" element={<Records />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="settings" element={<Settings />} />
          
        </Route>

        <Route path="/client" element={<ClientLayout />}>
          <Route path="home" element={<Navigate to="/client/orders" replace />} />
          <Route path="orders" element={<ClientOrders />} />
          <Route path="order/:id" element={<Navigate to="/client/orders" replace />} />
          <Route path="form/:id" element={<ClientForm />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="settings" element={<ClientSettings />} />
          <Route path="favorites" element={<ArtistManager />} />
          <Route path="my-oc" element={<OCCardPage />} />
        </Route>

        <Route path="/quote/:id" element={<ClientForm />} />
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/workspace/:id" element={<Workspace />} />

        <Route element={<PublicLayout />}>
          <Route path="/payment/result" element={<Navigate to="/artist/settings?payment=success" replace />} />
          <Route path="/" element={<Home />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/wishboard" element={<Wishboard />}>
            <Route path=":category" element={<Wishboard />} />
          </Route>
          <Route path="/inquiry/workspace/:id" element={<InquiryWorkspace />} />
          <Route path="/oc/share/:id" element={<OCSharePage />} />
          
          <Route path="/terms" element={<Terms />} />
          <Route path="/portal" element={<Portal />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          
          
        </Route>

          <Route path="/:artistId" element={<PublicProfile />} />
        
        <Route path="/adminbalabababa" element={<Dashboard />} />

        <Route path="*" element={<Navigate to="/" replace />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;