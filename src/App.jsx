// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Checkout from "./pages/Checkout";
import Login from "./pages/login";
import Stocks from "./pages/Stocks";
import Categories from "./pages/categories";
import SalesHistory from "./pages/SalesHistory";
import SaleDetail from "./pages/SaleDetail";
import ProductsList from "./pages/ProductsList";
import ProductForm from "./pages/ProductForm";
import ProductDetail from "./pages/ProductDetail";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import UserForm from "./pages/UserForm";
import Settings from "./pages/Settings";
import { ProtectedRoute, AdminOnly } from "./components/route-guards";

// ✅ ห่อหน้า Checkout: ถ้าไม่มี payload ใน session → เด้งกลับ POS
function RequireCheckout({ children }) {
  const loc = useLocation();
  const raw = sessionStorage.getItem("mm_checkout");
  let ok = false;
  try {
    const data = raw ? JSON.parse(raw) : null;
    ok = Array.isArray(data?.items) && data.items.length > 0;
  } catch {
    ok = false;
  }
  if (!ok) {
    return <Navigate to="/dashboard/pos" replace state={{ from: loc }} />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

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
          <Route
            path="pos/checkout"
            element={
              <RequireCheckout>
                <Checkout />
              </RequireCheckout>
            }
          />
          <Route path="stocks" element={<Stocks />} />
          <Route path="categories" element={<Categories />} />
          <Route path="saleshistory" element={<SalesHistory />} />
          <Route path="saleshistory/:id" element={<SaleDetail />} />
          <Route path="products" element={<ProductsList />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="reports" element={<Reports />} />
          <Route path="/dashboard/profile/edit" element={<UserForm mode="self-edit" />} />

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
