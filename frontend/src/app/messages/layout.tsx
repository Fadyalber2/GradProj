import Navbar from "@/components/layout/Navbar";

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar variant="sticky" />
      <div className="flex overflow-hidden h-[calc(100vh-4rem)]">{children}</div>
    </>
  );
}
