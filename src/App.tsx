import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { PublicLayout } from './layouts/PublicLayout';
import { ArtistLayout } from './layouts/ArtistLayout';
import { ClientLayout } from './layouts/ClientLayout';

import { Login } from './pages/auth/Login';
import { Onboarding } from './pages/auth/Onboarding';

import { PublicProfile } from './PublicProfile';
import { QuoteBuilder } from './pages/artist/QuoteBuilder';
import { Queue } from './pages/artist/Queue';
import { Notebook } from './pages/artist/Notebook';
import { Records } from './pages/artist/Records';
import { Settings } from './pages/artist/Settings';
import { Customers } from './pages/artist/Customers'; 
import { CustomerDetail } from './pages/artist/CustomerDetail'; 

import { ClientForm } from './pages/client/ClientForm'; 
import { ClientOrders } from './pages/client/ClientOrders';

import { Workspace } from './pages/Workspace';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { Portal } from './pages/Portal';

import { AdminLayout } from './layouts/AdminLayout';
import { Dashboard } from './pages/admin/Dashboard';
import { RefundPolicy } from './pages/RefundPolicy';

import { Wishboard } from './pages/public/Wishboard';
import { Inbox } from './pages/Inbox';

export function App() {
  // 原本的 MY_ARTIST_ID 如果後續沒有其他地方需要用到，可以直接刪除
  // const MY_ARTIST_ID = "User_84448"; 
  
  return (
    <BrowserRouter>
      <Routes>
        
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        
        <Route path="/artist" element={<ArtistLayout />}>
          <Route index element={<Navigate to="queue" replace />} />
          <Route path="queue" element={<Queue />} />
          <Route path="quote/new" element={<QuoteBuilder />} />
          
          <Route path="customers" element={<Customers />} />
          <Route path="customer/:id" element={<CustomerDetail />} />
          
          <Route path="notebook" element={<Notebook />} />
          <Route path="records" element={<Records />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="/client" element={<ClientLayout />}>

          <Route path="home" element={<Navigate to="/client/orders" replace />} />
          <Route path="orders" element={<ClientOrders />} />
          <Route path="order/:id" element={<Navigate to="/client/orders" replace />} />
          <Route path="form/:id" element={<ClientForm />} />
          <Route path="inbox" element={<Inbox />} />
        </Route>

        <Route path="/quote/:id" element={<ClientForm />} />
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/workspace/:id" element={<Workspace />} />

        {/* 公開頁面群組 */}
        <Route element={<PublicLayout />}>
          {/* 將許願池設定為真正的首頁 */}
          <Route path="/" element={<Wishboard />} />
          
          <Route path="/terms" element={<Terms />} />
          <Route path="/portal" element={<Portal />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          
          {/* 繪師個人頁路由放在靜態路由之下，避免覆蓋前面的路徑 */}
          <Route path="/:artistId" element={<PublicProfile />} />
        </Route>
        
        <Route path="/adminbalabababa" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;