#!/bin/sh
# Makes the WOFF2 web fonts the site loads, from the TTF sources in design/fonts/web/.
# Needs fonttools and brotli:
#   python3 -m pip install --user fonttools brotli
# Only fonts without a Reserved Font Name may be changed under the OFL, so
# IBM Plex is left out and shipped exactly as IBM publishes it.
set -e
cd "$(dirname "$0")/.."

# Latin, Latin-1, Latin Extended-A, typographic punctuation and the euro sign.
LATIN="U+0020-007E,U+00A0-00FF,U+0100-017F,U+2010-2027,U+2030-203A,U+20AC"

woff2() {
  src="design/fonts/web/$1"
  out="public/fonts/$2"
  python3 -m fontTools.subset "$src" --unicodes="$LATIN" --layout-features='*' --flavor=woff2 --output-file="$out"
}

woff2 Fraunces-Variable.ttf fraunces/Fraunces-Variable.woff2
woff2 Shrikhand-Regular.ttf shrikhand/Shrikhand-Regular.woff2
woff2 BagelFatOne-Regular.ttf bagelfatone/BagelFatOne-Regular.woff2
woff2 RubikMonoOne-Regular.ttf rubikmonoone/RubikMonoOne-Regular.woff2
