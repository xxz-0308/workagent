import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import MessageBubble from '../chat/MessageBubble.svelte';

describe('MessageBubble Component tests', () => {
  it('renders user and assistant messages with markdown', () => {
    const { getByText } = render(MessageBubble, {
      props: {
        role: 'assistant',
        content: 'WorkAgent 分析结果：**连接池泄漏**'
      }
    });

    expect(getByText('WorkAgent 智能助手')).toBeDefined();
    expect(getByText('连接池泄漏')).toBeDefined();
  });
});
