import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass, Container } from "@/components/ui";
import fr from "@/dictionaries/fr";
import "./globals.css";

export const metadata: Metadata = { title: `${fr.notFound.title} | ${fr.meta.siteName}`, robots: { index: false } };

// Unmatched URLs carry no language, so the French copy is followed by English.
export default function GlobalNotFound() {
  return (
    <html lang="fr-CA">
      <body>
        <main>
          <Container className="py-24">
            <p className="font-display text-2xl text-forest-deep">{fr.meta.siteName}</p>
            <h1 className="mt-8 text-4xl">{fr.notFound.title}</h1>
            <p className="mt-3 text-lg text-muted">{fr.notFound.body}</p>
            <p className="mt-1 text-muted" lang="en-CA">
              Page not found. This page doesn&apos;t exist or has moved.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/fr" className={buttonClass("primary", "lg")}>
                {fr.notFound.home}
              </Link>
              <Link href="/en" lang="en-CA" className={buttonClass("secondary", "lg")}>
                English
              </Link>
            </div>
          </Container>
        </main>
      </body>
    </html>
  );
}
