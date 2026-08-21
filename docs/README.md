# UImods GitHub Pages

Publish this folder from the repository's `main` branch `/docs` path.

Site URL:
https://uimods.github.io/AppsWidgets/

The website displays the same banner and preview images already stored in the repository under `release-images/` and reads the existing public GitHub release with tag `Apps`.

It automatically finds and updates download links for the three public APKs and four protected card downloads:

- CurrentWeather.apk
- WeatherVisualsWidget.apk
- DynamicWalls.apk
- KWGT-SoundCloudPlayer-Protected.zip
- KWGTRetroPlayer-Protected.zip
- Other-Widgets-Protected.zip
- VinylRetroPlayer-Protected.zip

The release metadata is checked automatically when the page opens and every 5 minutes while the page remains open. There is no manual Refresh button.

The protected cards require a fresh password entry for each download attempt. The browser checks a salted PBKDF2-SHA-256 value with Web Crypto and does not persist the password. This client-side check is only a user-interface gate: actual protection comes from removing each raw restricted APK and publishing only its individually AES-256-encrypted ZIP archive.

Normal future replacements in the existing `Apps` release do not require editing the website, as long as the stable public APK and protected archive asset names are kept.
