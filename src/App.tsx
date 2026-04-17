// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 引入 Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { ArtistLayout } from './layouts/ArtistLayout';
import { ClientLayout } from './layouts/ClientLayout';

// 引入 Auth
import { Login } from './pages/auth/Login';
import { Onboarding } from './pages/auth/Onboarding';

// 引入繪師端頁面
import { PublicProfile } from './PublicProfile';
import { QuoteBuilder } from './pages/artist/QuoteBuilder';
import { Queue } from './pages/artist/Queue';
import { Notebook } from './pages/artist/Notebook';
import { Records } from './pages/artist/Records';
import { Settings } from './pages/artist/Settings';

// 引入委託人端頁面
import { ClientForm } from './pages/client/ClientForm'; 
import { ClientOrders } from './pages/client/ClientOrders';
 

// 引入共用頁面
import { Workspace } from './pages/Workspace';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { Portal } from './pages/Portal';


import { AdminLayout } from './layouts/AdminLayout';
import { Dashboard } from './pages/admin/Dashboard';

export function App() {
  const MY_ARTIST_ID = "@User_88736";
  
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. 首頁直接導向您的個人繪師頁面 */}
        <Route path="/" element={<Navigate to={`/${MY_ARTIST_ID}`} replace />} />
        
        {/* 2. 身分驗證區 */}
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        
        {/* 3. 繪師私密後台區 */}
        <Route path="/artist" element={<ArtistLayout />}>
          <Route index element={<Navigate to="queue" replace />} />
          <Route path="queue" element={<Queue />} />
          <Route path="quote/new" element={<QuoteBuilder />} />
          <Route path="notebook" element={<Notebook />} />
          <Route path="records" element={<Records />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* 4. 委託方後台區 */}
        <Route path="/client" element={<ClientLayout />}>
          {/* 🌟 將 home 直接導向新的融合版頁面 */}
          <Route path="home" element={<Navigate to="/client/orders" replace />} />
          <Route path="orders" element={<ClientOrders />} />
          {/* 🌟 舊的 order/:id 已經融合進 orders，可以直接移除或也做重導向 */}
          <Route path="order/:id" element={<Navigate to="/client/orders" replace />} />
          <Route path="form/:id" element={<ClientForm />} />
        </Route>

        {/* 5. 委託單確認與共用工作區 */}
        <Route path="/quote/:id" element={<ClientForm />} />
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/workspace/:id" element={<Workspace />} />

        {/* 6. 公開頁面 (套用 PublicLayout) - 必須放最後面，因為 /:artistId 會攔截所有東西 */}
        <Route element={<PublicLayout />}>
          <Route path="/terms" element={<Terms />} />
          <Route path="/portal" element={<Portal />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/:artistId" element={<PublicProfile />} />
        </Route>
        
        {/* === 新增：管理員後台區 === */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
        </Route>


      </Routes>
    </BrowserRouter>
  );
}

export default App;