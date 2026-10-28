import { createElement } from "react";
import type { IconType } from "react-icons";
import { FaLinkedin, FaSalesforce, FaSlack } from "react-icons/fa6";
import {
  SiAirtable,
  SiAsana,
  SiAtlassian,
  SiBitbucket,
  SiBox,
  SiCalendly,
  SiClickup,
  SiDiscord,
  SiDropbox,
  SiFacebook,
  SiFigma,
  SiGithub,
  SiGitlab,
  SiGmail,
  SiGoogle,
  SiGooglecalendar,
  SiGoogledrive,
  SiHubspot,
  SiInstagram,
  SiIntercom,
  SiJira,
  SiLinear,
  SiMailchimp,
  SiMeta,
  SiMiro,
  SiNotion,
  SiPaypal,
  SiPinterest,
  SiQuickbooks,
  SiReddit,
  SiShopify,
  SiSpotify,
  SiSquare,
  SiStripe,
  SiTiktok,
  SiTodoist,
  SiTrello,
  SiTwitch,
  SiTypeform,
  SiVimeo,
  SiWebflow,
  SiWordpress,
  SiX,
  SiXero,
  SiYoutube,
  SiZendesk,
  SiZoho,
  SiZoom,
} from "react-icons/si";
import { slugify } from "@/lib/guide";
import { cn } from "@/lib/utils";

const LOGOS: Record<string, IconType> = {
  airtable: SiAirtable,
  asana: SiAsana,
  atlassian: SiAtlassian,
  bitbucket: SiBitbucket,
  box: SiBox,
  calendly: SiCalendly,
  clickup: SiClickup,
  discord: SiDiscord,
  dropbox: SiDropbox,
  facebook: SiFacebook,
  figma: SiFigma,
  github: SiGithub,
  gitlab: SiGitlab,
  gmail: SiGmail,
  google: SiGoogle,
  "google-calendar": SiGooglecalendar,
  "google-drive": SiGoogledrive,
  hubspot: SiHubspot,
  instagram: SiInstagram,
  intercom: SiIntercom,
  jira: SiJira,
  linear: SiLinear,
  linkedin: FaLinkedin,
  mailchimp: SiMailchimp,
  meta: SiMeta,
  miro: SiMiro,
  notion: SiNotion,
  paypal: SiPaypal,
  pinterest: SiPinterest,
  quickbooks: SiQuickbooks,
  reddit: SiReddit,
  salesforce: FaSalesforce,
  shopify: SiShopify,
  slack: FaSlack,
  spotify: SiSpotify,
  square: SiSquare,
  stripe: SiStripe,
  tiktok: SiTiktok,
  todoist: SiTodoist,
  trello: SiTrello,
  twitch: SiTwitch,
  twitter: SiX,
  typeform: SiTypeform,
  vimeo: SiVimeo,
  webflow: SiWebflow,
  wordpress: SiWordpress,
  x: SiX,
  xero: SiXero,
  youtube: SiYoutube,
  zendesk: SiZendesk,
  zoho: SiZoho,
  zoom: SiZoom,
};

function logoFor(name: string): IconType | undefined {
  const slug = slugify(name);
  return LOGOS[slug] ?? LOGOS[slug.split("-")[0]];
}

export function AppLogo({ name, className }: { name: string; className?: string }) {
  const Logo = logoFor(name);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary text-[11px] text-foreground",
        className,
      )}
    >
      {Logo ? (
        createElement(Logo, { className: "size-[62%]" })
      ) : (
        <span className="leading-none font-semibold">{name.trim().charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}
