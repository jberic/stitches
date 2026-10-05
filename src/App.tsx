import { Tool } from './components/Tool'
import './App.css'

export default function App() {
  return (
    <div className="page">
      <header className="masthead">
        <h1 className="wordmark">Say It In Stitches</h1>
        <p className="tagline">Type a phrase, get a cross-stitch pattern.</p>
      </header>

      <main>
        <Tool />
      </main>

      <footer className="colophon">
        <p>
          Colour data: <a href="https://github.com/makebead/craft-color-codes">craft-color-codes</a> by MakeBead (CC
          BY 4.0). Not affiliated with any thread maker.
        </p>
      </footer>
    </div>
  )
}
