import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 引入 Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { ArtistLayout } from './layouts/ArtistLayout';
import { ClientLayout } from './layouts/ClientLayout';

// 引入 Auth
import { Login } from './pages/auth/Login';
import { Onboarding } from './pages/auth/Onboarding';

// 引入繪師端頁面
import { PublicProfile } from './PublicProfile'; // 引入公開主頁元件
import { QuoteBuilder } from './pages/artist/QuoteBuilder';
import { Queue } from './pages/artist/Queue';
import { Notebook } from './pages/artist/Notebook';
import { Records } from './pages/artist/Records';
import { Settings } from './pages/artist/Settings';

// 引入委託人端與共用頁面
import { ClientForm } from './pages/client/ClientForm'; 
import { Workspace } from './pages/Workspace';
import { ClientHome } from './pages/client/ClientHome';
import { ClientOrder } from './pages/client/ClientOrder';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 預設首頁 */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* 身分驗證區 */}
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* 公開頁面路由：將 /u/:id 導向 PublicProfile 元件 */}
        <Route path="/u" element={<PublicLayout />}>
          <Route path=":id" element={<PublicProfile />} />
        </Route>

        {/* 繪師私密後台區 */}
        <Route path="/artist" element={<ArtistLayout />}>
          <Route index element={<Navigate to="queue" replace />} />
          <Route path="quote/new" element={<QuoteBuilder />} />
          <Route path="queue" element={<Queue />} />
          <Route path="notebook" element={<Notebook />} />
          <Route path="records" element={<Records />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* 委託單確認與共用工作區 */}
        <Route path="/quote/:id" element={<ClientForm />} />
        <Route path="/workspace/:id" element={<Workspace />} />

        {/* 委託方後台區 */}
        <Route path="/client" element={<ClientLayout />}>
          <Route index element={<ClientHome />} />
          <Route path="order/:id" element={<ClientOrder />} />
        </Route>

        {/* 預設路由 */}
        <Route path="*" element={<Navigate to="/artist/queue" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;