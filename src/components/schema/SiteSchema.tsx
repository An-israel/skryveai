// Site-wide JSON-LD: Organization + WebSite (with SearchAction). Mount once at
// the app root so every page defines Skryve as an entity to Google + AI engines.
import { Helmet } from "react-helmet-async";
import { organizationSchema, websiteSchema } from "./jsonld";

export function SiteSchema() {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify([organizationSchema(), websiteSchema()])}
      </script>
    </Helmet>
  );
}
