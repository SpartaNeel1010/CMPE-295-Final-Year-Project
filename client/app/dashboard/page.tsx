import { Metadata } from "next";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard | InterviewRamp",
  description: "Your personal interview performance dashboard — track progress, ratings, and upcoming sessions.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
