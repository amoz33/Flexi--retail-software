import Script from "next/script";
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

        {/* tawk.to live chat widget — Property ID: 5c31e68e82491369baa0afd9, Widget: default */}
        <Script id="tawk-to-widget" strategy="afterInteractive">
          {`
            var Tawk_API = Tawk_API || {};
            var Tawk_LoadStart = new Date();
            (function () {
              var s1 = document.createElement("script"),
                s0 = document.getElementsByTagName("script")[0];
              s1.async = true;
              s1.src = "https://embed.tawk.to/5c31e68e82491369baa0afd9/default";
              s1.charset = "UTF-8";
              s1.setAttribute("crossorigin", "*");
              s0.parentNode.insertBefore(s1, s0);
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
