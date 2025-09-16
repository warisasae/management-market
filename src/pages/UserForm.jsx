// src/pages/UserForm.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";
const DEFAULT_AVATAR_SRC = "/default-avatar.png"; // ← วางไฟล์ใน public/

function resolveUrl(u) {
  if (!u) return "";
  return u.startsWith("http") ? u : `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
}

export default function UserForm({ mode = "create" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = mode === "edit";
  const isSelfEdit = mode === "self-edit"; // ✅ โหมดใหม่

  // ถ้า self-edit → ใช้ id ของ user ปัจจุบัน
  const auth = JSON.parse(localStorage.getItem("mm_auth") || "{}");
  const selfId = auth?.user?.id || auth?.id;
  const effectiveId = isSelfEdit ? selfId : id;

  const [empName, setEmpName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("USER");
  const [password, setPassword] = useState("");

  // รูปโปรไฟล์
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);

  const [showSaved, setShowSaved] = useState(false);
  const [loading, setLoading] = useState(isEdit || isSelfEdit);
  const [saving, setSaving] = useState(false);

  // โหลดข้อมูลผู้ใช้
  useEffect(() => {
    if (!(isEdit || isSelfEdit) || !effectiveId) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/users/${encodeURIComponent(effectiveId)}`, {
          validateStatus: (s) => s >= 200 && s < 500,
        });
        if (res.status === 200 && res.data) {
          const u = res.data;
          if (!alive) return;
          setEmpName(u.name || "");
          setUsername(u.username || "");
          setRole((u.role || "USER").toUpperCase());
          setImageUrl(u.image_url || "");
          setPassword("");
        } else {
          navigate("/dashboard/users", { replace: true });
        }
      } catch {
        navigate("/dashboard/users", { replace: true });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isEdit, isSelfEdit, effectiveId, navigate]);

  // จัดการไฟล์รูป
  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("กรุณาเลือกเป็นไฟล์รูปภาพเท่านั้น");
      return;
    }
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const useDefaultImage = () => {
    setImageFile(null);
    setPreview("");
    setImageUrl(""); // → บันทึก null
  };

  const title = useMemo(() => {
    if (isSelfEdit) return "แก้ไขโปรไฟล์ของฉัน";
    return isEdit ? "แก้ไขข้อมูลผู้ใช้" : "เพิ่มผู้ใช้งาน";
  }, [isEdit, isSelfEdit]);

  // อัปโหลดรูปไป backend
  const uploadImageIfNeeded = async () => {
    if (!imageFile) return imageUrl || "";
    const form = new FormData();
    form.append("file", imageFile);
    setUploading(true);
    try {
      const res = await api.post("/uploads", form, {
        headers: { "Content-Type": "multipart/form-data" },
        validateStatus: (s) => s >= 200 && s < 500,
      });
      if (res.status >= 200 && res.status < 300 && (res.data?.url || res.data?.path)) {
        return res.data.url || res.data.path;
      }
      throw new Error(res.data?.error || "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!empName.trim() || !username.trim()) return;

    try {
      setSaving(true);

      const rawImage = await uploadImageIfNeeded();
      const finalImageUrl = rawImage || (imageUrl ? imageUrl : null);

      if (isEdit || isSelfEdit) {
        const resProfile = await api.put(
          `/users/${encodeURIComponent(effectiveId)}`,
          {
            role: isSelfEdit ? undefined : role, // self-edit แก้ role ไม่ได้
            image_url: finalImageUrl,
          },
          { validateStatus: (s) => s >= 200 && s < 500 }
        );
        if (resProfile.status < 200 || resProfile.status >= 300) {
          throw new Error("อัปเดตข้อมูลไม่สำเร็จ");
        }

        if (password && password.trim()) {
          const resPW = await api.put(
            `/users/${encodeURIComponent(effectiveId)}/password`,
            { password: password.trim() },
            { validateStatus: (s) => s >= 200 && s < 500 }
          );
          if (resPW.status < 200 || resPW.status >= 300) {
            throw new Error("เปลี่ยนรหัสผ่านไม่สำเร็จ");
          }
        }

        // ถ้าแก้ข้อมูลของตัวเอง → sync localStorage
        if (isSelfEdit) {
          const raw = localStorage.getItem("mm_auth");
          if (raw) {
            const auth = JSON.parse(raw);
            const next = {
              ...auth,
              user: {
                ...(auth.user || {}),
                image_url: finalImageUrl,
              },
            };
            localStorage.setItem("mm_auth", JSON.stringify(next));
            window.dispatchEvent(new StorageEvent("storage", { key: "mm_auth" }));
          }
        }
      } else {
        // create user
        if (!password.trim()) {
          alert("กรุณากรอกรหัสผ่านสำหรับผู้ใช้ใหม่");
          setSaving(false);
          return;
        }
        const res = await api.post(
          "/users",
          {
            username: username.trim(),
            password: password.trim(),
            name: empName.trim(),
            role,
            image_url: finalImageUrl,
          },
          { validateStatus: (s) => s >= 200 && s < 500 }
        );
        if (res.status === 409) {
          alert("ชื่อผู้ใช้ซ้ำ กรุณาใช้ชื่ออื่น");
          setSaving(false);
          return;
        }
        if (res.status < 201 || res.status >= 300) {
          throw new Error("สร้างผู้ใช้ไม่สำเร็จ");
        }
      }

      setShowSaved(true);
      setTimeout(() => {
        setShowSaved(false);
        navigate("/dashboard/users");
      }, 900);
    } catch (err) {
      alert(err?.message || "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 grid place-items-center">
        <div className="text-gray-600">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  const displayImage = preview || resolveUrl(imageUrl) || DEFAULT_AVATAR_SRC;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
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

        <form onSubmit={onSubmit} className="bg-white rounded-2xl ring-1 ring-black/10 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ชื่อพนักงาน */}
<div>
  <label className="block text-sm text-gray-700 mb-1">ชื่อพนักงาน</label>
  <input
    value={empName}
    onChange={(e) => setEmpName(e.target.value)}
    disabled={isEdit || isSelfEdit}
    className={`w-full h-11 px-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500
      ${isEdit || isSelfEdit 
        ? "bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed" 
        : "border border-gray-400"}`}
  />
</div>

{/* สิทธิ์การใช้งาน */}
<div>
  <label className="block text-sm text-gray-700 mb-1">สิทธิ์การใช้งาน</label>
  <select
    value={role}
    onChange={(e) => setRole(e.target.value)}
    disabled={isSelfEdit}
    className={`w-full h-11 px-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500
      ${isSelfEdit 
        ? "bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed" 
        : "border border-gray-400"}`}
  >
    <option value="USER">พนักงานขาย</option>
    <option value="ADMIN">แอดมิน</option>
  </select>
</div>

{/* ชื่อผู้ใช้ */}
<div>
  <label className="block text-sm text-gray-700 mb-1">ชื่อผู้ใช้</label>
  <input
    value={username}
    onChange={(e) => setUsername(e.target.value)}
    disabled={isEdit || isSelfEdit}
    className={`w-full h-11 px-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500
      ${isEdit || isSelfEdit 
        ? "bg-gray-100 text-gray-500 border border-gray-300 cursor-not-allowed" 
        : "border border-gray-400"}`}
  />
</div>


            {/* รหัสผ่าน */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">รหัสผ่าน</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit || isSelfEdit ? "เว้นว่างถ้าไม่เปลี่ยนรหัส" : "กรอกรหัสผ่าน"}
                className="w-full h-11 px-3 border rounded-lg"
              />
            </div>

            {/* รูปโปรไฟล์ */}
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 mb-2">รูปโปรไฟล์</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border">
                  <img src={displayImage} alt="preview" className="w-full h-full object-cover" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="px-3 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer flex items-center gap-2">
                    <span>เลือกไฟล์</span>
                    <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
                  </label>
                  <button
                    type="button"
                    onClick={useDefaultImage}
                    className="px-3 h-10 bg-rose-100 hover:bg-rose-200 rounded-lg text-rose-700"
                  >
                    ลบรูป (ใช้เริ่มต้น)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ปุ่ม */}
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="submit"
              disabled={saving || uploading}
              className={`px-5 h-11 rounded-lg text-white font-semibold ${
                saving || uploading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard/users")}
              className="px-5 h-11 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </div>

      {showSaved && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center z-50">
          <div className="bg-white rounded-2xl p-6 text-center">
            <div className="font-extrabold mb-2">บันทึกสำเร็จ</div>
            <div className="mx-auto w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              ✓
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
