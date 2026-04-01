import SessionClient from "./SessionClient";

export default async function SessionPage({ params }: { params: Promise<{ sessionLink: string }> }) {
  const { sessionLink } = await params;
  return <SessionClient sessionLink={sessionLink} />;
}
