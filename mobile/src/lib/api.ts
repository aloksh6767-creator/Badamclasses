const API_BASE_URL = "https://badamclasses.onrender.com/api";

export type Course = {
  _id?: string;
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  thumbnail?: string;
  image?: string;
  price?: number | string;
  discountedPrice?: number | string;
  category?: string;
};

async function request<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export async function getCourses(): Promise<Course[]> {
  const payload = await request<Course[] | { courses?: Course[]; data?: Course[] }>("/courses");
  if (Array.isArray(payload)) return payload;
  return payload.courses ?? payload.data ?? [];
}

export async function getHealth(): Promise<{ status: string; database?: string }> {
  return request("/health");
}
