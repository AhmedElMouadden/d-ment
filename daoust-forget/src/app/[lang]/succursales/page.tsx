import { BranchFinder } from "@/components/branch-finder";
import { Container, PageHeader } from "@/components/ui";
import { visibleBranches } from "@/lib/data";
import { hasLocale } from "@/lib/i18n";
import { getDictionary } from "@/dictionaries";
import { resolveLang } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/succursales">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = getDictionary(lang);
  return pageMetadata({
    lang,
    route: "locations",
    title: dict.finder.title,
    description:
      lang === "fr"
        ? "Trouvez la succursale Daoust/Forget la plus proche : adresse, heures, téléphone, itinéraire et services offerts."
        : "Find the nearest Daoust/Forget branch: address, hours, phone, directions and services offered.",
  });
}

export default async function LocationsPage({ params }: PageProps<"/[lang]/succursales">) {
  const { lang, dict } = await resolveLang(params);
  return (
    <>
      <PageHeader title={dict.finder.title} lead={dict.finder.lead} />
      <Container className="py-10 sm:py-14">
        <BranchFinder
          lang={lang}
          dict={{ branch: dict.branch, finder: dict.finder, preview: dict.preview, a11y: dict.a11y }}
          branches={visibleBranches()}
          geocoding={Boolean(process.env.MAPBOX_ACCESS_TOKEN)}
          placement="locations"
          listAll
          syncUrl
        />
      </Container>
    </>
  );
}
