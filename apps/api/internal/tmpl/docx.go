package tmpl

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"io"
	"strings"
	"time"
)

// WriteDOCX writes a minimal, deterministic Office Open XML document.
func WriteDOCX(w io.Writer, d Document) error {
	zw := zip.NewWriter(w)
	files := []struct{ name, body string }{
		{"[Content_Types].xml", contentTypes},
		{"_rels/.rels", rootRels},
		{"word/_rels/document.xml.rels", docRels},
		{"word/styles.xml", stylesXML},
		{"docProps/core.xml", coreXML(d.Title)},
		{"word/document.xml", documentXML(d)},
	}
	epoch := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	for _, f := range files {
		fw, err := zw.CreateHeader(&zip.FileHeader{Name: f.name, Method: zip.Deflate, Modified: epoch})
		if err != nil {
			return err
		}
		if _, err := io.WriteString(fw, f.body); err != nil {
			return err
		}
	}
	return zw.Close()
}

func esc(s string) string {
	var b bytes.Buffer
	_ = xml.EscapeText(&b, []byte(s))
	return b.String()
}

// runs converts text with newlines into <w:r> runs separated by breaks.
func runs(text string, bold bool) string {
	var b strings.Builder
	rpr := ""
	if bold {
		rpr = "<w:rPr><w:b/></w:rPr>"
	}
	for i, line := range strings.Split(text, "\n") {
		b.WriteString("<w:r>" + rpr)
		if i > 0 {
			b.WriteString("<w:br/>")
		}
		b.WriteString(`<w:t xml:space="preserve">` + esc(line) + "</w:t></w:r>")
	}
	return b.String()
}

func para(style, text string, bold bool) string {
	return `<w:p><w:pPr><w:pStyle w:val="` + style + `"/></w:pPr>` + runs(text, bold) + "</w:p>"
}

func documentXML(d Document) string {
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
		`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>`)
	for _, blk := range d.Blocks {
		switch blk.Style {
		case "title":
			b.WriteString(para("Title", segText(blk.Segments), true))
		case "subtitle":
			b.WriteString(para("Subtitle", segText(blk.Segments), false))
		case "heading":
			b.WriteString(para("Heading1", blk.Plain(), true))
		case "right":
			b.WriteString(para("Right", segText(blk.Segments), false))
		case "cols":
			b.WriteString(`<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>`)
			for range blk.Cols {
				b.WriteString(`<w:gridCol w:w="4675"/>`)
			}
			b.WriteString(`</w:tblGrid><w:tr>`)
			for _, c := range blk.Cols {
				b.WriteString(`<w:tc><w:tcPr><w:tcW w:w="2500" w:type="pct"/></w:tcPr>` + para("Cell", segText(c), false) + `</w:tc>`)
			}
			b.WriteString(`</w:tr></w:tbl>`)
		default:
			b.WriteString(para("Body", blk.Plain(), false))
		}
	}
	b.WriteString(`<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`)
	return b.String()
}

func coreXML(title string) string {
	return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>` +
		esc(title) + `</dc:title><dc:creator>договор.ai</dc:creator></cp:coreProperties>`
}

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`

const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`

const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`

const stylesXML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ru-RU"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Body"><w:name w:val="Body"/><w:pPr><w:jc w:val="both"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:jc w:val="center"/><w:spacing w:after="60"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:keepNext/><w:jc w:val="center"/><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Right"><w:name w:val="Right"/><w:pPr><w:jc w:val="right"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Cell"><w:name w:val="Cell"/><w:pPr><w:jc w:val="left"/><w:spacing w:after="0"/></w:pPr><w:rPr><w:sz w:val="22"/></w:rPr></w:style>
</w:styles>`
