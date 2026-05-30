export type UserRole = "student" | "admin";

export interface Course {
  id: number;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  price: number;
  old_price: number | null;
  validity: string;
  category: string;
  thumbnail_url: string | null;
  is_published: boolean;
}

export interface Enrollment {
  id: number;
  user_id: string;
  course_id: number;
  payment_status: "pending" | "paid" | "failed";
}
