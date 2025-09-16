// src/pages/ProductDetail.jsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

const THB = (n) =>
  (Number(n) || 0).toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
  });

export default function ProductDetail() {
  const { id } = useParams(); // product_id
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        // ✅ ตัด /api ออก (เพราะ baseURL = /api อยู่แล้ว)
        const res = await api.get(`/products/${id}`);
        setProduct(res.data);
      } catch (err) {
        if (err?.response?.status === 404) {
          setProduct(null);
        } else {
          setError("โหลดข้อมูลไม่สำเร็จ");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const statusBadge = useMemo(() => {
    const s = product?.status;
    if (s === "AVAILABLE")
      return <span className="text-green-600 font-semibold">มีจำหน่าย</span>;
    if (s === "OUT_OF_STOCK")
      return <span className="text-red-600 font-semibold">สินค้าหมด</span>;
    if (s === "UNAVAILABLE")
      return <span className="text-gray-500 font-semibold">เลิกขาย</span>;
    return "-";
  }, [product]);

  if (loading) {
    return (
      <Wrapper navigate={navigate} title="รายละเอียดสินค้า">
        <Card>
          <div className="text-center text-gray-500 py-10">กำลังโหลด...</div>
        </Card>
      </Wrapper>
    );
  }

  if (error) {
    return (
      <Wrapper navigate={navigate} title="รายละเอียดสินค้า">
        <Card>
          <div className="text-center text-red-600 py-10">{error}</div>
        </Card>
      </Wrapper>
    );
  }

  if (!product) {
    return (
      <Wrapper navigate={navigate} title="รายละเอียดสินค้า">
        <Card>ไม่พบสินค้า</Card>
      </Wrapper>
    );
  }

  return (
    <Wrapper navigate={navigate} title="รายละเอียดสินค้า">
      <Card>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
          <Row label="รหัสสินค้า" value={product.product_id} />
          <Row label="ชื่อสินค้า" value={product.product_name} />
          <Row label="หมวดหมู่" value={product.category?.category_name || "-"} />
          <Row label="ราคาขาย" value={THB(product.sell_price)} />
          <Row
            label="จำนวนคงเหลือ"
            value={`${product.stock_qty ?? 0} ${product.unit || ""}`.trim()}
          />
          <Row label="หน่วย" value={product.unit || "-"} />
          <Row label="บาร์โค้ด" value={product.barcode || "-"} />
          <Row label="สถานะ" value={statusBadge} />
        </dl>

        {product.image_url && (
          <div className="mt-6 flex justify-center">
            <img
              src={product.image_url}
              alt={product.product_name}
              className="w-[280px] h-[200px] object-contain rounded-xl bg-white shadow-sm ring-1 ring-black/5"
            />
          </div>
        )}
      </Card>
    </Wrapper>
  );
}

/* ---------------- small components ---------------- */
function Wrapper({ navigate, title, children }) {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-green-600 text-white hover:bg-green-700"
            title="กลับ"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M15 18L9 12l6-6v12Z" />
            </svg>
          </button>
          <h1 className="text-2xl font-extrabold">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function Card({ children }) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/5 p-6">{children}</div>
  );
}

function Row({ label, value, className = "" }) {
  return (
    <div className={`grid grid-cols-[auto_1fr] items-baseline ${className}`}>
      <div className="text-gray-700 font-semibold">
        <span>{label}</span>
        <span className="mx-2">:</span>
      </div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
