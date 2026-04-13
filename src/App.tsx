// src/App.tsx
import { useEffect } from 'react';
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
import { ClientHome } from './pages/client/ClientHome';
import { ClientProfileEdit } from './pages/client/ClientProfileEdit'; 
import { ClientOrderList } from './pages/client/ClientOrderList'; 
import { ClientOrderDetail } from './pages/client/ClientOrderDetail';
import { ClientForm } from './pages/client/ClientForm'; 

// 引入共用頁面
import { Workspace } from './pages/Workspace';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';

// 🌟 全局身分同步器：只要網址有帶 ?u=，不管在哪個頁面都立刻存下來！
function GlobalAuthSync() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const uParam = urlParams.get('u');
    
    if (uParam) {
      localStorage.setItem('user_id', uParam);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return null;
}


export function App() {
  const MY_ARTIST_ID = "User_48676";
  
  return (
    <BrowserRouter>
      {/* 🌟 放置隱形的全局身分同步器 */}
      <GlobalAuthSync />
      
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
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<ClientHome />} /> 
          <Route path="profile/edit" element={<ClientProfileEdit />} />
          <Route path="orders" element={<ClientOrderList />} />
          <Route path="order/:id" element={<ClientOrderDetail />} />
        </Route>

        {/* 5. 委託單確認與共用工作區 */}
        <Route path="/quote/:id" element={<ClientForm />} />
        <Route path="/workspace" element={<Workspace />} />
        <Route path="/workspace/:id" element={<Workspace />} />

        {/* 6. 公開頁面 (套用 PublicLayout) - 必須放最後面，因為 /:artistId 會攔截所有東西 */}
        <Route element={<PublicLayout />}>
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/:artistId" element={<PublicProfile />} />
        </Route>
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;