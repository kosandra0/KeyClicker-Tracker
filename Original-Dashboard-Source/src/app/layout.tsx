import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProvider } from "@/hooks/app-context";
import { RangeProvider } from "@/hooks/range-context";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "KeyScope — Input Activity Analytics",
  description: "Local, privacy-first keyboard and mouse activity analytics.",
};

const themeScript = `(function(){try{var t=JSON.parse(localStorage.getItem('ks_theme')||'"system"');var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');var r=JSON.parse(localStorage.getItem('ks_radius')||'"round"');document.documentElement.setAttribute('data-radius',r);}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppProvider>
          <RangeProvider>
            <Shell>{children}</Shell>
          </RangeProvider>
        </AppProvider>
      </body>
    </html>
  );
}
