import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { DocumentCard } from '@/components/Document/DocumentCard';

const mockDoc = {
  id: '1',
  filename: '年假制度.md',
  title: '年假制度',
  category: 'annual_leave',
  categoryName: '年假',
  updatedAt: '2026-01-15T00:00:00.000Z',
};

describe('DocumentCard', () => {
  it('应显示文档标题和分类', () => {
    render(<DocumentCard document={mockDoc} onClick={vi.fn()} />);
    expect(screen.getByText('年假制度')).toBeInTheDocument();
    expect(screen.getByText('年假')).toBeInTheDocument();
  });

  it('点击应触发 onClick', () => {
    const onClick = vi.fn();
    render(<DocumentCard document={mockDoc} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith('1');
  });

  it('Enter 键应触发 onClick', () => {
    const onClick = vi.fn();
    render(<DocumentCard document={mockDoc} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledWith('1');
  });

  it('应显示更新日期', () => {
    render(<DocumentCard document={mockDoc} onClick={vi.fn()} />);
    expect(screen.getByText('2026-01-15', { exact: false })).toBeInTheDocument();
  });
});
