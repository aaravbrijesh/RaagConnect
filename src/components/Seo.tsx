import { Helmet } from "react-helmet-async";

const SITE = "https://raagconnect.com";
const DEFAULT_IMAGE = `${SITE}/og-image.jpg`;

interface SeoProps {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  jsonLd?: Record<string, unknown>;
  noindex?: boolean;
}

export default function Seo({ title, description, path, image, jsonLd, noindex }: SeoProps) {
  const url = `${SITE}${path}`;
  const img = image && image.startsWith("https://") ? image : DEFAULT_IMAGE;
  const desc = description.slice(0, 160);
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
      {noindex && <meta name="robots" content="noindex" />}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}
