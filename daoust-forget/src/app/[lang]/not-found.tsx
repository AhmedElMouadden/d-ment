import Link from "next/link";
import { buttonClass, Container } from "@/components/ui";
import fr from "@/dictionaries/fr";

// Rendered inside the [lang] layout when a page calls notFound() (e.g. an
// unknown branch slug). not-found receives no params, so it is bilingual.
export default function NotFound() {
  return (
    <Container className="py-24">
      <h1 className="text-4xl">{fr.notFound.title}</h1>
      <p className="mt-3 text-lg text-muted">{fr.notFound.body}</p>
      <p className="mt-1 text-muted" lang="en-CA">Page not found. This page doesn&apos;t exist or has moved.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/fr" className={buttonClass("primary", "lg")}>{fr.notFound.home}</Link>
        <Link href="/fr/succursales" className={buttonClass("secondary", "lg")}>{fr.nav.findCta}</Link>
      </div>
    </Container>
  );
}
