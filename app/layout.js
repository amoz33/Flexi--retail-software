import "./globals.css";
import AppShell from "./components/AppShell";

export const metadata = {
  title: "Flexi Retail Software",
  description: "Retail management dashboard for Flexi Retail Software"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
