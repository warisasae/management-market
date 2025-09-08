// src/App.js
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Login from "./pages/Login";
import Stocks from "./pages/Stocks";
import Categories from "./pages/Categories";
import SalesHistory from "./pages/SalesHistory"; // ✅ เพิ่มตรงนี้

function App() {
  return (
    <Router>
      <Routes>
        {/* หน้า Login */}
        <Route path="/" element={<Login />} />

        {/* กลุ่มหน้า Dashboard */}
        <Route path="/dashboard" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="pos" element={<POS />} />
          <Route path="stocks" element={<Stocks />} />
          <Route path="categories" element={<Categories />} />
          <Route path="saleshistory" element={<SalesHistory />} /> {/* ✅ route ใหม่ */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
