import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute, AdminRoute } from './components/RouteGuards';
import { AppShell } from './components/layout/AppShell';
import { PublicLayout } from './components/layout/PublicLayout';

// Public
import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import InfoPage from './pages/public/InfoPage';
import ContactsPage from './pages/public/ContactsPage';
import NotFound from './pages/NotFound';

// User
import UserDashboard from './pages/user/UserDashboard';
import ChatPage from './pages/user/ChatPage';
import HistoryPage from './pages/user/HistoryPage';
import ConversationDetail from './pages/user/ConversationDetail';
import ProfilePage from './pages/user/ProfilePage';
import DocumentsPage from './pages/user/DocumentsPage';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminFaqList from './pages/admin/AdminFaqList';
import AdminFaqForm from './pages/admin/AdminFaqForm';
import AdminCategories from './pages/admin/AdminCategories';
import AdminDocuments from './pages/admin/AdminDocuments';
import AdminUnits from './pages/admin/AdminUnits';
import AdminFeedback from './pages/admin/AdminFeedback';
import AdminStats from './pages/admin/AdminStats';
import AdminLogs from './pages/admin/AdminLogs';
import AdminUsers from './pages/admin/AdminUsers';

export default function App() {
  return (
    <Routes>
      {/* Public site */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/info" element={<InfoPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
      </Route>
      <Route path="/login" element={<Login />} />

      {/* Authenticated user area */}
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell variant="user" />}>
          <Route index element={<UserDashboard />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="chat/:conversationId" element={<ChatPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="history/:conversationId" element={<ConversationDetail />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="info" element={<InfoPage embedded />} />
          <Route path="contacts" element={<ContactsPage embedded />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Admin area */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AppShell variant="admin" />}>
          <Route index element={<AdminDashboard />} />
          <Route path="faqs" element={<AdminFaqList />} />
          <Route path="faqs/new" element={<AdminFaqForm />} />
          <Route path="faqs/:id" element={<AdminFaqForm />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="documents" element={<AdminDocuments />} />
          <Route path="units" element={<AdminUnits />} />
          <Route path="feedback" element={<AdminFeedback />} />
          <Route path="stats" element={<AdminStats />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="logs" element={<AdminLogs />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
