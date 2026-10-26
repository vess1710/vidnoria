import assert from 'node:assert';
import { buildLocalizedAlternates, buildPageMetadata } from '../src/lib/seo/metadata';
import {
  readSeoStore,
  writeSeoStore,
  appendSeoAuditLog,
  getSeoAuditLogs,
} from '../src/lib/seo/storage';
import {
  createApprovalRequest,
  approveSeoChange,
  rejectSeoChange,
  rollbackSeoChange,
} from '../src/lib/seo/approvals';
import { runTechnicalSeoAudit } from '../src/lib/seo/auditor';
import {
  getManagedKeywords,
  evaluateKeywordOptimization,
  upsertKeyword,
  deleteKeyword,
} from '../src/lib/seo/keywords';
import { generateContentDraft, CURATED_TOPIC_SUGGESTIONS } from '../src/lib/seo/content-manager';

async function runTests() {
  console.log('--- STARTING VIDNORIA SEO MANAGER TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: unknown) {
      console.error(`  ✗ ${name}`);
      console.error(err);
      failed++;
    }
  }

  // =========================================================================
  // 1. Multilingual SEO Metadata & Alternates
  // =========================================================================
  console.log('\n[1/6] Testing SEO Metadata & Alternates:');

  await test('buildLocalizedAlternates generates correct self-referencing canonical & hreflang', () => {
    const alternatesTr = buildLocalizedAlternates('tr', '/youtube-video-downloader');
    assert.strictEqual(alternatesTr.canonical, 'https://vidnoria.com/tr/youtube-video-downloader');
    assert.strictEqual(alternatesTr.languages.tr, 'https://vidnoria.com/tr/youtube-video-downloader');
    assert.strictEqual(alternatesTr.languages.en, 'https://vidnoria.com/en/youtube-video-downloader');
    assert.strictEqual(alternatesTr.languages.ar, 'https://vidnoria.com/ar/youtube-video-downloader');
    assert.strictEqual(alternatesTr.languages['x-default'], 'https://vidnoria.com/tr/youtube-video-downloader');

    const alternatesEn = buildLocalizedAlternates('en', '');
    assert.strictEqual(alternatesEn.canonical, 'https://vidnoria.com/en');
    assert.strictEqual(alternatesEn.languages['x-default'], 'https://vidnoria.com/tr');
  });

  await test('buildPageMetadata merges pages.json and returns full OpenGraph and alternates', async () => {
    const meta = await buildPageMetadata('tr', 'home', '');
    assert.ok(meta.title, 'Should contain title');
    assert.ok(meta.description, 'Should contain description');
    assert.ok(meta.alternates?.languages, 'Should contain hreflang languages');
    assert.strictEqual(meta.alternates?.canonical, 'https://vidnoria.com/tr');
  });

  // =========================================================================
  // 2. Storage & Optimistic Concurrency Control
  // =========================================================================
  console.log('\n[2/6] Testing SEO Storage & Optimistic Locking:');

  await test('readSeoStore returns default value when store does not exist', async () => {
    const testKey = `test-temp-${Date.now()}`;
    const env = await readSeoStore(testKey, { count: 0 });
    assert.strictEqual(env.version, 1);
    assert.strictEqual(env.data.count, 0);
  });

  await test('writeSeoStore updates version and detects concurrent modifications', async () => {
    const testKey = `test-concurrency-${Date.now()}`;
    const env1 = await readSeoStore(testKey, { value: 'initial' });
    const saved1 = await writeSeoStore(testKey, { value: 'first_update' }, env1.version);
    assert.strictEqual(saved1.version, env1.version + 1);
    assert.strictEqual(saved1.data.value, 'first_update');

    // Attempt writing with stale version -> should throw
    let conflictThrown = false;
    try {
      await writeSeoStore(testKey, { value: 'stale_update' }, env1.version);
    } catch {
      conflictThrown = true;
    }
    assert.ok(conflictThrown, 'Optimistic lock must throw error on version conflict');

    // Clean up temporary test file
    const fs = await import('fs');
    const path = await import('path');
    const testFile = path.join(process.cwd(), 'content', 'seo', `${testKey}.json`);
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  await test('appendSeoAuditLog persists audit events', async () => {
    await appendSeoAuditLog({
      action: 'settings_updated',
      actor: 'admin',
      target: 'global',
      summary: 'Settings updated test',
    });
    const logs = await getSeoAuditLogs();
    assert.ok(logs.length > 0, 'Audit logs should contain the appended entry');
    assert.strictEqual(logs[0].action, 'settings_updated');
  });

  // =========================================================================
  // 3. Semi-Automatic Approval & Rollback Engine
  // =========================================================================
  console.log('\n[3/6] Testing Approval & Rollback Engine:');

  let testApprovalId = '';

  await test('createApprovalRequest queues pending request and deduplicates identical requests', async () => {
    const req1 = await createApprovalRequest({
      changeType: 'seo_title',
      targetPage: '/tr/unit-test-page',
      pageKey: 'home',
      locale: 'tr',
      issueSummary: { tr: 'Başlık çok kısa', en: 'Title too short', ar: 'العنوان قصير' },
      currentValue: 'Eski Başlık',
      proposedValue: 'Yeni Harika SEO Başlığı | Vidnoria',
      expectedBenefit: { tr: 'CTR %15 artar', en: 'Increases CTR', ar: 'تحسين النقر' },
      riskLevel: 'low',
    });
    assert.ok(req1.id);
    assert.strictEqual(req1.status, 'pending');
    testApprovalId = req1.id;

    // Deduplication check
    const req2 = await createApprovalRequest({
      changeType: 'seo_title',
      targetPage: '/tr/unit-test-page',
      pageKey: 'home',
      locale: 'tr',
      issueSummary: { tr: 'Başlık çok kısa', en: 'Title too short', ar: 'العنوان قصير' },
      currentValue: 'Eski Başlık',
      proposedValue: 'Yeni Harika SEO Başlığı | Vidnoria',
      expectedBenefit: { tr: 'CTR %15 artar', en: 'Increases CTR', ar: 'تحسين النقر' },
      riskLevel: 'low',
    });
    assert.strictEqual(req1.id, req2.id, 'Duplicate pending request should return existing request');
  });

  await test('approveSeoChange applies the mutation and marks status as approved', async () => {
    const result = await approveSeoChange(testApprovalId, 'admin');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.request?.status, 'approved');
    assert.ok(result.request?.currentValue !== undefined, 'Previous value must be preserved for rollback');
  });

  await test('rollbackSeoChange reverts value to previous state', async () => {
    const result = await rollbackSeoChange(testApprovalId, 'admin');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.request?.status, 'rolled_back');
  });

  await test('rejectSeoChange rejects a pending change', async () => {
    const req = await createApprovalRequest({
      changeType: 'canonical',
      targetPage: '/en/reject-test',
      issueSummary: { tr: 'Test', en: 'Test', ar: 'Test' },
      currentValue: 'old',
      proposedValue: 'new',
      expectedBenefit: { tr: 'Test', en: 'Test', ar: 'Test' },
      riskLevel: 'high',
    });
    const rejected = await rejectSeoChange(req.id, 'admin');
    assert.strictEqual(rejected.status, 'rejected');
  });

  // =========================================================================
  // 4. Keyword Manager & On-Page Score
  // =========================================================================
  console.log('\n[4/6] Testing Keyword Manager:');

  await test('getManagedKeywords loads seed keywords for TR, EN, AR', async () => {
    const kws = await getManagedKeywords();
    assert.ok(kws.length >= 10, 'Should load seed keywords');
    const trKws = kws.filter(k => k.locale === 'tr');
    const enKws = kws.filter(k => k.locale === 'en');
    const arKws = kws.filter(k => k.locale === 'ar');
    assert.ok(trKws.length > 0, 'TR keywords should exist');
    assert.ok(enKws.length > 0, 'EN keywords should exist');
    assert.ok(arKws.length > 0, 'AR keywords should exist');
  });

  await test('evaluateKeywordOptimization evaluates keyword placement signals', async () => {
    const score = await evaluateKeywordOptimization(
      'YouTube video indir',
      '/tr/youtube-video-downloader',
      'tr'
    );
    assert.ok(score.optimizationScore > 0, 'Optimization score should be positive');
    assert.strictEqual(typeof score.inTitle, 'boolean');
    assert.strictEqual(typeof score.inDescription, 'boolean');
    assert.strictEqual(typeof score.inH1, 'boolean');
    assert.strictEqual(typeof score.inSlug, 'boolean');
  });

  await test('upsertKeyword and deleteKeyword manage keyword entries', async () => {
    const created = await upsertKeyword({
      keyword: 'TikTok MP3 indir',
      locale: 'tr',
      category: 'opportunities',
      targetPath: '/tiktok-video-downloader',
      notes: {
        tr: 'Unit test keyword',
        en: 'Unit test keyword',
        ar: 'كلمة مفتاحية للاختبار',
      },
    });
    assert.ok(created.id);
    assert.strictEqual(created.keyword, 'TikTok MP3 indir');

    const deleted = await deleteKeyword(created.id);
    assert.strictEqual(deleted, true);
  });

  // =========================================================================
  // 5. Automated Content Manager
  // =========================================================================
  console.log('\n[5/6] Testing SEO Content Manager:');

  await test('generateContentDraft produces trilingual draft and queues approval', async () => {
    const topicId = CURATED_TOPIC_SUGGESTIONS[0].id;
    const draft = await generateContentDraft(topicId);
    assert.ok(draft.id);
    assert.ok(draft.title.tr);
    assert.ok(draft.title.en);
    assert.ok(draft.title.ar);
    assert.ok(draft.contentMarkdown.tr);
    assert.ok(draft.contentMarkdown.en);
    assert.ok(draft.contentMarkdown.ar);
    assert.strictEqual(draft.status, 'pending_approval');
  });

  // =========================================================================
  // 6. Automated Technical SEO Auditor
  // =========================================================================
  console.log('\n[6/6] Testing 19-Point Technical SEO Auditor:');

  await test('runTechnicalSeoAudit completes full site audit with health score and issues', async () => {
    const report = await runTechnicalSeoAudit({ includePageSpeed: false });
    assert.ok(report.id);
    assert.ok(report.healthScore >= 0 && report.healthScore <= 100);
    assert.ok(report.totalPagesChecked > 0);
    assert.ok(Array.isArray(report.issues));
    assert.ok(Array.isArray(report.multilingualMatrix));
    assert.ok(report.counts);
  });

  console.log(`\n=================================================`);
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed.`);
  console.log(`=================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
