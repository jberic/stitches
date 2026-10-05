#!/bin/sh
# Cuts large display fonts down to Latin characters. Needs fonttools:
#   python3 -m pip install --user fonttools
# Only fonts without a Reserved Font Name may be subset under the OFL
# (Chango and IBM Plex reserve their names, so they stay unmodified).
set -e
cd "$(dirname "$0")/.."

LATIN="U+0020-007E,U+00A0-00FF,U+0100-017F,U+2010-2027,U+2030-203A,U+20AC"

subset() {
  src="$1"
  tmp="$src.subset"
  python3 -m fontTools.subset "$src" --unicodes="$LATIN" --layout-features='*' --output-file="$tmp"
  mv "$tmp" "$src"
}

subset public/fonts/bagelfatone/BagelFatOne-Regular.ttf
