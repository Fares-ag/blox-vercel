/**
 * Convert Markdown Documentation to Word Format
 * This script converts BLOX_SECURITY_PERFORMANCE_DOCUMENTATION.md to Word format
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the markdown file
const markdownPath = path.join(__dirname, 'BLOX_SECURITY_PERFORMANCE_DOCUMENTATION.md');
const markdownContent = fs.readFileSync(markdownPath, 'utf-8');

// Convert markdown to HTML (Word can open HTML and convert to DOCX)
function markdownToHTML(markdown) {
  let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Blox Platform: Security & Performance Documentation</title>
    <style>
        body {
            font-family: 'Calibri', 'Arial', sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            color: #333;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-top: 30px;
            page-break-after: avoid;
        }
        h2 {
            color: #34495e;
            border-bottom: 2px solid #95a5a6;
            padding-bottom: 8px;
            margin-top: 25px;
            page-break-after: avoid;
        }
        h3 {
            color: #555;
            margin-top: 20px;
            page-break-after: avoid;
        }
        h4 {
            color: #666;
            margin-top: 15px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            page-break-inside: avoid;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #3498db;
            color: white;
            font-weight: bold;
        }
        tr:nth-child(even) {
            background-color: #f2f2f2;
        }
        code {
            background-color: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        pre {
            background-color: #f4f4f4;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            page-break-inside: avoid;
        }
        ul, ol {
            margin: 10px 0;
            padding-left: 30px;
        }
        li {
            margin: 5px 0;
        }
        .highlight {
            background-color: #fff3cd;
            padding: 2px 4px;
        }
        .status-complete {
            color: #27ae60;
            font-weight: bold;
        }
        .executive-summary {
            background-color: #e8f4f8;
            padding: 20px;
            border-left: 4px solid #3498db;
            margin: 20px 0;
        }
        .metric-box {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
        }
        p {
            margin: 10px 0;
        }
        hr {
            border: none;
            border-top: 2px solid #ddd;
            margin: 30px 0;
        }
    </style>
</head>
<body>
`;

  // Convert markdown to HTML
  let lines = markdown.split('\n');
  let inCodeBlock = false;
  let inList = false;
  let listType = 'ul';
  let inTable = false;
  let tableHeader = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmed = line.trim();
    let nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';

    // Code blocks
    if (trimmed.startsWith('```')) {
      if (inList) {
        html += `</${listType}>\n`;
        inList = false;
      }
      if (inTable) {
        html += '</table>\n';
        inTable = false;
      }
      inCodeBlock = !inCodeBlock;
      if (inCodeBlock) {
        html += '<pre><code>';
      } else {
        html += '</code></pre>\n';
      }
      continue;
    }

    if (inCodeBlock) {
      html += line.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '\n';
      continue;
    }

    // Headers
    if (trimmed.startsWith('# ')) {
      if (inList) { html += `</${listType}>\n`; inList = false; }
      if (inTable) { html += '</table>\n'; inTable = false; }
      html += `<h1>${escapeHtml(trimmed.substring(2))}</h1>\n`;
    } else if (trimmed.startsWith('## ')) {
      if (inList) { html += `</${listType}>\n`; inList = false; }
      if (inTable) { html += '</table>\n'; inTable = false; }
      html += `<h2>${escapeHtml(trimmed.substring(3))}</h2>\n`;
    } else if (trimmed.startsWith('### ')) {
      if (inList) { html += `</${listType}>\n`; inList = false; }
      if (inTable) { html += '</table>\n'; inTable = false; }
      html += `<h3>${escapeHtml(trimmed.substring(4))}</h3>\n`;
    } else if (trimmed.startsWith('#### ')) {
      if (inList) { html += `</${listType}>\n`; inList = false; }
      if (inTable) { html += '</table>\n'; inTable = false; }
      html += `<h4>${escapeHtml(trimmed.substring(5))}</h4>\n`;
    }
    // Horizontal rules
    else if (trimmed === '---' || trimmed.match(/^-{3,}$/)) {
      if (inList) { html += `</${listType}>\n`; inList = false; }
      if (inTable) { html += '</table>\n'; inTable = false; }
      html += '<hr>\n';
    }
    // Tables
    else if (trimmed.includes('|')) {
      if (inList) {
        html += `</${listType}>\n`;
        inList = false;
      }
      
      // Check if this is a table separator row
      if (trimmed.match(/^\|[\s\-\|:]+\|$/)) {
        tableHeader = true;
        continue;
      }
      
      // Parse table row
      if (!inTable) {
        html += '<table>\n';
        inTable = true;
      }
      
      let cells = trimmed.split('|').map(c => c.trim()).filter(c => c);
      html += '<tr>';
      
      for (let cell of cells) {
        let cellContent = processInlineMarkdown(cell);
        if (tableHeader) {
          html += `<th>${cellContent}</th>`;
        } else {
          html += `<td>${cellContent}</td>`;
        }
      }
      
      html += '</tr>\n';
      tableHeader = false;
      
      // Close table if next line doesn't have a pipe
      if (nextLine && !nextLine.includes('|') && !nextLine.match(/^\|[\s\-\|:]+\|$/)) {
        html += '</table>\n';
        inTable = false;
      }
    }
    // Lists
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (inTable) {
        html += '</table>\n';
        inTable = false;
      }
      if (!inList || listType !== 'ul') {
        if (inList) html += `</${listType}>\n`;
        html += '<ul>\n';
        inList = true;
        listType = 'ul';
      }
      let content = trimmed.substring(2);
      html += `<li>${processInlineMarkdown(content)}</li>\n`;
    } else if (/^\d+\.\s/.test(trimmed)) {
      if (inTable) {
        html += '</table>\n';
        inTable = false;
      }
      if (!inList || listType !== 'ol') {
        if (inList) html += `</${listType}>\n`;
        html += '<ol>\n';
        inList = true;
        listType = 'ol';
      }
      let content = trimmed.replace(/^\d+\.\s/, '');
      html += `<li>${processInlineMarkdown(content)}</li>\n`;
    } else {
      if (inList) {
        html += `</${listType}>\n`;
        inList = false;
      }
      if (inTable && trimmed) {
        html += '</table>\n';
        inTable = false;
      }
      
      if (trimmed) {
        html += `<p>${processInlineMarkdown(trimmed)}</p>\n`;
      } else {
        html += '<br>\n';
      }
    }
  }

  if (inList) {
    html += `</${listType}>\n`;
  }
  if (inTable) {
    html += '</table>\n';
  }

  html += `
</body>
</html>`;

  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function processInlineMarkdown(text) {
  // Escape HTML first
  text = escapeHtml(text);
  
  // Bold
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Code (inline)
  text = text.replace(/`(.*?)`/g, '<code>$1</code>');
  // Checkboxes
  text = text.replace(/\[x\]/gi, '<span class="status-complete">✓</span>');
  text = text.replace(/\[ \]/g, '<span>☐</span>');
  // Links (basic)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  return text;
}

// Generate HTML
const htmlContent = markdownToHTML(markdownContent);

// Save HTML file (Word can open this directly)
const htmlPath = path.join(__dirname, 'BLOX_SECURITY_PERFORMANCE_DOCUMENTATION.html');
fs.writeFileSync(htmlPath, htmlContent, 'utf-8');

console.log('✅ HTML file created: BLOX_SECURITY_PERFORMANCE_DOCUMENTATION.html');
console.log('\n📝 To convert to Word format:');
console.log('   1. Open BLOX_SECURITY_PERFORMANCE_DOCUMENTATION.html in Microsoft Word');
console.log('   2. Word will automatically convert it to .docx format');
console.log('   3. Save As -> Word Document (.docx)');
console.log('\nAlternatively, you can:');
console.log('   - Open the HTML file in a browser');
console.log('   - Print to PDF');
console.log('   - Or use an online converter (HTML to DOCX)');

