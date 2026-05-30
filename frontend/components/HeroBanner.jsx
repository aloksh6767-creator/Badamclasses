"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { A11y, Autoplay, EffectFade, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";
import { getCourseFallbackImage, resolveCourseImage } from "@/lib/courseImages";

const AUTO_SLIDE_MS = 3200;

const formatPrice = (value) => Number(value || 0).toLocaleString("en-IN");

const getBatchKey = (batch, index = 0) => {
  return String(batch?.routeId || batch?._id || batch?.id || batch?.slug || batch?.title || `course-${index}`);
};

export default function HeroBanner({ batches = [] }) {
  const [mounted, setMounted] = useState(false);
  const visibleBatches = batches.filter(Boolean).slice(0, 8);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!visibleBatches.length) return null;

  const fallbackBatch = visibleBatches[0];
  const fallbackImage = resolveCourseImage(fallbackBatch);
  const fallbackPrice = Number(fallbackBatch?.offerPrice || fallbackBatch?.priceValue || 0);
  const fallbackHighlights = Array.isArray(fallbackBatch?.highlights)
    ? fallbackBatch.highlights.filter(Boolean).slice(0, 3)
    : [];

  if (!mounted) {
    return (
      <section className="hero-slider-shell animate-reveal mb-8" aria-label="Featured courses slider">
        <article className="hero-course-slide">
          <div className="hero-course-visual">
            <img
              src={fallbackImage}
              alt={fallbackBatch.title}
              className="hero-course-image"
              loading="eager"
            />
          </div>

          <div className="hero-course-content">
            <span className="hero-course-pill">Latest Batch</span>
            <h2 className="hero-course-title">{fallbackBatch.title}</h2>
            <div className="hero-course-details">
              <p>Instructor: {fallbackBatch.instructor || "Badam Sir"}</p>
              <p>Duration: {fallbackBatch.duration || "Flexible access"}</p>
            </div>

            {fallbackHighlights.length ? (
              <div className="hero-course-features" aria-label={`${fallbackBatch.title} features`}>
                {fallbackHighlights.map((highlight) => (
                  <span key={highlight}>{highlight}</span>
                ))}
              </div>
            ) : null}

            <p className="hero-course-price">
              <span className="inr-sign">{String.fromCharCode(0x20B9)}</span>
              {formatPrice(fallbackPrice)}
            </p>

            <div className="hero-course-actions">
              <Link
                href={`/checkout?course=${encodeURIComponent(fallbackBatch.title)}`}
                className="hero-enroll-button"
              >
                Enroll Now
              </Link>
            </div>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="hero-slider-shell animate-reveal mb-8" aria-label="Featured courses slider">
      <Swiper
        modules={[A11y, Autoplay, EffectFade, Pagination]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        loop
        speed={650}
        pagination={{ clickable: true }}
        autoplay={{
          delay: AUTO_SLIDE_MS,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        }}
        className="hero-swiper"
      >
        {visibleBatches.map((batch, index) => {
          const image = resolveCourseImage(batch);
          const price = Number(batch?.offerPrice || batch?.priceValue || 0);
          const isLatest = index === 0 || batch?.isLatest;
          const highlights = Array.isArray(batch?.highlights) ? batch.highlights.filter(Boolean).slice(0, 3) : [];

          return (
            <SwiperSlide key={getBatchKey(batch, index)}>
              <article className="hero-course-slide">
                <div className="hero-course-visual">
                  <img
                    src={image}
                    alt={batch.title}
                    className="hero-course-image"
                    loading={index === 0 ? "eager" : "lazy"}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = getCourseFallbackImage(batch);
                    }}
                  />
                </div>

                <div className="hero-course-content">
                  <span className="hero-course-pill">{isLatest ? "Latest Batch" : batch.category || "Course"}</span>
                  <h2 className="hero-course-title">{batch.title}</h2>
                  <div className="hero-course-details">
                    <p>Instructor: {batch.instructor || "Badam Sir"}</p>
                    <p>Duration: {batch.duration || "Flexible access"}</p>
                  </div>

                  {highlights.length ? (
                    <div className="hero-course-features" aria-label={`${batch.title} features`}>
                      {highlights.map((highlight) => (
                        <span key={highlight}>{highlight}</span>
                      ))}
                    </div>
                  ) : null}

                  <p className="hero-course-price">
                    <span className="inr-sign">{String.fromCharCode(0x20B9)}</span>
                    {formatPrice(price)}
                  </p>

                  <div className="hero-course-actions">
                    <Link
                      href={`/checkout?course=${encodeURIComponent(batch.title)}`}
                      className="hero-enroll-button"
                    >
                      Enroll Now
                    </Link>
                  </div>
                </div>
              </article>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </section>
  );
}
