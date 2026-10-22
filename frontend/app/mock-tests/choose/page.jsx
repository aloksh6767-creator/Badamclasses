import { redirect } from "next/navigation";

export default async function MockChooserRedirect({ searchParams }) {
  const params = await searchParams;
  const destination = new URLSearchParams();
  const exam = String(params?.exam || "Railway").trim();
  destination.set("exam", exam || "Railway");
  destination.set("mode", params?.mode || "full");
  if (params?.subExam) destination.set("subExam", String(params.subExam));
  redirect(`/test-rank?${destination.toString()}#all-tests`);
}
