# Bruno — unofficial fork

[Русский README](readme.md) · [Download](https://github.com/ArtimTikhonov/bruno-clean/releases/latest) · [Changelog](CHANGELOG.md)

An independently maintained fork of [Bruno](https://github.com/usebruno/bruno) by
[ArtimTikhonov](https://github.com/ArtimTikhonov), with Russian UI, optional English IT terminology,
and no AI features or paid-feature promotions. This is not an official Bruno release and is not
affiliated with Bruno Software Inc.

## What changes

- Russian is the default UI language; English remains available.
- A separate preference keeps common labels such as Headers, Body, Query Params, Token, Proxy and Cache in English.
- AI chat, generation, autocomplete, IPC handlers and provider SDKs are removed.
- Golden Edition promotions and the upstream remote announcement feed are removed.
- Request/response contents, URLs, variable names and code remain untouched by localization.
- The application is named Bruno. Its internal identity remains stable to preserve settings.

This fork uses the open-source codebase. It does not unlock proprietary modules or promise
feature parity with Pro or Ultimate. No workspace-count or monthly OpenAPI-sync quota was found in the
reviewed handlers; this is not a blanket claim that the application has no technical limits.

## Install

Download the latest [release](https://github.com/ArtimTikhonov/bruno-clean/releases/latest):

| Platform | Artifact |
| --- | --- |
| Windows x64 | `bruno_X.Y.Z_x64_setup.exe` |
| Linux x64 | `bruno_X.Y.Z_x86_64_linux.AppImage` |

Run the Windows installer, or make the AppImage executable with `chmod +x` and launch it.
Each release includes `SHA256SUMS.txt`. Windows installers are unsigned; macOS and ARM64 releases
are not currently provided by this fork.

Select the UI language and terminology under **Preferences → General → Language**, then restart.
English IT terminology is off by default and uses a curated set of UI labels.

## Development and releases

Use the Node.js version in [.nvmrc](.nvmrc), then run `npm run setup` and `npm run dev`.
See the Russian [build guide](docs/fork/building.md), [contribution guide](contributing.md)
and [versioning policy](docs/fork/versioning.md) for exact commands.

From 2.1.0 onwards, this fork uses independent semantic versions. Desktop package versions,
lockfile entries, the Git tag `fork-vX.Y.Z` and release artifacts must agree. Shared packages keep their
upstream versions. Main-branch builds are CI artifacts; version tags publish releases after
Linux startup and Windows installation/startup checks pass. Legacy `clean-build-N` releases are preserved.

## Credits

Original source copyright: Anoop M D, Anusree P S and Contributors, under [MIT](license.md).
Bruno is a trademark of Anoop M D. Retained OpenMoji artwork is licensed under CC BY-SA 4.0.
See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
