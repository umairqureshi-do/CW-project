export const OWNED_BRANDS = ["Cloudways"] as const;
export type OwnedBrand = (typeof OWNED_BRANDS)[number];

export const COMPETITORS = [
  // Original tracked competitors
  "WP Engine",
  "Kinsta",
  "Hostinger",
  "GoDaddy",
  "Bluehost",
  "Pagely",
  "Flywheel",
  // Shared / cPanel hosting
  "SiteGround",
  "InMotion Hosting",
  "GreenGeeks",
  "A2 Hosting",
  "DreamHost",
  "HostGator",
  "IONOS",
  "HostArmada",
  "Ultahost",
  "Verpex",
  "Hostwinds",
  // Enterprise / specialist managed WP
  "Liquid Web",
  "Nexcess",
  "WPX Hosting",
  "Pressable",
  "WPMU DEV",
  // WordPress infrastructure / DevOps tools
  "Pantheon",
  "Convesio",
  "Rocket.net",
  "RunCloud",
  "ServerPilot",
  "Laravel Forge",
  "Ploi",
  "GridPane",
  "xCloud",
  "ServerAvatar",
  // Cloud IaaS
  "Kamatera",
  "ScalaHosting",
  "Vultr",
  "DigitalOcean",
  "Linode",
  "AWS Lightsail",
  // Additional tracked
  "FastComet",
] as const;

export type Competitor = (typeof COMPETITORS)[number];

export const ALL_TRACKED = [...OWNED_BRANDS, ...COMPETITORS] as const;

export const RSS_FEEDS = [
  {
    url: "https://techcrunch.com/feed/",
    publisher: "TechCrunch",
    publisherType: "tech_media",
  },
  {
    url: "https://feeds.feedburner.com/venturebeat/SZYF",
    publisher: "VentureBeat",
    publisherType: "tech_media",
  },
  {
    url: "https://www.theverge.com/rss/index.xml",
    publisher: "The Verge",
    publisherType: "tech_media",
  },
  {
    url: "https://feeds.arstechnica.com/arstechnica/index",
    publisher: "Ars Technica",
    publisherType: "tech_media",
  },
  {
    url: "https://www.zdnet.com/news/rss.xml",
    publisher: "ZDNet",
    publisherType: "tech_media",
  },
  {
    url: "https://www.infoworld.com/feed/",
    publisher: "InfoWorld",
    publisherType: "industry_news",
  },
  {
    url: "https://www.computerworld.com/feed/",
    publisher: "Computerworld",
    publisherType: "industry_news",
  },
  {
    url: "https://feeds.feedburner.com/hostingadvice",
    publisher: "HostingAdvice",
    publisherType: "review_site",
  },
  {
    url: "https://wptavern.com/feed",
    publisher: "WP Tavern",
    publisherType: "saas_blog",
  },
  {
    url: "https://torquemag.io/feed/",
    publisher: "Torque",
    publisherType: "saas_blog",
  },
  {
    url: "https://managewp.org/feed",
    publisher: "ManageWP",
    publisherType: "saas_blog",
  },
  {
    url: "https://www.searchenginejournal.com/feed/",
    publisher: "Search Engine Journal",
    publisherType: "industry_news",
  },
  {
    url: "https://thenextweb.com/feed",
    publisher: "The Next Web",
    publisherType: "tech_media",
  },
  {
    url: "https://hackernoon.com/feed",
    publisher: "Hacker Noon",
    publisherType: "tech_media",
  },
  // Google Alerts — brand-specific Atom feeds
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/2228437757635862885",  publisher: "Google Alerts", publisherType: "general" }, // Cloudways
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/17702283820475088245", publisher: "Google Alerts", publisherType: "general" }, // WP Engine
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/16846067899937266094", publisher: "Google Alerts", publisherType: "general" }, // GreenGeeks
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/17702283820475085630", publisher: "Google Alerts", publisherType: "general" }, // Kinsta
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/1754571513011048904",  publisher: "Google Alerts", publisherType: "general" }, // Hostinger
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/14917229554423877023", publisher: "Google Alerts", publisherType: "general" }, // SiteGround
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/9179689355658573532",  publisher: "Google Alerts", publisherType: "general" }, // Liquid Web
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/16846067899937264593", publisher: "Google Alerts", publisherType: "general" }, // Nexcess
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/8018725089918358462",  publisher: "Google Alerts", publisherType: "general" }, // InMotion Hosting
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/18393098456453489790", publisher: "Google Alerts", publisherType: "general" }, // A2 Hosting
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/11431936065290974706", publisher: "Google Alerts", publisherType: "general" }, // DreamHost
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/12366077734425911289", publisher: "Google Alerts", publisherType: "general" }, // HostGator
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/17771965813151963580", publisher: "Google Alerts", publisherType: "general" }, // HostArmada
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/1832448433921490173",  publisher: "Google Alerts", publisherType: "general" }, // ScalaHosting
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/11431936065290975235", publisher: "Google Alerts", publisherType: "general" }, // IONOS
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/4730335792466047992",  publisher: "Google Alerts", publisherType: "general" }, // Ultahost
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/17771965813151965039", publisher: "Google Alerts", publisherType: "general" }, // Verpex (NOTE: Hostwinds alert had duplicate URL — needs its own alert)
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/13550810994653276425", publisher: "Google Alerts", publisherType: "general" }, // GridPane
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/15964036854859774883", publisher: "Google Alerts", publisherType: "general" }, // Convesio
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/13550810994653275897", publisher: "Google Alerts", publisherType: "general" }, // ServerPilot
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/8065050870946019853",  publisher: "Google Alerts", publisherType: "general" }, // Laravel Forge
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/13701876721857562223", publisher: "Google Alerts", publisherType: "general" }, // RunCloud
  { url: "https://www.google.com.pk/alerts/feeds/03938556420520649224/15797195666142413940", publisher: "Google Alerts", publisherType: "general" }, // FastComet
];

