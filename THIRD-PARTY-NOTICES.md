# Third-party notices — 穹野坐标 0.4.0

Project application code and its independently authored C wrapper, line geometry, recommendation rules, Chinese interpretations and procedural globe rendering are provided under **AGPL-3.0-only**. Third-party components retain the terms below. Source availability does not imply endorsement. The runtime inventory is `runtime-provenance.json`.

## Swiss Ephemeris — AGPL v3 selected

Copyright Astrodienst AG, Dieter Koch and Alois Treindl; retain the exact notices in upstream files. Swiss Ephemeris offers AGPL and professional licensing. This project selects **AGPL-3.0-only**, not a paid professional license.

- Official repository: https://github.com/aloistr/swisseph
- Terms: https://www.astro.com/swisseph/swephinfo_e.htm
- Version: 2.10.03; pinned commit `91339e55d2351f32548d8a8d5bca6aa93b4f6da7`.
- Full official inputs, original notices and ephemeris data: `third_party/swisseph/`.
- Provenance: `third_party/swisseph/provenance.json`; full AGPL text: root `LICENSE`.
- Modifications: no changes to upstream source files. Project-authored wrapper `native/swiss-wrapper.c`, build configuration and WeChat instantiation adapter connect official code to the application. Ephemeris `.se1` files are renamed `.bin` for packaging and are not altered.
- The generated `qy-swisseph.js/.wasm` are built by this project from those official inputs; they are not copied from the StarMapper website. `vendor-manifest.json` records compiler, command and hashes.

When distributing the program or offering covered network interaction, comply with the relevant AGPL provisions, including corresponding source. The project includes source/build inputs and a visible license/source entry. A local source archive alone is not a public source offer; `source-release.json` identifies the matching public source release. Do not imply that Astrodienst has reviewed or approved this product.

## Emscripten and standard runtime support

The build uses official **Emscripten SDK 4.0.15**, installed from https://github.com/emscripten-core/emsdk at its 4.0.15 tag. Its toolchain build ID is `b412b6307e541b93dd93f01b61181e15c17302ec`; emcc reports revision `09f52557f0d48b65b8c724853ed8f4e8bf80e669`.

The compiler, standard library and generated JavaScript support are used without upstream modifications. Applicable notices are preserved in `miniprogram/licenses/Emscripten.txt`, `compiler-rt.txt` and `musl.txt`. The Emscripten license offers MIT and University of Illinois/NCSA terms; individual runtime files retain their own notices. Rebuilding instructions and the pinned official SDK let recipients obtain the same unmodified toolchain. No Three.js library or website JavaScript runtime is bundled.

## GeoNames — CC BY 4.0

Contains modified **GeoNames** data, https://www.geonames.org/, licensed under **Creative Commons Attribution 4.0 International**: https://creativecommons.org/licenses/by/4.0/ . Full terms are included in `miniprogram/licenses/CC-BY-4.0.txt`.

`third_party/geonames/manifest.json` records the September 2026 official cities5000 and administrative-name source URLs and checksums. The included `cities.json.gz` is the previously prepared 69,705-row catalog, with its own hash. Application changes include field selection, JSON encoding, Chinese aliases, 4,412-city offline subset, an independently selected 891-city recommendation subset, and decorative globe endpoints/city dots. These changes do not claim endorsement or accuracy guarantees from GeoNames. City points approximate city centers.

## Natural Earth — public domain

Land outlines are Natural Earth **1:110m land**, in the public domain: https://www.naturalearthdata.com/about/terms-of-use/ . Original GeoJSON, URL and SHA-256 are included in `third_party/natural-earth/`.

The project rounds coordinates to three decimals, omits holes for overview drawing, and uses exterior rings to produce a navy/gold procedural globe surface. Decorative lights are generated from city coordinates. No original website texture, satellite night-light image or topographic image is included. The overview does not depict administrative borders or provide navigation accuracy.

## IANA time-zone data

Civil-time offsets are precomputed from IANA time-zone data for the supported dates. IANA specifies that files other than individually identified exceptions are public domain. Its complete notice is preserved in `miniprogram/licenses/IANA.txt`; source: https://www.iana.org/time-zones and https://data.iana.org/time-zones/tzdb/LICENSE .

The fixed generated transition table is shipped as data and included in source. `scripts/prepare-locations.py` can regenerate it from Python's configured zoneinfo database. Doing so with another database version is a data update, not a byte-identical build requirement. No IANA utility source code is included.

## Public-figure examples and other references

The application contains only concise factual birth metadata and independently phrased source notes for Bruce Lee and Yao Ming:

- https://www.astro.com/astro-databank/Lee,_Bruce — AA rating, record cites birth-certificate evidence.
- https://www.astro.com/astro-databank/Ming,_Yao — B rating, record cites Brook Larmer, *Operation Yao Ming*, Penguin 2005.

The application does not reproduce source chart images, portraits, full biographies or Astro-Databank's database. These references are **not** a claim that the entire site, its database or the book is licensed for unrestricted reuse. Original birth certificates and the book were not independently inspected. Source precision and the rating remain visible in the app; calculated decimal precision does not improve birth-time evidence.

WeChat API typings were consulted as interface documentation; no SDK implementation from those references is included. Normal operating-system fonts and Unicode emoji are rendered by the platform; no external font file is bundled. The backend avatar was independently generated for this project and is not a runtime asset or included in this source archive.

## Excluded historical material

The old 0.3.2 package, original website extracts, original globe textures and earlier unknown-build WASM are retained separately in a private historical backup. They are excluded from the 0.4.0 runtime and source archive. No permission to redistribute starmapper.com material is asserted, and this project's AGPL license cannot relicense those excluded materials.
