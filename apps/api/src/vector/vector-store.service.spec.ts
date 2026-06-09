import { VectorStoreService } from '@/vector/vector-store.service';

describe('VectorStoreService', () => {
  let service: VectorStoreService;

  beforeEach(() => {
    service = new VectorStoreService();
  });

  afterEach(() => {
    service.clear();
  });

  function createMockMeta(id: string, content: string) {
    return {
      chunkId: id,
      documentName: 'test.md',
      documentTitle: '测试文档',
      category: 'test',
      categoryName: '测试',
      heading: '## 标题',
      content,
      charCount: content.length,
    };
  }

  describe('cosineSimilarity (via search)', () => {
    it('相同向量应返回 1', () => {
      const vec = new Array<number>(768).fill(0.1);
      service.add('test-1', vec, createMockMeta('test-1', '内容1'));
      const results = service.search(vec, 1);
      expect(results[0].similarity).toBeCloseTo(1, 5);
    });

    it('应返回 topK 个结果', () => {
      for (let i = 0; i < 5; i++) {
        service.add(
          `item-${String(i)}`,
          new Array<number>(768).fill(i === 0 ? 0.9 : 0.1),
          createMockMeta(`item-${String(i)}`, `内容${String(i)}`),
        );
      }
      const query = new Array<number>(768).fill(0.9);
      const results = service.search(query, 3);
      expect(results).toHaveLength(3);
    });

    it('应返回按相似度降序排列的结果', () => {
      service.add('close', new Array<number>(768).fill(0.8), createMockMeta('close', '相近内容'));
      service.add('far', new Array<number>(768).fill(-0.8), createMockMeta('far', '远离内容'));
      const query = new Array<number>(768).fill(0.9);
      const results = service.search(query, 2);
      expect(results[0].chunkId).toBe('close');
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
    });

    it('当向量空间为空时应返回空数组', () => {
      const query = new Array<number>(768).fill(0.1);
      const results = service.search(query, 3);
      expect(results).toEqual([]);
    });
  });

  describe('add', () => {
    it('维度不匹配时应抛出 Error', () => {
      expect(() => {
        service.add('bad', [0.1, 0.2, 0.3], createMockMeta('bad', ''));
      }).toThrow('Dimension mismatch');
    });

    it('包含 NaN 时应抛出 Error', () => {
      const vec = new Array<number>(768).fill(NaN);
      expect(() => {
        service.add('nan', vec, createMockMeta('nan', ''));
      }).toThrow('invalid values');
    });
  });

  describe('count / clear / getAll', () => {
    it('count 应返回正确数量', () => {
      service.add('a', new Array<number>(768).fill(0.1), createMockMeta('a', ''));
      service.add('b', new Array<number>(768).fill(0.2), createMockMeta('b', ''));
      expect(service.count()).toBe(2);
    });

    it('clear 应清空所有数据', () => {
      service.add('a', new Array<number>(768).fill(0.1), createMockMeta('a', ''));
      service.clear();
      expect(service.count()).toBe(0);
    });

    it('getAll 应返回所有结果', () => {
      service.add('a', new Array<number>(768).fill(0.1), createMockMeta('a', ''));
      service.add('b', new Array<number>(768).fill(0.2), createMockMeta('b', ''));
      expect(service.getAll()).toHaveLength(2);
    });
  });
});
