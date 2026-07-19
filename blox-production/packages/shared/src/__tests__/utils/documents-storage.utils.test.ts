import { describe, expect, it, vi } from 'vitest';
import {
  extractDocumentsStoragePath,
  resolveDocumentsSignedUrl,
} from '../../utils/documents-storage.utils';

describe('extractDocumentsStoragePath', () => {
  it('returns relative path as-is', () => {
    expect(
      extractDocumentsStoragePath('application-documents/application-1/file.pdf')
    ).toBe('application-documents/application-1/file.pdf');
  });

  it('strips bucket prefix', () => {
    expect(
      extractDocumentsStoragePath(
        'documents/application-documents/application-1/file.pdf'
      )
    ).toBe('application-documents/application-1/file.pdf');
  });

  it('extracts from public URL', () => {
    expect(
      extractDocumentsStoragePath(
        'https://xxx.supabase.co/storage/v1/object/public/documents/application-documents/application-1/file.pdf'
      )
    ).toBe('application-documents/application-1/file.pdf');
  });

  it('strips query from signed URL', () => {
    expect(
      extractDocumentsStoragePath(
        'https://xxx.supabase.co/storage/v1/object/sign/documents/signed-contracts/application-1/c.pdf?token=abc'
      )
    ).toBe('signed-contracts/application-1/c.pdf');
  });
});

describe('resolveDocumentsSignedUrl', () => {
  it('does not fall back to private public URLs when signing fails', async () => {
    const publicUrl =
      'https://xxx.supabase.co/storage/v1/object/public/documents/application-documents/a/file.pdf';
    const supabase = {
      storage: {
        from: () => ({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'denied' },
          }),
        }),
      },
    };

    const url = await resolveDocumentsSignedUrl(supabase, {
      path: 'application-documents/a/file.pdf',
      url: publicUrl,
    });
    expect(url).toBeNull();
  });
});
