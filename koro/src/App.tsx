import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { DropPage } from './pages/DropPage'
import { ExplorePage } from './pages/ExplorePage'
import { FeedPage } from './pages/FeedPage'
import {
  CreatePage,
  InboxPage,
  NotificationsPage,
  ProfilePage,
  ReelsPage,
  SavedPage,
  SearchPage,
  StoryPage,
  ThreadPage,
} from './pages/RestPages'

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<FeedPage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="reels" element={<ReelsPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="inbox/:id" element={<ThreadPage />} />
        <Route path="saved" element={<SavedPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="new" element={<CreatePage />} />
        <Route path="u/:handle" element={<ProfilePage />} />
        <Route path="p/:id" element={<DropPage />} />
        <Route path="stories/:id" element={<StoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
