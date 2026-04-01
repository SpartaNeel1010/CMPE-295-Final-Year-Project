import LobbyClient from "./LobbyClient";

export default async function LobbyPage({ params }: { params: Promise<{ sessionLink: string }> }) {
  const { sessionLink } = await params;
  return <LobbyClient sessionLink={sessionLink} />;
}
