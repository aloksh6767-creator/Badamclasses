"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadWishlist = async () => {
    try {
      const data = await apiFetch("/student/wishlist");
      setWishlist(data);
      setError("");
    } catch {
      setError("Wishlist is unavailable. Please login to view saved courses.");
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const removeItem = async (courseId) => {
    try {
      await apiFetch(`/student/wishlist/${courseId}`, { method: "DELETE" });
      await loadWishlist();
    } catch {
      setError("Unable to remove right now. Please try again later.");
    }
  };

  return (
    <main className="mx-auto w-[92%] max-w-6xl py-10">
      <h1 className="mb-6 font-display text-4xl">My Wishlist</h1>
      {error ? (
        <div className="mb-4 rounded-xl border border-orange-300/40 bg-orange-500/10 p-4 text-sm text-orange-100">
          {error}
        </div>
      ) : null}
      {loading ? <p className="text-slate-300">Loading wishlist...</p> : null}
      <div className="grid gap-4 md:grid-cols-3">
        {wishlist.map((item) => (
          <div key={item._id} className="rounded-xl border border-white/10 bg-card/70 p-5">
            <h2 className="font-display text-xl">{item.course?.title}</h2>
            <p className="text-sm text-slate-300">Instructor: {item.course?.instructor?.name}</p>
            <p className="mt-1 text-indigo-300">?{Number(item.course?.price || 0).toLocaleString("en-IN")}</p>
            <div className="mt-3 flex gap-2">
              <a href={`/courses/${item.course?._id}`} className="rounded-lg bg-accent px-3 py-2 text-sm text-white">View</a>
              <button onClick={() => removeItem(item.course?._id)} className="rounded-lg border border-white/20 px-3 py-2 text-sm">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
