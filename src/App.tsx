import { DISPLAY_FONTS } from './fonts'
import './App.css'

// Step 1 placeholder. The specimen is a temporary check that every display
// font loads and renders; it goes away when the tool arrives in step 2.
export default function App() {
  return (
    <main className="page">
      <h1 className="wordmark">Say It In Stitches</h1>
      <p className="lede">Type a phrase, get a cross-stitch pattern. Coming soon.</p>

      <section className="specimen" aria-labelledby="specimen-title">
        <h2 id="specimen-title">Pattern fonts</h2>
        <ul>
          {DISPLAY_FONTS.map((font) => (
            <li key={font}>
              <span className="specimen-sample" style={{ fontFamily: `"${font}"` }}>
                Hello sunshine!
              </span>
              <span className="specimen-name">{font}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
