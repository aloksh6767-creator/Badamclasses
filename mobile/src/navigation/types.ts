import { Course } from "@/data/fallbackCourses";

export type RootStackParamList = {
  MainTabs: undefined;
  CourseDetail: { course: Course };
  Checkout: { course: Course };
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  MockTests: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Courses: undefined;
  Live: undefined;
  MyCourses: undefined;
  Profile: undefined;
};
