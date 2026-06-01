import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "@/theme/colors";
import { RootStackParamList, MainTabParamList } from "./types";
import { HomeScreen } from "@/screens/HomeScreen";
import { CoursesScreen } from "@/screens/CoursesScreen";
import { CourseDetailScreen } from "@/screens/CourseDetailScreen";
import { CheckoutScreen } from "@/screens/CheckoutScreen";
import { LiveScreen } from "@/screens/LiveScreen";
import { MyCoursesScreen } from "@/screens/MyCoursesScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { LoginScreen } from "@/screens/LoginScreen";
import { SignupScreen } from "@/screens/SignupScreen";
import { ForgotPasswordScreen } from "@/screens/ForgotPasswordScreen";
import { MockTestsScreen } from "@/screens/MockTestsScreen";
import { TabIcon } from "@/components/TabIcon";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.navy,
    card: colors.navy2,
    text: colors.text,
    border: colors.border,
    primary: colors.orange
  }
};

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.navy2,
          borderTopColor: colors.border,
          height: 68,
          paddingBottom: 10,
          paddingTop: 8
        },
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "800" }
      }}
    >
      <Tabs.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ color }) => <TabIcon name="home" color={color} /> }} />
      <Tabs.Screen name="Courses" component={CoursesScreen} options={{ tabBarIcon: ({ color }) => <TabIcon name="courses" color={color} /> }} />
      <Tabs.Screen name="Live" component={LiveScreen} options={{ tabBarIcon: ({ color }) => <TabIcon name="live" color={color} /> }} />
      <Tabs.Screen name="MyCourses" component={MyCoursesScreen} options={{ title: "My Courses", tabBarIcon: ({ color }) => <TabIcon name="my" color={color} /> }} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ color }) => <TabIcon name="profile" color={color} /> }} />
    </Tabs.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.navy2 },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "900" },
          contentStyle: { backgroundColor: colors.navy }
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="CourseDetail" component={CourseDetailScreen} options={{ title: "Course Details" }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: "Checkout" }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Login" }} />
        <Stack.Screen name="Signup" component={SignupScreen} options={{ title: "Create Account" }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: "Forgot Password" }} />
        <Stack.Screen name="MockTests" component={MockTestsScreen} options={{ title: "Mock Tests" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