export const COMPETITOR_SEARCH_TERMS: Record<string, string[]> = {
  // Owned
  Cloudways: ["cloudways"],
  // Original competitors
  "WP Engine": ["wp engine", "wpengine"],
  Kinsta: ["kinsta"],
  Hostinger: ["hostinger"],
  GoDaddy: ["godaddy", "go daddy"],
  Bluehost: ["bluehost", "blue host"],
  Pagely: ["pagely"],
  Flywheel: ["flywheel hosting", "getflywheel", "flywheel managed wordpress"],
  // Shared / cPanel hosting
  SiteGround: ["siteground", "site ground"],
  "InMotion Hosting": ["inmotion hosting", "inmotionhosting", "inmotion web"],
  GreenGeeks: ["greengeeks", "green geeks"],
  "A2 Hosting": ["a2 hosting", "a2hosting"],
  DreamHost: ["dreamhost", "dream host"],
  HostGator: ["hostgator", "host gator"],
  IONOS: ["ionos", "1&1 ionos", "1and1"],
  HostArmada: ["hostarmada", "host armada"],
  Ultahost: ["ultahost"],
  Verpex: ["verpex"],
  Hostwinds: ["hostwinds", "host winds"],
  // Enterprise / specialist managed WP
  "Liquid Web": ["liquid web", "liquidweb"],
  Nexcess: ["nexcess"],
  "WPX Hosting": ["wpx hosting", "wpx.net"],
  Pressable: ["pressable"],
  "WPMU DEV": ["wpmu dev", "wpmudev", "wpmu"],
  // WordPress infrastructure / DevOps tools
  Pantheon: ["pantheon systems", "pantheon.io", "getpantheon"],
  Convesio: ["convesio"],
  "Rocket.net": ["rocket.net", "rocketnet"],
  RunCloud: ["runcloud", "run cloud"],
  ServerPilot: ["serverpilot", "server pilot"],
  "Laravel Forge": ["laravel forge", "forge by laravel"],
  Ploi: ["ploi.io", " ploi "],
  GridPane: ["gridpane", "grid pane"],
  xCloud: ["xcloud", "x cloud hosting"],
  ServerAvatar: ["serveravatar", "server avatar"],
  // Cloud IaaS
  Kamatera: ["kamatera"],
  ScalaHosting: ["scalahosting", "scala hosting"],
  Vultr: ["vultr"],
  DigitalOcean: ["digitalocean", "digital ocean"],
  Linode: ["linode", "akamai cloud"],
  "AWS Lightsail": ["aws lightsail", "amazon lightsail", "lightsail"],
  FastComet: ["fastcomet", "fast comet"],
};

// Keywords that indicate an article is about web hosting / cloud infrastructure.
// An article must match at least one of these to be considered relevant.
const HOSTING_CONTEXT_KEYWORDS = [
  "hosting", "hosted", "web host", "host provider",
  "server", "vps", "dedicated server", "bare metal",
  "cloud platform", "cloud infrastructure", "cloud computing", "cloud server",
  "managed wordpress", "wordpress host", "managed host",
  "cpanel", "plesk", "whm", "directadmin",
  "domain", "ssl", "tls certificate", "bandwidth", "uptime", "sla",
  "datacenter", "data center", "colocation",
  "cdn", "content delivery",
  "deploy", "deployment", "infrastructure",
  "migration", "migrat",
  "nginx", "apache", "php", "mysql", "mariadb",
  "droplet", "lightsail", "linode", "kamatera",
  "devops", "kubernetes", "container", "docker",
  "scalab", "autoscal",
  "caching", "cache",
  "site speed", "page speed", "performance hosting",
  "web application", "web app",
  "shared hosting", "reseller hosting",
  "wordpress site", "wp site",
];

/**
 * Returns true if the article text contains at least one hosting-related keyword.
 * Used as a fast pre-filter before sending articles to AI analysis.
 */
export function isHostingRelated(text: string): boolean {
  const lower = text.toLowerCase();
  return HOSTING_CONTEXT_KEYWORDS.some((kw) => lower.includes(kw));
}

export function detectCompetitors(text: string): string[] {
  const lowerText = text.toLowerCase();
  const found: string[] = [];

  for (const [competitor, terms] of Object.entries(COMPETITOR_SEARCH_TERMS)) {
    if (terms.some((term) => lowerText.includes(term))) {
      found.push(competitor);
    }
  }

  return found;
}

export function getCompetitorSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}
