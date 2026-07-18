import { describe, expect, it } from 'vitest';
import { extractDocumentsStoragePath } from '../../utils/documents-storage.utils';

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
