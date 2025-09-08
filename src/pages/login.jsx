import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    const validEmail = "ploy@example.com";
    const validPassword = "12345678";

    if (email === validEmail && password === validPassword) {
      localStorage.setItem("isLoggedIn", "true");
      navigate("/dashboard");
    } else {
      alert("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* LEFT: form area (cream background) */}
      <div className="bg-[#FFF3E3] flex items-center justify-center px-6 py-10">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-lg"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-[#0b1b3b] mb-8">
            ลงชื่อเข้าใช้ระบบ
          </h1>

          {/* Username / Email */}
          <div className="relative mb-5">
            {/* user icon */}
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0b1b3b]/80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21a8 8 0 0 0-16 0"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Username"
              className="w-full pl-12 pr-4 py-4 rounded-full border border-[#0b1b3b]/15 bg-white/90 text-[#0b1b3b] placeholder-[#0b1b3b]/60 focus:outline-none focus:ring-2 focus:ring-[#0b1b3b] focus:border-transparent"
              required
            />
          </div>

          {/* Password */}
          <div className="relative mb-8">
            {/* lock icon */}
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0b1b3b]/80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-12 pr-4 py-4 rounded-full border border-[#0b1b3b]/15 bg-white/90 text-[#0b1b3b] placeholder-[#0b1b3b]/60 focus:outline-none focus:ring-2 focus:ring-[#0b1b3b] focus:border-transparent"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-4 rounded-full bg-[#0b1b3b] text-white text-xl font-semibold hover:brightness-110 transition"
          >
            ลงชื่อเข้าใช้
          </button>

        </form>
      </div>

<div className="bg-[#F56E74] flex items-center justify-center px-6 py-10">
  <div className="text-center">
    <img
      src="/path/to/logo.png"
      alt="Logo ระฆังทอง"
      className="mx-auto w-72 mb-6"
    />
    <div className="font-extrabold tracking-wider text-[56px] md:text-[72px] text-[#D9C44A] mb-4">
  ระฆังทอง
</div>
<div className="text-white/90 tracking-[0.5em] text-[22px] md:text-[26px]">
  GROCERY&nbsp;STORE
</div>

  </div>
</div>
    </div>
  );   

}
