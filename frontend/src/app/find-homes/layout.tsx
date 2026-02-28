import Navbar from "@/components/layout/Navbar";

export default function FindHomesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar variant="sticky" />
      {children}
    </>
  );
}
