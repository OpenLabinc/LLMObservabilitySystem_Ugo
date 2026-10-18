import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { SearchPage } from './pages/SearchPage'
import { ListingPage } from './pages/ListingPage'
import { BookingPage } from './pages/BookingPage'
import { WishlistPage } from './pages/WishlistPage'
import { HostPage } from './pages/HostPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/s/homes" element={<SearchPage />} />
        <Route path="/rooms/:slug" element={<ListingPage />} />
        <Route path="/book/:slug" element={<BookingPage />} />
        <Route path="/wishlists" element={<WishlistPage />} />
        <Route path="/hosts/:id" element={<HostPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
