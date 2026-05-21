"use client";

import React, { useState, useTransition } from "react";
import { loginAction, signupAction } from "@/lib/game/authActions";
import { Gamepad2, ShieldAlert, KeyRound, User, UserCheck } from "lucide-react";

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    password: "",
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      let res;
      if (isLogin) {
        res = await loginAction({
          username: formData.username,
          password: formData.password,
        });
      } else {
        res = await signupAction({
          username: formData.username,
          displayName: formData.displayName,
          password: formData.password,
        });
      }

      if (!res.success) {
        setErrorMsg(res.error || "Có lỗi xảy ra. Vui lòng thử lại.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-900/10 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        
        {/* Logo/Header */}
        <div className="flex flex-col items-center mb-8 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-blue-500 p-[2px] shadow-lg shadow-emerald-500/10 mb-4 hover:rotate-6 transition-transform duration-300">
            <div className="w-full h-full bg-zinc-950 rounded-2xl flex items-center justify-center">
              <Gamepad2 className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            LoL Legend '26
          </h1>
          <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mt-1">
            Championship Manager (LL26)
          </p>
        </div>

        {/* Card Form */}
        <div className="backdrop-blur-md bg-zinc-900/60 border border-zinc-800 rounded-2xl shadow-2xl p-6 lg:p-8 space-y-6">
          
          {/* Tab buttons */}
          <div className="flex bg-zinc-950/80 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => {
                setIsLogin(true);
                setErrorMsg(null);
              }}
              disabled={isPending}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                isLogin
                  ? "bg-zinc-800 text-zinc-100 shadow-md shadow-black/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              ĐĂNG NHẬP
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setErrorMsg(null);
              }}
              disabled={isPending}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                !isLogin
                  ? "bg-zinc-800 text-zinc-100 shadow-md shadow-black/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              ĐĂNG KÝ
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Tên đăng nhập
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  placeholder="Tên tài khoản..."
                  className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-emerald-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Display Name (Only for Signup) */}
            {!isLogin && (
              <div className="space-y-1.5 animate-slide-down">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Tên hiển thị (HLV)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <UserCheck className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    required={!isLogin}
                    placeholder="Ví dụ: HLV Kkoma, HLV Tom..."
                    className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-emerald-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Mật khẩu
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <KeyRound className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="••••••••"
                  className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-emerald-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-all focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-start gap-2 bg-red-950/30 border border-red-900/50 p-3 rounded-xl text-red-400 text-xs animate-shake">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-950/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>ĐANG XỬ LÝ...</span>
                </>
              ) : (
                <span>{isLogin ? "ĐĂNG NHẬP" : "ĐĂNG KÝ NGAY"}</span>
              )}
            </button>
          </form>



        </div>
      </div>
    </div>
  );
}
