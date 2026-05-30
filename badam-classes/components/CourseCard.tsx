import Link from "next/link";
import type { Course } from "@/lib/types";

export default function CourseCard({ course }: { course: Course }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-xl font-semibold">{course.title}</h3>
      <p className="mt-2 text-sm text-white/70">{course.short_description}</p>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-2xl font-bold text-orange-400">₹{course.price}</span>
        {course.old_price ? <span className="text-white/40 line-through">₹{course.old_price}</span> : null}
      </div>
      <Link href={`/courses/${course.slug}`} className="btn-primary mt-4 inline-flex">
        View Details
      </Link>
    </div>
  );
}
