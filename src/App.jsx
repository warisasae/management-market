// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Checkout from "./pages/Checkout";
import Login from "./pages/login";
import Stocks from "./pages/Stocks";
import Categories from "./pages/categories";      // 👈 สะกดตัวใหญ่ให้ตรงไฟล์จริง
import SalesHistory from "./pages/SalesHistory";
import SaleDetail from "./pages/SaleDetail";
import ProductsList from "./pages/ProductsList";
import ProductForm from "./pages/ProductForm";
import ProductDetail from "./pages/ProductDetail";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import UserForm from "./pages/UserForm";
import Settings from "./pages/Settings";
import { ProtectedRoute, AdminOnly } from "./components/route-guards"; // 👈 เพิ่มการคุ้มกัน

function App() {
  return (
    <Router>
      <Routes>
        {/* หน้า Login */}
        <Route path="/" element={<Login />} />

        {/* กลุ่มหน้า Dashboard (ต้องล็อกอินก่อน) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="pos" element={<POS />} />
          <Route path="pos/checkout" element={<Checkout />} />
          <Route path="stocks" element={<Stocks />} />
          <Route path="categories" element={<Categories />} />
          <Route path="saleshistory" element={<SalesHistory />} />
          <Route path="saleshistory/:id" element={<SaleDetail />} />
          <Route path="products" element={<ProductsList />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="reports" element={<Reports />} />
          <Route path="/dashboard/profile/edit" element={<UserForm mode="self-edit" />} />

          {/* เฉพาะแอดมิน */}
          <Route
            path="users"
            element={
              <AdminOnly>
                <Users />
              </AdminOnly>
            }
          />
          <Route
            path="users/new"
            element={
              <AdminOnly>
                <UserForm mode="create" />
              </AdminOnly>
            }
          />
          <Route
            path="users/:id/edit"
            element={
              <AdminOnly>
                <UserForm mode="edit" />
              </AdminOnly>
            }
          />
          <Route
            path="settings"
            element={
              <AdminOnly>
                <Settings />
              </AdminOnly>
            }
          />
        </Route>

        {/* เส้นทางที่ไม่ตรง → กลับหน้า Login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
