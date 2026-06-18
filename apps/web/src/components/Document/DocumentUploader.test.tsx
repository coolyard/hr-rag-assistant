import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { DocumentUploader } from '@/components/Document/DocumentUploader';

describe('DocumentUploader', () => {
  it('应显示上传按钮', () => {
    render(<DocumentUploader onSuccess={vi.fn()} />);
    expect(screen.getByText(/上传文档/)).toBeInTheDocument();
  });

  it('上传按钮应有 button 角色', () => {
    render(<DocumentUploader onSuccess={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
