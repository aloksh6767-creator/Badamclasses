"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

export default function FloatingEnrollButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const token = getToken();

      if (!token) {
        router.push("/courses");
        return;
      }

      const dashboard = await apiFetch("/student/dashboard");
      const purchased = Number(dashboard?.stats?.totalCourses || 0);

      if (purchased > 0) {
        router.push("/dashboard");
      } else {
        router.push("/courses");
      }
    } catch {
      router.push("/courses");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="floating-enroll btn-gradient btn-anim fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-50 min-h-11 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-xl sm:bottom-6 sm:left-6"
    >
      {loading ? "Checking..." : "My Courses"}
    </button>
  );
}
