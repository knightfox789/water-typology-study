# Gujarat water typology

An interactive edition of **Building Informed and Scalable Water Security Solutions for
Gujarat**, Development Support Centre's 2020–22 study of water security across Gujarat's
seven regions and 33 districts (Development Support Centre, Ahmedabad, 2023; supported by
Hindustan Unilever Foundation, in collaboration with DSC Foundation, ACWADAM and INREM
Foundation).

- `index.html` — the story: the seven regions, a guided tour of the study's findings, a
  flowchart from what was measured to what is recommended, the research team and credits.
- `explorer.html` — every district: water balance, crops, groundwater, fieldwork and the
  study's recommendations, with the source and year of every figure and a one-page brief
  to print.
- `data/` — the figures behind the pages, as JSON.

**Live site:** https://knightfox789.github.io/water-typology-study/

Every page is a single self-contained file; there is nothing to build or install.

## Publish with GitHub Pages

1. Put these files at the top level of the repository's `main` branch (upload the
   contents of this folder, not the folder itself). In the browser: **Add file >
   Upload files**, drag in everything including the `data` and `fonts` folders, and
   commit.
2. Open **Settings > Pages**. Under **Build and deployment**, choose **Deploy from a
   branch**, then branch **main** and folder **/ (root)**, and save.
3. After a minute or two the site is live at https://knightfox789.github.io/water-typology-study/.
   A custom domain can be added on the same Settings page.

The site is public once Pages is on. `.nojekyll` tells GitHub to serve the files as they
are; `404.html` is shown for any address that does not exist.

## Updating

The pages are built from the study's data in the project folder
(`pipeline/`, steps 01 to 11, then 03). Run `pipeline/12_package_github.py` and replace
the files here with the new contents of `release/github-pages/`.

## How to cite

Development Support Centre (2023). Building Informed and Scalable Water Security Solutions
for Gujarat. Ahmedabad: Development Support Centre.

## Licence

The text, figures and data of this interactive edition are shared under the Creative
Commons Attribution 4.0 International licence (CC BY 4.0); see `LICENCE.txt`. The
typefaces Rasa and Anek Gujarati are used under the SIL Open Font License (`fonts/`).

Designed by Kaushal Gadariya.
