const ts = require('typescript');
const path = require('path');
const fs = require('fs');
const Module = require('module');

// Register TypeScript loader
require.extensions['.ts'] = function (module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: 'react-jsx',
    },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};

// Register @/ alias
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    request = path.join(__dirname, '..', 'src', request.slice(2));
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

async function main() {
  const { getApprovalRequests } = require('../src/lib/seo/storage');
  const { approveSeoChange } = require('../src/lib/seo/approvals');
  const { runTechnicalSeoAudit } = require('../src/lib/seo/auditor');
  const { readMarkdown, writeMarkdown, contentPath } = require('../src/lib/storage');

  console.log('>>> Vidnoria SEO Manager: Onay Bekleyen İşlemler İnceleniyor...');

  const { items } = await getApprovalRequests();
  const pendingItems = items.filter((x) => x.status === 'pending');

  console.log(`Bulunan onay bekleyen işlem sayısı: ${pendingItems.length}`);

  let approvedCount = 0;

  for (const item of pendingItems) {
    try {
      console.log(`[ONAYLANIYOR] ${item.id} - ${item.changeType} - ${item.targetPage}`);
      const res = await approveSeoChange(item.id, 'admin');

      // If content_update, ensure internal link is embedded into blog markdown
      if (item.changeType === 'content_update' && item.targetPage && item.proposedValue) {
        const slugMatch = item.targetPage.match(/\/blog\/([^/?#]+)/);
        if (slugMatch) {
          const slug = slugMatch[1];
          const filePath = contentPath('blog', `${slug}.md`);
          const existing = await readMarkdown(filePath);
          if (existing) {
            const loc = item.locale || 'tr';
            const marker = `<!-- content:${loc} -->`;
            let content = existing.content;
            if (!content.includes(item.proposedValue)) {
              const label =
                loc === 'tr'
                  ? 'İlgili Araç'
                  : loc === 'ar'
                  ? 'أداة التحميل ذات الصلة'
                  : 'Related Tool';
              const insertText = `\n\n> 💡 **${label}:** ${item.proposedValue}\n`;

              if (content.includes(marker)) {
                const markerIdx = content.indexOf(marker);
                const nextLineIdx = content.indexOf('\n', markerIdx);
                if (nextLineIdx !== -1) {
                  content = content.slice(0, nextLineIdx) + insertText + content.slice(nextLineIdx);
                } else {
                  content = content + insertText;
                }
              } else {
                content += insertText;
              }
              await writeMarkdown(filePath, existing.frontmatter, content);
              console.log(`  ✓ İç bağlantı başarıyla eklendi: ${slug}.md (${loc})`);
            }
          }
        }
      }

      approvedCount++;
    } catch (err) {
      console.error(`  ✗ ${item.id} onaylanırken hata oluştu:`, err.message);
    }
  }

  console.log(`\nBaşarıyla onaylanan ve uygulanan işlem sayısı: ${approvedCount}/${pendingItems.length}`);

  // Refresh technical SEO audit with the approved changes
  console.log('\n>>> Teknik SEO Denetimi Yeniden Çalıştırılıyor...');
  const freshReport = await runTechnicalSeoAudit({ includePageSpeed: false });

  console.log(`=================================================`);
  console.log(`GÜNCEL SEO SAĞLIK SKORU: %${freshReport.healthScore}/100`);
  console.log(`Kalan Kritik Hatalar: ${freshReport.counts.critical}`);
  console.log(`Kalan Uyarılar: ${freshReport.counts.warning}`);
  console.log(`Kalan Öneriler: ${freshReport.counts.suggestion}`);
  console.log(`Başarılı Kontroller: ${freshReport.counts.passed}`);
  console.log(`Toplam Taranan Sayfa: ${freshReport.totalPagesChecked}`);
  console.log(`=================================================`);
}

main().catch((err) => {
  console.error('Hata:', err);
  process.exit(1);
});
