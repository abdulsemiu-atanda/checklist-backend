import marked from 'marked'

class EmailBuilder {
  #config
  #paragraphs
  #signature

  constructor(options = {}, paragraphs = []) {
    const {signature = true, ...config} = options

    this.#signature = signature
    this.#config = {from: process.env.SMTP_USERNAME, ...config}
    this.#paragraphs = paragraphs
  }

  #toHtml(paragraph) {
    return marked.parse(paragraph)
  }

  build() {
    const signatureText = this.#signature ? 'Thank you!' : ''
    const html = `
      <body>
        ${this.#paragraphs.reduce((html, paragraph) => `${html}${this.#toHtml(paragraph)}`, '')}
        <p>${signatureText}</p>
      </body>
    `
    const text = `${this.#paragraphs.reduce((text, paragraph) => `${text}${paragraph}\n`, '')}${signatureText}`

    return {
      ...this.#config,
      html,
      text
    }
  }
}

export default EmailBuilder
