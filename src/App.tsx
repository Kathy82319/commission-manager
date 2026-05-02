// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { ArtistLayout } from './layouts/ArtistLayout';
import { ClientLayout } from './layouts/ClientLayout';
import { AdminLayout } from './layouts/AdminLayout';

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

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 身分驗證路由 */}
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        
        {/* 繪師後台路由 */}
        <Route path="/artist" element={<ArtistLayout />}>
          <Route index element={<Navigate to="queue" replace />} />
          <Route path="queue" element={<Queue />} />
          {/* 🌟 已經移除獨立的 QuoteBuilder 路由，因為它現在作為彈窗運作 */}
          <Route path="customers" element={<Customers />} />
          <Route path="customer/:id" element={<CustomerDetail />} />
          <Route path="notebook" element={<Notebook />} />
          <Route path="records" element={<Records />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* 案主後台路由 */}
        <Route path="/client" element={<ClientLayout />}>
          <Route path="home" element={<Navigate to="/client/orders" replace />} />
          <Route path="orders" element={<ClientOrders />} />
          <Route path="order/:id" element={<Navigate to="/client/orders" replace />} />
          <Route path="form/:id" element={<ClientForm />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="settings" element={<ClientSettings />} />
          <Route path="favorites" element={<ArtistManager />} />
        </Route>

        {/* 洽談與工作區路由 */}
        <Route path="/quote/:id" element={<ClientForm />} />
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/workspace/:id" element={<Workspace />} />

        {/* 公開頁面群組 (套用 PublicLayout) */}
        <Route element={<PublicLayout />}>
          <Route path="/payment/result" element={<Navigate to="/artist/settings?payment=success" replace />} />
          {/* 首頁即為許願池 */}
          <Route path="/" element={<Wishboard />} />
          <Route path="/inquiry/workspace/:id" element={<InquiryWorkspace />} />
          
          <Route path="/terms" element={<Terms />} />
          <Route path="/portal" element={<Portal />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          
          
        </Route>

        {/* 繪師個人首頁 (動態路由) */}
          <Route path="/:artistId" element={<PublicProfile />} />
        
        {/* 管理員後台 (路徑已做簡單遮掩) */}
        <Route path="/adminbalabababa" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
        </Route>

        {/* 萬用路由：找不到頁面時一律回首頁*/}
        <Route path="*" element={<Navigate to="/" replace />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;