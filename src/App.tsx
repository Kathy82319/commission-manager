import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 引入 Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { ArtistLayout } from './layouts/ArtistLayout';
import { ClientLayout } from './layouts/ClientLayout';

// 引入 Auth
import { Login } from './pages/auth/Login';
import { Onboarding } from './pages/auth/Onboarding';

// 引入繪師端頁面
import { ArtistHome } from './pages/artist/ArtistHome';
import { QuoteBuilder } from './pages/artist/QuoteBuilder';
import { Queue } from './pages/artist/Queue';
import { Notebook } from './pages/artist/Notebook';

// 引入委託人端與共用頁面
import { ClientForm } from './pages/client/ClientForm'; 
import { Workspace } from './pages/Workspace';
import { ClientHome } from './pages/client/ClientHome';
import { ClientOrder } from './pages/client/ClientOrder';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 預設首頁 */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* 身分驗證區 */}
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* 公開名片區 */}
        <Route path="/u/:artistId" element={<PublicLayout />}>
          <Route index element={<ArtistHome />} />
        </Route>

        {/* 繪師私密後台區 */}
        <Route path="/artist" element={<ArtistLayout />}>
          <Route index element={<Navigate to="queue" replace />} />
          <Route path="quote/new" element={<QuoteBuilder />} />
          <Route path="queue" element={<Queue />} />
          <Route path="notebook" element={<Notebook />} />
        </Route>

        {/* 委託單確認與共用工作區 */}
        <Route path="/quote/:id" element={<ClientForm />} />
        <Route path="/workspace/:id" element={<Workspace />} />

        {/* 委託方後台區 (已更新為真實頁面) */}
        <Route path="/client" element={<ClientLayout />}>
          <Route index element={<ClientHome />} />
          <Route path="order/:id" element={<ClientOrder />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;