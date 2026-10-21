import "./globals.css";
import "./dashboard.css";

export const metadata = {
  title: "Retail Inventory & Sales",
  description: "Retail inventory and sales management dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}