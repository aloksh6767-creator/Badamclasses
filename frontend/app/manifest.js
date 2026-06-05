export default function manifest() {
  return {
    name: "Badam Singh Classes",
    short_name: "BadamClasses",
    description: "Badam Singh Classes coaching app for courses, mock tests, checkout, and student account access.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#071126",
    theme_color: "#071126",
    categories: ["education"],
    icons: [
      {
        src: "/new-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ],
    shortcuts: [
      {
        name: "Explore Courses",
        short_name: "Courses",
        description: "View all Badam Singh Classes courses.",
        url: "/courses",
        icons: [{ src: "/new-logo.png", sizes: "192x192", type: "image/png" }]
      },
      {
        name: "Mock Tests",
        short_name: "Tests",
        description: "Open free and paid mock tests.",
        url: "/mock-tests",
        icons: [{ src: "/new-logo.png", sizes: "192x192", type: "image/png" }]
      }
    ]
  };
}
