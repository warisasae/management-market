import { Navigate, useLocation } from "react-router-dom";
import { isLoggedIn, isAdmin } from "../lib/auth";
import { useState, useEffect } from "react";

/**
 * @typedef {object} ProtectedRouteProps
 * @property {React.ReactNode} children
 * @property {boolean} [requiresInitialAuthLoad=true] - กำหนดว่าจะต้องรอการโหลดสถานะ Auth เริ่มต้นหรือไม่
 */

/**
 * Component สำหรับการป้องกันเส้นทางที่ต้องการการล็อกอิน
 * เราเพิ่ม state 'isCheckingAuth' เพื่อให้ Route Guard 'รอ' ชั่วขณะ
 * เพื่อหลีกเลี่ยง Race Condition กับ Component อื่นที่กำลังโหลด/อัปเดต Auth State 
 */
export function ProtectedRoute({ children, requiresInitialAuthLoad = true }) {
  const loc = useLocation();
  const [isAuthReady, setIsAuthReady] = useState(!requiresInitialAuthLoad); // เริ่มต้นเป็น false ถ้าต้องรอ

  // Simulation: ใช้ useEffect เพื่อให้ React มีโอกาส Mount Component อื่นๆ และอ่าน localStorage ก่อน
  useEffect(() => {
    // แก้ไข: เพิ่มเวลาหน่วงเป็น 200ms เพื่อให้แน่ใจว่า Auth State ใน Local Storage ถูกอ่านเสร็จสมบูรณ์
    const timer = setTimeout(() => {
        setIsAuthReady(true);
    }, 200); // *** เพิ่มเป็น 200ms ***

    return () => clearTimeout(timer);
  }, []);

  // 1. ถ้ายังไม่พร้อม ให้แสดงสถานะโหลด (หรือ null)
  if (!isAuthReady) {
    // อาจแสดง Loading Spinner หรือแค่ null เพื่อรอ
    return <div className="min-h-screen grid place-items-center text-xl text-gray-500">
        <svg className="animate-spin h-6 w-6 text-indigo-500" viewBox="0 0 24 24"></svg>
        กำลังตรวจสอบสิทธิ์...
    </div>;
  }

  // 2. เมื่อพร้อมแล้ว ให้ตรวจสอบสถานะการล็อกอิน
  if (!isLoggedIn()) {
    // ผู้ใช้ไม่ได้ล็อกอินแล้ว
    return <Navigate to="/" replace state={{ from: loc }} />;
  }

  // 3. ผ่านการตรวจสอบ
  return children;
}

export function AdminOnly({ children }) {
  const loc = useLocation();
  
  // NOTE: AdminOnly จะใช้ ProtectedRoute ในการจัดการ Loading/Login Check 
  // แต่เนื่องจากเราไม่ได้ใช้ Context ในไฟล์นี้ จึงต้องตรวจสอบ isLoggedIn() ซ้ำ
  
  if (!isLoggedIn()) return <Navigate to="/" replace state={{ from: loc }} />;
  
  if (!isAdmin())   return <Navigate to="/dashboard" replace state={{ from: loc }} />;
  
  return children;
}
