import { Routes, Route } from 'react-router-dom'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import CreatePattern from './pages/CreatePattern'
import CustomizeProduct from './pages/CustomizeProduct'
import Gallery from './pages/Gallery'
import About from './pages/About'
import Platform from './pages/Platform'
import Culture from './pages/Culture'
import Help from './pages/Help'
import Terms from './pages/Terms'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Profile from './pages/Profile'
import MyWorks from './pages/MyWorks'
import MyFavorites from './pages/MyFavorites'
import Cart from './pages/Cart'
import Orders from './pages/Orders'
import OrderConfirm from './pages/OrderConfirm'
import { ScrollToTop } from './components/ScrollToTop'

function App() {
  return (
    <div className="min-h-screen bg-rice-paper relative">
      <ScrollToTop />
      <div className="relative z-10">
        <Header />
        <main className="pt-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreatePattern />} />
            <Route path="/customize" element={<CustomizeProduct />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/gallery/:id" element={<Gallery />} />
            <Route path="/about" element={<About />} />
            <Route path="/platform" element={<Platform />} />
            <Route path="/culture" element={<Culture />} />
            <Route path="/help" element={<Help />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-works" element={<MyWorks />} />
            <Route path="/my-favorites" element={<MyFavorites />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/order-confirm/:id" element={<OrderConfirm />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </div>
  )
}

export default App
