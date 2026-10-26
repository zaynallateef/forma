import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  LockKeyhole,
  Zap,
  Heart,
  FileText,
  ArrowDown,
} from "lucide-react";
import { Dropzone } from "../components/upload/Dropzone";
import { ToolCard } from "../components/ToolCard";
import { tools } from "../lib/tools";
import { validateFile, detectFormat } from "../lib/validation";
export default function Home({
  setPending,
}: {
  setPending: (files: File[]) => void;
}) {
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  async function upload(files: File[]) {
    try {
      const detected = detectFormat(
        new Uint8Array(await files[0].slice(0, 16).arrayBuffer()),
      );
      const format = await validateFile(files[0], detected !== "pdf");
      const images = format !== "pdf";
      await Promise.all(files.map((file) => validateFile(file, images)));
      setPending(files);
      navigate(
        `/tools/${images ? "images-to-pdf" : files.length > 1 ? "merge-pdf" : "organize-pdf"}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to open these files.");
    }
  }
  return (
    <>
      <section className="hero wrap">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="eyebrow">
            <span className="tiny-dot" /> YOUR ALL-IN-ONE DOCUMENT TOOLKIT
          </div>
          <h1>
            Documents made <em>simple.</em>
          </h1>
          <p className="hero-copy">
            Convert, organize, and transform your files with powerful tools.
            <br className="desktop-break" /> Fast, secure, and effortless.
          </p>
        </motion.div>
        <div className="hero-upload">
          <div className="paper-decoration paper-left" aria-hidden="true">
            <FileText />
            <span>less paperwork.</span>
            <i />
            <i />
            <i />
          </div>
          <Dropzone home onFiles={upload} onError={setError} />
          <div className="paper-decoration paper-right" aria-hidden="true">
            <span>more possibilities.</span>
            <div className="mini-landscape" />
            <i />
            <i />
          </div>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="trust-row">
          <span>
            <LockKeyhole /> Private by design
          </span>
          <span>
            <Zap /> Ready in seconds
          </span>
          <span>
            <Heart /> Free. No account needed.
          </span>
        </div>
      </section>
      <section className="tools-section wrap">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SMALL TOOLS. BIG POSSIBILITIES.</span>
            <h2>A little help for every document.</h2>
          </div>
          <Link className="text-link" to="/tools">
            Explore all tools <ArrowRight size={17} />
          </Link>
        </div>
        <div className="tools-grid">
          {tools.slice(0, 8).map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </section>
      <section className="how-section wrap" id="how-it-works">
        <div className="how-intro">
          <span className="eyebrow">LESS FRICTION. MORE FLOW.</span>
          <h2>
            From file to finished.
            <br />
            <em>Just like that.</em>
          </h2>
          <p>
            No tutorials. No sign-ups.
            <br />
            Just you, your files, and a simpler way.
          </p>
        </div>
        <div className="steps">
          {[
            [
              "01",
              "Make yourself at home",
              "Drop in your PDF or images. We’ll take it from here.",
            ],
            [
              "02",
              "Make it your own",
              "Choose a tool, adjust the details, and preview.",
            ],
            [
              "03",
              "Make your next move",
              "Download your finished file. Get on with your day.",
            ],
          ].map(([n, title, copy]) => (
            <div className="step" key={n}>
              <span>{n}</span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
              {n !== "03" && <ArrowDown className="step-arrow" size={15} />}
            </div>
          ))}
        </div>
      </section>
      <section className="privacy-strip wrap">
        <LockKeyhole size={25} />
        <div>
          <h2>Your documents are your business.</h2>
          <p>
            Conversions happen in your browser. No uploads to a server. No
            account to create.
          </p>
        </div>
        <Link to="/privacy" className="text-link">
          Our privacy approach <ArrowRight size={16} />
        </Link>
      </section>
    </>
  );
}
