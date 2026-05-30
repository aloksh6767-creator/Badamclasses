"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken, getUser } from "@/lib/auth";
import { matchCourseByRoute, normalizeCourseForRoute } from "@/lib/courseIdentity";
import { batches } from "@/lib/fixtures";
import { filterDeletedCourses, filterDeletedCoursesFromStorage, readDeletedCourseKeys, readLocalCourses } from "@/lib/localCourseState";
import { loadRazorpayScript } from "@/lib/razorpay";

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseKey = searchParams.get("course") || "";
  const [localCourses, setLocalCourses] = useState([]);
  const [remoteCourses, setRemoteCourses] = useState([]);
  const [notice, setNotice] = useState("");
  const [systemNotice, setSystemNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentOption, setPaymentOption] = useState("upi");
  const [qrSession, setQrSession] = useState(null);
  const [upiId, setUpiId] = useState("");
  const [upiValidationState, setUpiValidationState] = useState("idle");
  const [upiValidationMessage, setUpiValidationMessage] = useState("");
  const [deletedCourseKeys, setDeletedCourseKeys] = useState([]);

  useEffect(() => {
    setDeletedCourseKeys(readDeletedCourseKeys());
    setLocalCourses(filterDeletedCoursesFromStorage(readLocalCourses()));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch("/courses");
        setRemoteCourses(Array.isArray(data) ? data.map((course, index) => normalizeCourseForRoute(course, index)) : []);
      } catch {
        setRemoteCourses([]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const debug = await apiFetch("/payments/debug");
        if (!debug?.razorpay?.configured) {
          setSystemNotice("Payment setup is incomplete right now. Please try again after Razorpay keys are configured.");
          return;
        }

        if (debug?.razorpay?.mode === "live") {
          setSystemNotice("Razorpay live mode is active. Use test keys if you want to run test payments safely.");
          return;
        }

        if (debug?.database?.status !== "connected" && debug?.localPersistenceEnabled) {
          setSystemNotice("Payments are running in backup mode right now. Your purchase will still be saved safely on this server.");
          return;
        }
      } catch {}
      setSystemNotice("");
    })();
  }, []);

  const course = useMemo(() => {
    if (!courseKey) return null;

    const localMatch =
      matchCourseByRoute(localCourses, courseKey) ||
      localCourses.find((item) => item.title?.toLowerCase() === courseKey.toLowerCase());
    if (localMatch) {
      return {
        ...normalizeCourseForRoute(localMatch),
        title: localMatch.title,
        instructor: localMatch.instructor || "BadamClasses",
        duration: localMatch.duration || "Flexible",
        priceValue: Number(localMatch.offerPrice || localMatch.price || 0),
        originalPrice: Number(localMatch.price || 0),
        discountPercent: localMatch.discountPercent || null,
        offerLabel: localMatch.offerLabel || null,
        image: localMatch.image || localMatch.thumbnail || ""
      };
    }

    const remoteMatch =
      matchCourseByRoute(remoteCourses, courseKey) ||
      remoteCourses.find((item) => item.title?.toLowerCase() === courseKey.toLowerCase());
    if (remoteMatch) {
      return {
        ...normalizeCourseForRoute(remoteMatch),
        priceValue: Number(remoteMatch.offerPrice || remoteMatch.price || 0),
        originalPrice: Number(remoteMatch.price || 0),
        image: remoteMatch.image || remoteMatch.thumbnail || ""
      };
    }

    const fallbackMatch =
      matchCourseByRoute(filterDeletedCourses(batches, deletedCourseKeys), courseKey) ||
      filterDeletedCourses(batches, deletedCourseKeys).find((item) => item.title.toLowerCase() === courseKey.toLowerCase());
    return fallbackMatch ? normalizeCourseForRoute(fallbackMatch) : null;
  }, [courseKey, deletedCourseKeys, localCourses, remoteCourses]);

  useEffect(() => {
    if (!qrSession?.qrId) {
      return undefined;
    }

    let cancelled = false;

    const pollStatus = async () => {
      try {
        const response = await apiFetch(`/payments/checkout/qr/${encodeURIComponent(qrSession.qrId)}/status`);
        if (cancelled) {
          return;
        }

        if (response?.paid) {
          const purchasedCourseId = encodeURIComponent(
            response.course?.routeId || course?.routeId || course?._id || course?.id || course?.title || courseKey
          );
          setQrSession(null);
          setSubmitting(false);
          router.push(`/dashboard?payment=success&purchase=success&course=${purchasedCourseId}&courseId=${purchasedCourseId}`);
          return;
        }

        if (response?.status === "expired") {
          setQrSession((current) => (current?.qrId === qrSession.qrId ? { ...current, status: "expired" } : current));
          setSubmitting(false);
          setNotice("This QR code has expired. Generate a new QR and try again.");
        }
      } catch (error) {
        if (!cancelled) {
          setNotice(error.message || "Unable to check QR payment status right now.");
        }
      }
    };

    pollStatus();
    const intervalId = window.setInterval(pollStatus, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [course, courseKey, qrSession, router]);

  const getCoursePayload = () => ({
    _id: course._id,
    id: course.id,
    routeId: course.routeId,
    title: course.title,
    price: Number(course.priceValue || course.price || 0),
    image: course.image || course.thumbnail || "",
    thumbnail: course.thumbnail || course.image || "",
    instructor: course.instructor?.name || course.instructor || "BadamClasses",
    duration: course.duration || "Flexible",
    batchTime: course.batchTime || "",
    startDate: course.startDate || ""
  });

  const ensureAuthenticatedUser = () => {
    const user = getUser();
    const token = getToken();
    if (!user || !token) {
      router.push(`/login?redirect=${encodeURIComponent(`/checkout?course=${courseKey}`)}`);
      return null;
    }

    return { user, token };
  };

  const handleValidateUpiId = async () => {
    setNotice("");
    setUpiValidationMessage("");

    const auth = ensureAuthenticatedUser();
    if (!auth) {
      return false;
    }

    const normalizedUpiId = upiId.trim().toLowerCase();
    if (!normalizedUpiId) {
      setUpiValidationState("invalid");
      setUpiValidationMessage("Pehle apna UPI ID daliyega.");
      return false;
    }

    setUpiValidationState("loading");

    try {
      const result = await apiFetch("/payments/validate-upi", {
        method: "POST",
        body: JSON.stringify({ vpa: normalizedUpiId })
      });

      if (!result?.valid) {
        setUpiValidationState("invalid");
        setUpiValidationMessage(result?.message || "UPI ID verify nahi ho saka.");
        return false;
      }

      setUpiValidationState("valid");
      setUpiValidationMessage(
        result?.customerName ? `UPI verified: ${result.customerName}` : "UPI ID verified. Ab secure payment continue kar sakte hain."
      );
      return true;
    } catch (error) {
      setUpiValidationState("invalid");
      setUpiValidationMessage(error.message || "UPI ID validate nahi ho saka.");
      return false;
    }
  };

  const handleQrPurchase = async () => {
    setSubmitting(true);
    setNotice("");

    try {
      const session = await apiFetch("/payments/checkout/qr", {
        method: "POST",
        body: JSON.stringify({
          courseId: course._id,
          course: getCoursePayload()
        })
      });

      setQrSession(session);
      setNotice("");
    } catch (error) {
      setNotice(error.message || "QR payment is unavailable right now.");
      setQrSession(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePurchase = async () => {
    setNotice("");
    setQrSession(null);

    const auth = ensureAuthenticatedUser();
    if (!auth) {
      return;
    }
    const { user } = auth;

    if (!course) {
      setNotice("Selected course not found.");
      return;
    }

    if (paymentOption === "upi" && upiId.trim()) {
      const isValid = await handleValidateUpiId();
      if (!isValid) {
        return;
      }
    }

    if (paymentOption === "qr") {
      await handleQrPurchase();
      return;
    }

    setSubmitting(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Razorpay checkout script could not be loaded.");
      }

      const order = await apiFetch("/payments/checkout", {
        method: "POST",
        body: JSON.stringify({
          courseId: course._id,
          course: getCoursePayload()
        })
      });

      const checkoutConfig =
        paymentOption === "upi"
          ? {
              display: {
                blocks: {
                  upi: {
                    name: "Pay using UPI",
                    instruments: [{ method: "upi" }]
                  },
                  other: {
                    name: "Other Payment Options",
                    instruments: [{ method: "netbanking" }, { method: "wallet" }, { method: "card" }]
                  }
                },
                sequence: ["block.upi", "block.other"],
                preferences: {
                  show_default_blocks: false
                }
              }
            }
          : {
              display: {
                blocks: {
                  upi: {
                    name: "Pay using UPI",
                    instruments: [{ method: "upi" }]
                  },
                  other: {
                    name: "Other Payment Options",
                    instruments: [{ method: "netbanking" }, { method: "wallet" }, { method: "card" }]
                  }
                },
                sequence: ["block.upi", "block.other"],
                preferences: {
                  show_default_blocks: false
                }
              }
            };

      let checkoutResolved = false;
      let checkoutWatchdogId = null;
      const settleCheckoutAttempt = () => {
        checkoutResolved = true;
        if (checkoutWatchdogId) {
          window.clearTimeout(checkoutWatchdogId);
          checkoutWatchdogId = null;
        }
      };

      const instance = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "BadamClasses",
        description: `Purchase ${order.course?.title || course.title}`,
        order_id: order.orderId,
        prefill: {
          name: order.user?.name || user.name || "",
          email: order.user?.email || user.email || "",
          contact: order.user?.phone || user.phone || user.mobile || ""
        },
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
          paylater: false
        },
        config: checkoutConfig,
        theme: {
          color: "#f97316"
        },
        handler: async (response) => {
          settleCheckoutAttempt();
          try {
            await apiFetch("/payments/confirm", {
              method: "POST",
              body: JSON.stringify({
                ...response,
                course: order.course
              })
            });

            const purchasedCourseId = encodeURIComponent(order.course?.routeId || course.routeId || course._id || course.id || course.title);
            router.push(`/dashboard?payment=success&purchase=success&course=${purchasedCourseId}&courseId=${purchasedCourseId}`);
          } catch (error) {
            setNotice(error.message || "Payment verified but course unlock failed.");
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            settleCheckoutAttempt();
            setSubmitting(false);
            setNotice("Payment was cancelled. Try again anytime.");
          }
        }
      });

      instance.on("payment.failed", () => {
        settleCheckoutAttempt();
        setSubmitting(false);
        setNotice("Payment failed. Please try UPI or Netbanking.");
      });

      checkoutWatchdogId = window.setTimeout(() => {
        if (checkoutResolved) {
          return;
        }

        setSubmitting(false);
        setNotice("Razorpay is taking longer than expected. Please retry or use the QR payment option.");
      }, 12000);

      instance.open();
    } catch (error) {
      const message = error.message || "Checkout is unavailable right now.";
      if (message.toLowerCase().includes("session expired")) {
        setNotice("Login session expired. Please login again to continue Razorpay test payment.");
        router.push(`/login?redirect=${encodeURIComponent(`/checkout?course=${courseKey}`)}`);
      } else {
        setNotice(message);
      }
      setSubmitting(false);
    }
  };

  const checkoutBlocked = Boolean(systemNotice && systemNotice.toLowerCase().includes("incomplete"));
  const activeNotice = notice || systemNotice;

  return (
    <main className="mx-auto w-[92%] max-w-5xl py-10 text-slate-100">
      <section className="rounded-3xl border border-white/10 bg-[#0d1a3a]/70 p-6 md:p-10">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-orange-200">Secure Checkout</p>
        <h1 className="font-display text-3xl md:text-4xl">Complete Your Enrollment</h1>
        <p className="mt-2 text-sm text-slate-300">Finish payment to unlock your course instantly.</p>
        {activeNotice ? (
          <div className="mt-4 rounded-xl border border-orange-300/40 bg-orange-500/10 px-4 py-3 text-sm text-orange-100">
            {activeNotice}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 md:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-[#0b1634]/80 p-5">
            <h2 className="font-display text-2xl">{course?.title || courseKey || "Selected Batch"}</h2>
            <p className="mt-2 text-sm text-slate-300">Instructor: {course?.instructor?.name || course?.instructor || "BadamClasses"}</p>
            <p className="text-sm text-slate-300">Duration: {course?.duration || "Flexible"}</p>
            <p className="mt-3 text-2xl font-semibold text-orange-300">
              <span className="inr-sign">{String.fromCharCode(0x20B9)}</span>
              {course?.priceValue ? course.priceValue.toLocaleString("en-IN") : "\u2014"}
              {course?.originalPrice && course.originalPrice !== course.priceValue ? (
                <span className="ml-2 text-sm text-white/60 line-through">
                  <span className="inr-sign">{String.fromCharCode(0x20B9)}</span>
                  {course.originalPrice.toLocaleString("en-IN")}
                </span>
              ) : null}
            </p>
            <p className="mt-3 text-xs text-slate-400">Razorpay test mode checkout will open securely after you click pay.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b1634]/80 p-5">
            <h3 className="font-display text-xl">Payment Options</h3>
            <div className="mt-4 grid gap-3 text-sm text-slate-300">
              <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <input
                  type="radio"
                  name="pay"
                  value="all"
                  checked={paymentOption === "all"}
                  onChange={(event) => setPaymentOption(event.target.value)}
                />
                Card / UPI / Netbanking / Wallet
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <input
                  type="radio"
                  name="pay"
                  value="upi"
                  checked={paymentOption === "upi"}
                  onChange={(event) => setPaymentOption(event.target.value)}
                />
                UPI Apps Only (Recommended)
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <input
                  type="radio"
                  name="pay"
                  value="qr"
                  checked={paymentOption === "qr"}
                  onChange={(event) => setPaymentOption(event.target.value)}
                />
                Scan QR with Any UPI App
              </label>
            </div>
            {paymentOption === "upi" ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <label className="block text-sm font-medium text-slate-200">UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(event) => {
                    setUpiId(event.target.value);
                    if (upiValidationState !== "idle") {
                      setUpiValidationState("idle");
                      setUpiValidationMessage("");
                    }
                  }}
                  placeholder="example@okaxis"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#09122a] px-4 py-3 text-white outline-none placeholder:text-slate-500"
                />
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={handleValidateUpiId}
                    disabled={submitting || upiValidationState === "loading"}
                    className="rounded-xl border border-orange-300/30 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-100 disabled:opacity-60"
                  >
                    {upiValidationState === "loading" ? "Checking..." : "Validate UPI ID"}
                  </button>
                </div>
                {upiValidationMessage ? (
                  <p
                    className={`mt-3 text-xs ${
                      upiValidationState === "valid" ? "text-emerald-300" : "text-orange-200"
                    }`}
                  >
                    {upiValidationMessage}
                  </p>
                ) : null}
                <p className="mt-3 text-xs text-slate-400">
                  Aapka UPI ID yahan verify hoga. Actual payment secure Razorpay flow me hi complete hoga.
                </p>
              </div>
            ) : null}
            <button
              onClick={handlePurchase}
              disabled={submitting || !course || checkoutBlocked}
              className="btn-gradient btn-anim mt-4 w-full rounded-xl px-5 py-3 font-semibold text-white disabled:opacity-70"
            >
              {submitting
                ? paymentOption === "qr"
                  ? "Preparing QR..."
                  : "Opening Razorpay..."
                : checkoutBlocked
                  ? "Purchases Temporarily Paused"
                  : paymentOption === "qr"
                    ? "Generate Payment QR"
                    : "Proceed to Pay"}
            </button>
            <p className="mt-3 text-center text-xs text-slate-400">
              {paymentOption === "upi"
                ? "Razorpay checkout will open directly with UPI options first."
                : paymentOption === "qr"
                  ? "A secure Razorpay QR will be generated. Scan it from any UPI app and wait here for confirmation."
                  : "Razorpay checkout will show all enabled payment methods, including UPI."}
            </p>
            {qrSession?.imageUrl ? (
              <div className="mt-4 rounded-2xl border border-orange-300/20 bg-white px-4 py-5 text-center text-slate-900">
                <p className="text-sm font-semibold text-slate-800">Scan to pay</p>
                <img
                  src={qrSession.imageUrl}
                  alt="Razorpay payment QR code"
                  className="mx-auto mt-3 h-56 w-56 rounded-xl border border-slate-200 object-contain"
                />
                <p className="mt-3 text-sm text-slate-700">
                  Amount: <span className="font-semibold">{"\u20B9"}{Number((qrSession.amount || 0) / 100).toLocaleString("en-IN")}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {qrSession.status === "expired"
                    ? "This QR expired. Generate a new one to continue."
                    : "After payment, this page will unlock your course automatically."}
                </p>
              </div>
            ) : null}
            <Link href="/courses" className="mt-3 block text-center text-xs text-slate-400 underline">
              Back to Courses
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
