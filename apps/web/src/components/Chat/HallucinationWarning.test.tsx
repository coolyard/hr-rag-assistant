import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { HallucinationWarning } from '@/components/Chat/HallucinationWarning';

describe('HallucinationWarning', () => {
  it('应显示警告信息', () => {
    render(<HallucinationWarning />);
    expect(screen.getByText(/未在文档中验证/)).toBeInTheDocument();
  });
});
