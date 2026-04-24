import type { Metadata } from "next";
import SessionsClient from "./SessionsClient";

export const metadata: Metadata = {
  title: "My Sessions – Interview Ramp",
  description: "View all your past and upcoming mock interview sessions with detailed feedback.",
};

export default function SessionsPage() {
  return <SessionsClient />;
}
