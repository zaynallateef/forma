export default function Privacy() {
  return (
    <article className="wrap page-section prose">
      <span className="eyebrow">PRIVATE BY DESIGN</span>
      <h1>
        Your files.<em> Your business.</em>
      </h1>
      <p>
        Forma’s conversion and organization tools process documents in your
        browser. Files are not uploaded or saved to an account.
      </p>
      <h2>What stays on your device</h2>
      <p>
        Uploaded files, previews, and generated outputs are held in browser
        memory while the workspace is open. Resetting the workspace or closing
        the page releases those references. Downloads remain wherever you choose
        to save them.
      </p>
      <h2>What the website requests</h2>
      <p>
        The browser downloads application code, fonts, and the PDF worker from
        the hosting origin, including local OCR language models. The hosting
        provider may receive ordinary connection metadata such as IP addresses
        and request timestamps. Forma includes no analytics or advertising
        scripts.
      </p>
      <h2>Local OCR</h2>
      <p>
        OCR and PDF text extraction run on your device. English and Arabic
        recognition models load from this website. Document formatting, receipt
        tables, and exports are also created locally. Forma does not transmit,
        log, or persist your document text.
      </p>
      <h2>Practical limits</h2>
      <p>
        Local processing is not a guarantee against browser extensions,
        compromised devices, or sensitive data in downloads. Use a trusted
        browser and take care when sharing exported files. Editing signed PDFs
        invalidates their signatures. Forma is not a redaction tool.
      </p>
    </article>
  );
}
