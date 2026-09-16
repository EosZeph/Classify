(function attachArchiveDownload(global) {
  "use strict";

  let crcTable = null;

  function getCrcTable() {
    if (crcTable) {
      return crcTable;
    }

    crcTable = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value =
          value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      crcTable[index] = value >>> 0;
    }
    return crcTable;
  }

  function calculateCrc32(bytes) {
    const table = getCrcTable();
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function concatenate(parts) {
    const totalLength = parts.reduce(
      (total, part) => total + part.length,
      0
    );
    const output = new Uint8Array(totalLength);
    let offset = 0;
    parts.forEach((part) => {
      output.set(part, offset);
      offset += part.length;
    });
    return output;
  }

  function createZip(files) {
    const encoder = new TextEncoder();
    const now = new Date();
    const dosTime =
      (now.getHours() << 11) |
      (now.getMinutes() << 5) |
      Math.floor(now.getSeconds() / 2);
    const dosDate =
      ((now.getFullYear() - 1980) << 9) |
      ((now.getMonth() + 1) << 5) |
      now.getDate();
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    files.forEach((file) => {
      const nameBytes = encoder.encode(file.name);
      const dataBytes =
        typeof file.content === "string"
          ? encoder.encode(file.content)
          : file.content;
      const checksum = calculateCrc32(dataBytes);

      const localHeader = new Uint8Array(30 + nameBytes.length);
      const localView = new DataView(localHeader.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0x0800, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, dosTime, true);
      localView.setUint16(12, dosDate, true);
      localView.setUint32(14, checksum, true);
      localView.setUint32(18, dataBytes.length, true);
      localView.setUint32(22, dataBytes.length, true);
      localView.setUint16(26, nameBytes.length, true);
      localView.setUint16(28, 0, true);
      localHeader.set(nameBytes, 30);

      localParts.push(localHeader, dataBytes);

      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const centralView = new DataView(centralHeader.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0x0800, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, dosTime, true);
      centralView.setUint16(14, dosDate, true);
      centralView.setUint32(16, checksum, true);
      centralView.setUint32(20, dataBytes.length, true);
      centralView.setUint32(24, dataBytes.length, true);
      centralView.setUint16(28, nameBytes.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, offset, true);
      centralHeader.set(nameBytes, 46);
      centralParts.push(centralHeader);

      offset += localHeader.length + dataBytes.length;
    });

    const centralDirectory = concatenate(centralParts);
    const endRecord = new Uint8Array(22);
    const endView = new DataView(endRecord.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralDirectory.length, true);
    endView.setUint32(16, offset, true);
    endView.setUint16(20, 0, true);

    return concatenate([...localParts, centralDirectory, endRecord]);
  }

  function escapeXml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  }

  function createParagraph(category, text) {
    const safeCategory = escapeXml(category);
    const safeText = escapeXml(text);
    return `
      <w:p>
        <w:pPr><w:spacing w:after="80"/></w:pPr>
        <w:r>
          <w:rPr><w:b/><w:color w:val="2156D8"/></w:rPr>
          <w:t xml:space="preserve">${safeCategory}：</w:t>
        </w:r>
        <w:r>
          <w:rPr><w:color w:val="172033"/></w:rPr>
          <w:t xml:space="preserve">${safeText}</w:t>
        </w:r>
      </w:p>
    `;
  }

  function createDocxBlob(title, rows) {
    const titleXml = escapeXml(title || "归类采集");
    const paragraphs = rows
      .map((row) => createParagraph(row.category, row.text))
      .join("");
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:pPr><w:spacing w:after="180"/></w:pPr>
            <w:r>
              <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
              <w:t>${titleXml}</w:t>
            </w:r>
          </w:p>
          ${paragraphs}
          <w:sectPr>
            <w:pgSz w:w="11906" w:h="16838"/>
            <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
          </w:sectPr>
        </w:body>
      </w:document>`;

    const files = [
      {
        name: "[Content_Types].xml",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
          <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
            <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
            <Default Extension="xml" ContentType="application/xml"/>
            <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
          </Types>`
      },
      {
        name: "_rels/.rels",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
          <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
            <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
          </Relationships>`
      },
      {
        name: "word/document.xml",
        content: documentXml
      }
    ];

    return new Blob([createZip(files)], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
  }

  function createDocxLinesBlob(title, lines) {
    const titleXml = escapeXml(title || "归类采集");
    const paragraphs = lines
      .map(
        (line) => `
          <w:p>
            <w:pPr><w:spacing w:after="80"/></w:pPr>
            <w:r>
              <w:t xml:space="preserve">${escapeXml(line)}</w:t>
            </w:r>
          </w:p>
        `
      )
      .join("");
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:pPr><w:spacing w:after="180"/></w:pPr>
            <w:r>
              <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
              <w:t>${titleXml}</w:t>
            </w:r>
          </w:p>
          ${paragraphs}
          <w:sectPr>
            <w:pgSz w:w="11906" w:h="16838"/>
            <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
          </w:sectPr>
        </w:body>
      </w:document>`;

    const zip = createZip([
      {
        name: "[Content_Types].xml",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
          <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
            <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
            <Default Extension="xml" ContentType="application/xml"/>
            <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
          </Types>`
      },
      {
        name: "_rels/.rels",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
          <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
            <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
          </Relationships>`
      },
      {
        name: "word/document.xml",
        content: documentXml
      }
    ]);
    return new Blob([zip], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
  }

  function columnName(index) {
    let value = index + 1;
    let name = "";
    while (value > 0) {
      const remainder = (value - 1) % 26;
      name = String.fromCharCode(65 + remainder) + name;
      value = Math.floor((value - 1) / 26);
    }
    return name;
  }

  function createXlsxBlob(title, rows, merges = []) {
    const sheetRows = rows
      .map((row, rowIndex) => {
        const cells = row
          .map((value, columnIndex) => {
            const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
            const style = rowIndex === 0 ? ' s="1"' : "";
            return `<c r="${reference}" t="inlineStr"${style}><is><t xml:space="preserve">${escapeXml(
              value ?? ""
            )}</t></is></c>`;
          })
          .join("");
        return `<row r="${rowIndex + 1}">${cells}</row>`;
      })
      .join("");

    const columns = Array.from(
      { length: Math.max(1, ...rows.map((row) => row.length)) },
      (_, index) => `<col min="${index + 1}" max="${index + 1}" width="${
        index === 0 ? 18 : 24
      }" customWidth="1"/>`
    ).join("");
    const mergeXml = merges.length
      ? `<mergeCells count="${merges.length}">${merges
          .map((reference) => `<mergeCell ref="${escapeXml(reference)}"/>`)
          .join("")}</mergeCells>`
      : "";
    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <cols>${columns}</cols>
        <sheetData>${sheetRows}</sheetData>
        ${mergeXml}
      </worksheet>`;
    const sheetName = escapeXml(
      (title || "表格")
        .replace(/[\\/?*[\]:]/g, "_")
        .slice(0, 31)
    );
    const files = [
      {
        name: "[Content_Types].xml",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
          <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
            <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
            <Default Extension="xml" ContentType="application/xml"/>
            <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
            <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
            <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
          </Types>`
      },
      {
        name: "_rels/.rels",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
          <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
            <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
          </Relationships>`
      },
      {
        name: "xl/workbook.xml",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
          <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
            <sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets>
          </workbook>`
      },
      {
        name: "xl/_rels/workbook.xml.rels",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
          <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
            <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
            <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
          </Relationships>`
      },
      {
        name: "xl/styles.xml",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
          <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
            <fonts count="2">
              <font><sz val="11"/><name val="Calibri"/></font>
              <font><b/><sz val="11"/><name val="Calibri"/></font>
            </fonts>
            <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
            <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
            <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
            <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1"/></cellXfs>
          </styleSheet>`
      },
      {
        name: "xl/worksheets/sheet1.xml",
        content: sheetXml
      }
    ];
    return new Blob([createZip(files)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
  }

  function createDocxStyledBlob(title, paragraphDefinitions) {
    const titleXml = escapeXml(title || "归类采集");
    const paragraphs = paragraphDefinitions
      .map((paragraph) => {
        if (paragraph.plain !== undefined) {
          return `
            <w:p>
              <w:pPr><w:spacing w:after="80"/></w:pPr>
              <w:r><w:t xml:space="preserve">${escapeXml(
                paragraph.plain
              )}</w:t></w:r>
            </w:p>
          `;
        }

        const runs = paragraph.segments
          .map((segment, index) => {
            const separator =
              index < paragraph.segments.length - 1 ? "，" : paragraph.ending || "";
            return `
              <w:r>
                <w:rPr><w:b/><w:color w:val="2156D8"/></w:rPr>
                <w:t xml:space="preserve">${escapeXml(
                  `${segment.label}：`
                )}</w:t>
              </w:r>
              <w:r>
                <w:rPr><w:color w:val="172033"/></w:rPr>
                <w:t xml:space="preserve">${escapeXml(segment.text)}</w:t>
              </w:r>
              <w:r>
                <w:rPr><w:color w:val="172033"/></w:rPr>
                <w:t xml:space="preserve">${escapeXml(separator)}</w:t>
              </w:r>
            `;
          })
          .join("");
        return `
          <w:p>
            <w:pPr><w:spacing w:after="80"/></w:pPr>
            ${runs}
          </w:p>
        `;
      })
      .join("");
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p>
            <w:pPr><w:spacing w:after="180"/></w:pPr>
            <w:r>
              <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
              <w:t>${titleXml}</w:t>
            </w:r>
          </w:p>
          ${paragraphs}
          <w:sectPr>
            <w:pgSz w:w="11906" w:h="16838"/>
            <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
          </w:sectPr>
        </w:body>
      </w:document>`;
    const zip = createZip([
      {
        name: "[Content_Types].xml",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
          <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
            <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
            <Default Extension="xml" ContentType="application/xml"/>
            <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
          </Types>`
      },
      {
        name: "_rels/.rels",
        content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
          <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
            <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
          </Relationships>`
      },
      {
        name: "word/document.xml",
        content: documentXml
      }
    ]);
    return new Blob([zip], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
  }

  function sanitizeFilename(value) {
    return (
      String(value || "")
        .replace(/[\\/:*?"<>|]/g, "_")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60) || "采集项目"
    );
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.documentElement.append(anchor);
    anchor.click();
    anchor.remove();
    global.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  global.ArchiveDownload = {
    createDocxBlob,
    createDocxLinesBlob,
    createDocxStyledBlob,
    createXlsxBlob,
    createZip,
    sanitizeFilename,
    triggerDownload
  };
})(globalThis);
