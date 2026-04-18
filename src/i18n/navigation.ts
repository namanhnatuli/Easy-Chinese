import { defaultLocale, locales, type AppLocale } from "@/i18n/config";

const publicFilePattern = /\.[^/]+$/;

export function isExternalHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("tel:");
}

export function shouldBypassLocale(pathname: string) {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    publicFilePattern.test(pathname)
  );
}

export function getLocaleFromPathname(pathname: string): AppLocale | null {
  const segments = pathname.split("/");
  const candidate = segments[1];

  return locales.find((locale) => locale === candidate) ?? null;
}

export function stripLocaleFromPathname(pathname: string) {
  const pathnameLocale = getLocaleFromPathname(pathname);

  if (!pathnameLocale) {
    return pathname || "/";
  }

  const strippedPath = pathname.slice(`/${pathnameLocale}`.length);
  return strippedPath.length > 0 ? strippedPath : "/";
}

export function localizePathname(pathname: string, locale: AppLocale) {
  if (!pathname.startsWith("/") || shouldBypassLocale(pathname)) {
    return pathname;
  }

  const basePath = stripLocaleFromPathname(pathname);
  return basePath === "/" ? `/${locale}` : `/${locale}${basePath}`;
}

export function localizeHref(href: string, locale: AppLocale = defaultLocale) {
  if (!href || href.startsWith("#") || isExternalHref(href)) {
    return href;
  }

  const [pathAndQuery, hash = ""] = href.split("#");
  const [pathname = "/", search = ""] = pathAndQuery.split("?");
  const localizedPathname = localizePathname(pathname, locale);
  const searchSuffix = search ? `?${search}` : "";
  const hashSuffix = hash ? `#${hash}` : "";

  return `${localizedPathname}${searchSuffix}${hashSuffix}`;
}

export function replaceLocaleInPathname(pathname: string, locale: AppLocale) {
  const localizedPath = localizePathname(pathname, locale);
  return localizedPath || "/";
}
