"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, AlertCircle, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid username or password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-radial from-slate-900 via-zinc-950 to-black text-slate-100 overflow-hidden relative select-none">
      
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-[#0078d4]/10 rounded-full blur-3xl pointer-events-none animate-pulse duration-[6000ms]" />

      <div className="w-full max-w-md p-8 relative z-10">
        
        {/* Logo / Header Branding */}
        <div className="text-center mb-8 flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-[#0078d4] to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 border border-white/10 animate-bounce duration-[3000ms]">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Document Intelligence
          </h1>
          <p className="text-xs text-slate-400/80 font-medium max-w-xs mt-1">
            Access the advanced layout detection & document parsing engine
          </p>
        </div>

        {/* Login Form Container (Glassmorphism design) */}
        <div className="bg-zinc-900/40 border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:border-white/15 transition-colors duration-500">
          
          <form onSubmit={handleLogin} className="space-y-5">
            
            {/* Username Input Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider text-slate-300 uppercase block pl-1">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <User className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]/30 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Input Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-wider text-slate-300 uppercase block pl-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]/30 transition-all font-medium"
                />
              </div>
            </div>

            {/* Error Message Box */}
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-2.5 items-start text-xs text-red-400 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-gradient-to-r from-[#0078d4] to-indigo-600 hover:from-[#106ebe] hover:to-indigo-700 text-white rounded-xl text-sm font-semibold transition-all duration-300 shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 focus:outline-hidden cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="h-4.5 w-4.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Credentials tooltip */}
          <div className="mt-6 border-t border-white/5 pt-4 text-center">
            <span className="text-[10px] text-slate-500 font-semibold tracking-wide block uppercase">
              Demo Credentials
            </span>
            <span className="text-[10px] text-slate-400/70 font-mono mt-1 block">
              User: <span className="text-blue-400">demo</span> &bull; Pass: <span className="text-blue-400">demo</span>
            </span>
          </div>

        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-[10px] text-slate-600 font-semibold">
          &copy; 2026 Document Intelligence Engine. All rights reserved.
        </div>

      </div>
    </div>
  );
}
