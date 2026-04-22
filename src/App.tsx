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
import { Customers } from './pages/artist/Customers'; // 🌟 確保導入
import { CustomerDetail } from './pages/artist/CustomerDetail'; // 🌟 確保導入

import { ClientForm } from './pages/client/ClientForm'; 
import { ClientOrders } from './pages/client/ClientOrders';

import { Workspace } from './pages/Workspace';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { Portal } from './pages/Portal';

import { AdminLayout } from './layouts/AdminLayout';
import { Dashboard } from './pages/admin/Dashboard';
import { RefundPolicy } from './pages/RefundPolicy';

export function App() {
  const MY_ARTIST_ID = "User_84448";
  
  return (
    <BrowserRouter>
      {/* 🌟 所有的 <Route> 必須在 <Routes> 裡面 */}
      <Routes>
        {/* 1. 首頁導向 */}
        <Route path="/" element={<Navigate to={`/${MY_ARTIST_ID}`} replace />} />
        
        {/* 2. 身分驗證區 */}
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        
        {/* 3. 繪師私密後台區 */}
        <Route path="/artist" element={<ArtistLayout />}>
          <Route index element={<Navigate to="queue" replace />} />
          <Route path="queue" element={<Queue />} />
          <Route path="quote/new" element={<QuoteBuilder />} />
          
          {/* 🌟 這裡：正確嵌套在 ArtistLayout 的 Routes 之下 */}
          <Route path="customers" element={<Customers />} />
          <Route path="customer/:id" element={<CustomerDetail />} />
          
          <Route path="notebook" element={<Notebook />} />
          <Route path="records" element={<Records />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* 4. 委託方後台區 */}
        <Route path="/client" element={<ClientLayout />}>
          <Route path="home" element={<Navigate to="/client/orders" replace />} />
          <Route path="orders" element={<ClientOrders />} />
          <Route path="order/:id" element={<Navigate to="/client/orders" replace />} />
          <Route path="form/:id" element={<ClientForm />} />
        </Route>

        {/* 5. 委託單確認與共用工作區 */}
        <Route path="/quote/:id" element={<ClientForm />} />
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/workspace/:id" element={<Workspace />} />

        {/* 6. 公開頁面 */}
        <Route element={<PublicLayout />}>
          <Route path="/terms" element={<Terms />} />
          <Route path="/portal" element={<Portal />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/:artistId" element={<PublicProfile />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
        </Route>
        
        {/* 管理員後台 */}
        <Route path="/adminbalabababa" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
        </Route>

        {/* 🌟 捕獲未定義路徑，防止出現空白頁 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;