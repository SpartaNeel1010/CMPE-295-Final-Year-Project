import type { Metadata } from "next";
import SchedulerClient from "./SchedulerClient";

export const metadata: Metadata = {
  title: "Schedule an Interview — Interview Ramp",
  description:
    "Book a mock interview session on Interview Ramp. Choose DSA or Behavioral, match with a peer, or invite a friend and pick your ideal time slot.",
};

export default function SchedulePage() {
  return <SchedulerClient />;
}
