import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import StatsCard from '../dashboard/StatsCard.svelte';

describe('StatsCard Component tests', () => {
  it('renders title and metric value correctly', () => {
    const { getByText } = render(StatsCard, {
      props: {
        title: '已知结构化问题总数',
        value: 42,
        subtitle: '收录的问题数'
      }
    });

    expect(getByText('已知结构化问题总数')).toBeDefined();
    expect(getByText('42')).toBeDefined();
    expect(getByText('收录的问题数')).toBeDefined();
  });
});
