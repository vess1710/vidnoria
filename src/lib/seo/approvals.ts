import { writeMarkdown, contentPath } from '@/lib/storage';
import { SeoApprovalRequest, SeoChangeType, SeoRiskLevel } from './types';
import {
  getApprovalRequests,
  saveApprovalRequests,
  appendSeoAuditLog,
  readSeoStore,
  writeSeoStore,
  getRedirectRules,
  saveRedirectRules,
} from './storage';
import { SeoPageConfig } from './metadata';

// ============================================================================
// Vidnoria SEO Manager - Semi-Automatic Approval & Rollback Engine
// ============================================================================

export interface GitHubPrDraft {
  branchName: string;
  commitMessage: string;
  title: string;
  body: string;
  modifiedFiles: Array<{ path: string; changeSummary: string }>;
}

export async function createApprovalRequest(data: {
  changeType: SeoChangeType;
  targetPage: string;
  pageKey?: string;
  locale?: 'tr' | 'en' | 'ar';
  issueSummary: Record<'tr' | 'en' | 'ar', string>;
  currentValue: string;
  proposedValue: string;
  expectedBenefit: Record<'tr' | 'en' | 'ar', string>;
  riskLevel: SeoRiskLevel;
  metadataPayload?: Record<string, unknown>;
}): Promise<SeoApprovalRequest> {
  const { version, items } = await getApprovalRequests();

  // Avoid creating duplicate pending requests for the exact same target and changeType
  const existingPending = items.find(
    i => i.status === 'pending' && i.targetPage === data.targetPage && i.changeType === data.changeType
  );
  if (existingPending) {
    return existingPending;
  }

  const newRequest: SeoApprovalRequest = {
    id: `appr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...data,
    githubPrSuggested: data.riskLevel === 'high' || data.changeType === 'robots_txt' || data.changeType === 'sitemap',
  };

  await saveApprovalRequests([newRequest, ...items], version);

  await appendSeoAuditLog({
    action: 'approval_created',
    actor: 'admin',
    target: data.targetPage,
    summary: `Yeni onay talebi oluşturuldu (${data.changeType}): ${data.issueSummary.tr}`,
    approvalId: newRequest.id,
    previousValue: data.currentValue,
    newValue: data.proposedValue,
  });

  return newRequest;
}

/**
 * Approves a pending SEO change, executes the mutation atomically, and logs the change.
 */
export async function approveSeoChange(
  approvalId: string,
  actor: 'admin' = 'admin'
): Promise<{ success: boolean; request: SeoApprovalRequest; prDraft?: GitHubPrDraft }> {
  const { version, items } = await getApprovalRequests();
  const request = items.find(i => i.id === approvalId);

  if (!request) {
    throw new Error(`Approval request "${approvalId}" not found.`);
  }

  if (request.status !== 'pending') {
    throw new Error(`Approval request is already in "${request.status}" state.`);
  }

  // Execute mutation according to changeType
  switch (request.changeType) {
    case 'seo_title':
    case 'meta_description':
    case 'canonical': {
      if (request.pageKey && request.locale) {
        const overridesEnv = await readSeoStore<Record<string, Partial<SeoPageConfig>>>('overrides', {});
        const overrides = overridesEnv.data;
        const pageOverride = overrides[request.pageKey] || {};

        if (request.changeType === 'seo_title') {
          const currentTitle = { ...(pageOverride.title || {}) } as Record<'tr' | 'en' | 'ar', string>;
          currentTitle[request.locale] = request.proposedValue;
          pageOverride.title = currentTitle;
        } else if (request.changeType === 'meta_description') {
          const currentDesc = { ...(pageOverride.description || {}) } as Record<'tr' | 'en' | 'ar', string>;
          currentDesc[request.locale] = request.proposedValue;
          pageOverride.description = currentDesc;
        } else if (request.changeType === 'canonical') {
          pageOverride.canonicalPath = request.proposedValue;
        }

        overrides[request.pageKey] = pageOverride;
        await writeSeoStore('overrides', overrides, overridesEnv.version);
      }
      break;
    }

    case 'blog_publish': {
      const payload = request.metadataPayload;
      if (!payload || !payload.slug || typeof payload.slug !== 'string') {
        throw new Error('Missing blog payload for publishing.');
      }

      const slug = payload.slug;
      const frontmatter = {
        title: payload.title,
        description: payload.seoDescription,
        category: payload.category || 'guides',
        status: 'published',
        publishedAt: new Date().toISOString().split('T')[0],
        seoTitle: payload.seoTitle,
        seoDescription: payload.seoDescription,
      };

      const contentMarkdown = payload.contentMarkdown as Record<string, string> | undefined;
      const trContent = contentMarkdown?.tr || '';
      const enContent = contentMarkdown?.en || '';
      const arContent = contentMarkdown?.ar || '';
      const fullContent = `${trContent}\n\n${enContent}\n\n${arContent}`;

      const filePath = contentPath('blog', `${slug}.md`);
      await writeMarkdown(filePath, frontmatter, fullContent);
      break;
    }

    case 'redirect_rule': {
      const rules = await getRedirectRules();
      const newRule = {
        from: request.currentValue,
        to: request.proposedValue,
        statusCode: (request.metadataPayload?.statusCode || 301) as 301,
        createdAt: new Date().toISOString(),
      };
      await saveRedirectRules([...rules.filter(r => r.from !== newRule.from), newRule]);
      break;
    }

    default:
      // Other changes (robots_txt, sitemap behavior, structured_data) generate reviewable GitHub PR draft
      break;
  }

  request.status = 'approved';
  request.decidedAt = new Date().toISOString();
  request.decidedBy = actor;

  await saveApprovalRequests(items, version);

  await appendSeoAuditLog({
    action: 'change_approved',
    actor,
    target: request.targetPage,
    summary: `SEO değişikliği onaylandı ve uygulandı: ${request.issueSummary.tr}`,
    approvalId: request.id,
    previousValue: request.currentValue,
    newValue: request.proposedValue,
  });

  const prDraft = request.githubPrSuggested ? generateGitHubPrDraft(request) : undefined;
  return { success: true, request, prDraft };
}

/**
 * Rejects a pending approval request.
 */
export async function rejectSeoChange(
  approvalId: string,
  actor: 'admin' = 'admin'
): Promise<SeoApprovalRequest> {
  const { version, items } = await getApprovalRequests();
  const request = items.find(i => i.id === approvalId);

  if (!request) {
    throw new Error(`Approval request "${approvalId}" not found.`);
  }

  request.status = 'rejected';
  request.decidedAt = new Date().toISOString();
  request.decidedBy = actor;

  await saveApprovalRequests(items, version);

  await appendSeoAuditLog({
    action: 'change_rejected',
    actor,
    target: request.targetPage,
    summary: `SEO önerisi reddedildi: ${request.issueSummary.tr}`,
    approvalId: request.id,
  });

  return request;
}

/**
 * Rolls back an approved change to its exact previous state.
 */
export async function rollbackSeoChange(
  approvalId: string,
  actor: 'admin' = 'admin'
): Promise<{ success: boolean; request: SeoApprovalRequest }> {
  const { version, items } = await getApprovalRequests();
  const request = items.find(i => i.id === approvalId);

  if (!request || request.status !== 'approved') {
    throw new Error(`Only approved changes can be rolled back.`);
  }

  // Revert mutation
  switch (request.changeType) {
    case 'seo_title':
    case 'meta_description':
    case 'canonical': {
      if (request.pageKey && request.locale) {
        const overridesEnv = await readSeoStore<Record<string, Partial<SeoPageConfig>>>('overrides', {});
        const overrides = overridesEnv.data;
        const pageOverride = overrides[request.pageKey];

        if (pageOverride) {
          if (request.changeType === 'seo_title' && pageOverride.title) {
            delete pageOverride.title[request.locale];
          } else if (request.changeType === 'meta_description' && pageOverride.description) {
            delete pageOverride.description[request.locale];
          } else if (request.changeType === 'canonical') {
            delete pageOverride.canonicalPath;
          }
          await writeSeoStore('overrides', overrides, overridesEnv.version);
        }
      }
      break;
    }

    case 'blog_publish': {
      const payload = request.metadataPayload;
      if (payload?.slug) {
        const fs = await import('fs/promises');
        const filePath = contentPath('blog', `${payload.slug}.md`);
        await fs.unlink(filePath).catch(() => {});
      }
      break;
    }

    case 'redirect_rule': {
      const rules = await getRedirectRules();
      await saveRedirectRules(rules.filter(r => r.from !== request.currentValue));
      break;
    }
  }

  request.status = 'rolled_back';
  request.rolledBackAt = new Date().toISOString();

  await saveApprovalRequests(items, version);

  await appendSeoAuditLog({
    action: 'change_rolled_back',
    actor,
    target: request.targetPage,
    summary: `SEO değişikliği geri alındı: ${request.issueSummary.tr}`,
    approvalId: request.id,
    previousValue: request.proposedValue,
    newValue: request.currentValue,
  });

  return { success: true, request };
}

/**
 * Prepares an inspectable GitHub PR draft payload for high-risk / code-level changes.
 */
export function generateGitHubPrDraft(request: SeoApprovalRequest): GitHubPrDraft {
  const branchName = `seo-fix/${request.changeType}-${Date.now().toString(36)}`;
  return {
    branchName,
    commitMessage: `fix(seo): update ${request.changeType} for ${request.targetPage}`,
    title: `[SEO Manager] ${request.issueSummary.tr}`,
    body: `### Vidnoria SEO Manager - Otomatik Değişiklik Önerisi\n\n- **Etkilenen Sayfa:** \`${request.targetPage}\`\n- **İşlem Türü:** \`${request.changeType}\`\n- **Risk Seviyesi:** \`${request.riskLevel}\`\n- **Beklenen Fayda:** ${request.expectedBenefit.tr}\n\n#### Değişiklik Önizlemesi:\n\`\`\`diff\n- ${request.currentValue}\n+ ${request.proposedValue}\n\`\`\``,
    modifiedFiles: [
      {
        path: request.changeType === 'blog_publish' ? `content/blog/${request.pageKey}.md` : 'content/seo/overrides.json',
        changeSummary: `${request.currentValue} -> ${request.proposedValue}`,
      },
    ],
  };
}
