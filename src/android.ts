// The page's one script. A card for an Android app is prerendered to open the app's release page, which suits any
// device, and only Android, which can install it, is switched to download the APK itself. A browser running no script
// keeps the release page, an extra tap away from the download, rather than taking a download it has no use for.
//
// `userAgentData` is Chromium's, and Firefox and Safari carry the platform only in the `User-Agent` string.
const { userAgentData } = navigator as Navigator & { userAgentData?: { platform: string } };

if (userAgentData?.platform === 'Android' || /\bAndroid\b/.test(navigator.userAgent)) {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-android-href]')) {
    link.href = link.dataset.androidHref ?? link.href;
    link.setAttribute('aria-label', link.dataset.androidLabel ?? link.getAttribute('aria-label') ?? '');
  }
}
