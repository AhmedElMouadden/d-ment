"use client";

import { buttonClass, Container } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <Container className="py-24">
      <h1 className="text-4xl">Une erreur est survenue</h1>
      <p className="mt-3 text-lg text-muted">Réessayez dans un moment.</p>
      <p className="mt-1 text-muted" lang="en">Something went wrong. Please try again shortly.</p>
      <button type="button" onClick={reset} className={`${buttonClass("primary", "lg")} mt-8`}>
        Réessayer / Try again
      </button>
    </Container>
  );
}
