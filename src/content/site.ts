/**
 * What the site says about itself, in one place: the About panel shows the
 * questions and answers, and the build puts the same words into index.html
 * (for search engines and AI assistants that don't run the app) and llms.txt.
 */

export const SITE = {
  name: 'Say It With Stitches',
  url: 'https://sayitwithstitches.com/',
  /** About 60 characters, so search results show it whole. */
  title: 'Free Cross-Stitch Pattern Maker for Words | Say It With Stitches',
  description:
    'Type a word, name or phrase and get a free cross-stitch pattern in 37 lettering styles. Pick thread colors and fabric, then download the chart.',
  headline: 'Free cross-stitch pattern maker for words, names and phrases',
  summary:
    'Say It With Stitches turns your own words into a cross-stitch pattern. Type a word, name or short phrase on the fabric and it is stitched as you type. Pick one of 37 lettering styles, choose your thread colors and fabric, and download the chart with a thread key. It is free, with no sign-up.',
  maker: { name: 'Jennie Bertino', url: 'https://bertino.co' },
}

export const FEATURES = [
  'Turns any word, name or phrase of up to four words into a cross-stitch chart, live as you type',
  '37 lettering styles: 34 cross-stitch alphabets drawn stitch by stitch, and three bold display fonts',
  'Thread colors snap to the closest DMC stranded cotton color, with codes, names and stitch counts',
  'Finished size for 11, 14, 16 and 18-count Aida, and a pattern up to 180 stitches wide',
  'Download a PNG chart with symbols, 10-stitch guide lines, row and column numbers and a thread key',
  'Works in any browser, on a computer or a phone; free, with no sign-up and nothing to install',
]

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Is Say It With Stitches free?',
    a: "Yes. It's free to use, with no sign-up and nothing to install. Type your words, pick a style and download the chart.",
  },
  {
    q: 'How do I make a cross-stitch pattern from text?',
    a: 'Click the fabric and type up to four words. Choose a lettering style, your thread colors, the fabric count and the width in the toolbar, then press Download to save a PNG chart with a thread key.',
  },
  {
    q: 'Which thread colors does it use?',
    a: "Every color snaps to the closest DMC stranded cotton color, and the chart lists each thread's code, name and stitch count. Screen colors are approximate, so check them against a physical thread card.",
  },
  {
    q: 'How big will the finished piece be?',
    a: 'The thread key shows the finished size on 11, 14, 16 or 18-count Aida. Drag Width to make the pattern bigger, up to 180 stitches wide.',
  },
  {
    q: 'Which lettering styles are there?',
    a: 'There are 37: 34 cross-stitch alphabets drawn stitch by stitch, from Block and Sampler to Delft, Fraktur, Blackwork and Copperplate, and three bold display fonts. Typography previews each one with your own words.',
  },
  {
    q: 'Does it work on a phone?',
    a: 'Yes. Type on the fabric and open Adjust for the settings. For long words, turn your phone sideways to see them bigger.',
  },
]
