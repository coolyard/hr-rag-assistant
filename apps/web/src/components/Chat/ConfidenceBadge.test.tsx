import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { ConfidenceBadge } from '@/components/Chat/ConfidenceBadge';

describe('ConfidenceBadge', () => {
  it('high 应显示高置信度', () => {
    render(<ConfidenceBadge level="high" />);
    expect(screen.getByText(/高/)).toBeInTheDocument();
  });

  it('medium 应显示中置信度', () => {
    render(<ConfidenceBadge level="medium" />);
    expect(screen.getByText(/中/)).toBeInTheDocument();
  });

  it('low 应显示低置信度', () => {
    render(<ConfidenceBadge level="low" />);
    expect(screen.getByText(/低/)).toBeInTheDocument();
  });

  it('无 level 时应返回 null', () => {
    const { container } = render(<ConfidenceBadge />);
    expect(container.innerHTML).toBe('');
  });
});
